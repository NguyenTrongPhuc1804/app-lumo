package expo.modules.screentranslator

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.PixelFormat
import android.graphics.Rect
import android.graphics.RectF
import android.graphics.drawable.GradientDrawable
import android.hardware.display.DisplayManager
import android.hardware.display.VirtualDisplay
import android.media.ImageReader
import android.media.projection.MediaProjection
import android.media.projection.MediaProjectionManager
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.util.DisplayMetrics
import android.util.TypedValue
import android.view.GestureDetector
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.view.WindowManager
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.core.widget.TextViewCompat
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.TextRecognizer
import com.google.mlkit.vision.text.chinese.ChineseTextRecognizerOptions
import com.google.mlkit.vision.text.japanese.JapaneseTextRecognizerOptions
import com.google.mlkit.vision.text.korean.KoreanTextRecognizerOptions
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.Executors
import kotlin.math.abs
import kotlin.math.max
import kotlin.math.min
import org.json.JSONArray
import org.json.JSONObject

// Service chay nen: giu nut noi, chup man hinh, OCR, goi server dich va ve lop phu.
//
// Cach dung nut noi (giong app goc):
//   - Nhan mot lan : mo / dong thanh cong cu
//   - Nhan dup     : dich toan man hinh
//   - Nhan giu     : dich khu vuc (nhac tay ra roi keo de chon vung)
//   - Keo          : di chuyen nut
// Thanh cong cu co 5 nut: dich toan man hinh, dich tu dong, dich khu vuc co dinh, dich khu vuc, tat.
class TranslatorService : Service() {

  companion object {
    @Volatile var isRunning = false
    private const val CHANNEL_ID = "lumo_lens_channel"
    private const val MAX_BLOCKS = 50
    private const val AUTO_INTERVAL_MS = 3000L
  }

  private val handler = Handler(Looper.getMainLooper())
  private val networkExecutor = Executors.newSingleThreadExecutor()

  private lateinit var windowManager: WindowManager
  private lateinit var recognizer: TextRecognizer

  // Cau hinh nhan tu JS
  private var serverUrl = ""
  private var appKey = ""
  private var sourceLang = "en"
  private var targetLang = "vi"
  private var model = ""
  private var accentColor = Color.parseColor("#14B8A6")

  // Phan chup man hinh
  private var projection: MediaProjection? = null
  private var virtualDisplay: VirtualDisplay? = null
  private var imageReader: ImageReader? = null
  private var captureWidth = 0
  private var captureHeight = 0

  // Phan hien thi
  private var widget: LinearLayout? = null // ca nut tron + thanh cong cu
  private var mainButton: TextView? = null
  private var menu: LinearLayout? = null
  private lateinit var widgetParams: WindowManager.LayoutParams
  private var overlay: FrameLayout? = null
  private var selectionView: SelectionView? = null

  // Trang thai lam viec
  private var isBusy = false
  private var autoMode = false
  private var lastAutoKey = "" // noi dung lan dich tu dong truoc, de bo qua khi man hinh khong doi
  private var fixedRect: Rect? = null // khu vuc co dinh da chon

  // Moi 3 giay chup va dich lai man hinh khi dang bat che do tu dong
  private val autoTick = object : Runnable {
    override fun run() {
      if (!autoMode) return
      startTranslate(null)
      handler.postDelayed(this, AUTO_INTERVAL_MS)
    }
  }

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    if (intent == null) {
      stopSelf()
      return START_NOT_STICKY
    }

    serverUrl = intent.getStringExtra("serverUrl")?.trimEnd('/') ?: ""
    appKey = intent.getStringExtra("appKey") ?: ""
    sourceLang = intent.getStringExtra("sourceLang") ?: "en"
    targetLang = intent.getStringExtra("targetLang") ?: "vi"
    model = intent.getStringExtra("model") ?: ""
    accentColor = Color.parseColor(intent.getStringExtra("accentColor") ?: "#14B8A6")

    // Android 14 bat buoc goi startForeground truoc khi lay MediaProjection
    startForegroundWithNotification()

    windowManager = getSystemService(Context.WINDOW_SERVICE) as WindowManager
    recognizer = when (sourceLang) {
      "zh" -> TextRecognition.getClient(ChineseTextRecognizerOptions.Builder().build())
      "ja" -> TextRecognition.getClient(JapaneseTextRecognizerOptions.Builder().build())
      "ko" -> TextRecognition.getClient(KoreanTextRecognizerOptions.Builder().build())
      else -> TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)
    }

    val resultCode = intent.getIntExtra("resultCode", 0)
    val resultData = intent.getParcelableExtra<Intent>("resultData")
    if (resultData == null) {
      stopSelf()
      return START_NOT_STICKY
    }

    val manager = getSystemService(Context.MEDIA_PROJECTION_SERVICE) as MediaProjectionManager
    projection = manager.getMediaProjection(resultCode, resultData)
    // Android 14 bat buoc dang ky callback truoc khi tao VirtualDisplay
    projection?.registerCallback(object : MediaProjection.Callback() {
      override fun onStop() {
        // Nguoi dung tat chia se man hinh tu thanh thong bao he thong
        stopSelf()
      }
    }, handler)

    setupCapture()
    showWidget()
    isRunning = true
    return START_NOT_STICKY
  }

  override fun onDestroy() {
    isRunning = false
    autoMode = false
    handler.removeCallbacksAndMessages(null)
    overlay?.let { windowManager.removeView(it) }
    selectionView?.let { windowManager.removeView(it) }
    widget?.let { windowManager.removeView(it) }
    virtualDisplay?.release()
    imageReader?.close()
    projection?.stop()
    recognizer.close()
    networkExecutor.shutdownNow()
    super.onDestroy()
  }

  // ---------- Thong bao (bat buoc voi foreground service) ----------

  private fun startForegroundWithNotification() {
    val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    notificationManager.createNotificationChannel(
      NotificationChannel(CHANNEL_ID, "Lumo Lens", NotificationManager.IMPORTANCE_LOW)
    )
    val notification = Notification.Builder(this, CHANNEL_ID)
      .setContentTitle("Lumo Lens đang chạy")
      .setContentText("Bấm nút nổi để dịch màn hình")
      .setSmallIcon(android.R.drawable.ic_dialog_info)
      .build()

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      startForeground(1, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PROJECTION)
    } else {
      startForeground(1, notification)
    }
  }

  // ---------- Chup man hinh ----------

  private fun getScreenSize(): Pair<Int, Int> {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
      // maximumWindowMetrics luon tra ve kich thuoc man hinh day du, on dinh hon currentWindowMetrics
      val bounds = windowManager.maximumWindowMetrics.bounds
      return Pair(bounds.width(), bounds.height())
    }
    val metrics = DisplayMetrics()
    @Suppress("DEPRECATION")
    windowManager.defaultDisplay.getRealMetrics(metrics)
    return Pair(metrics.widthPixels, metrics.heightPixels)
  }

  // Tao VirtualDisplay ghi hinh vao ImageReader.
  // Android 14+ chi cho tao VirtualDisplay MOT LAN tren moi MediaProjection,
  // nen lan sau (vd xoay man hinh) chi doi kich thuoc va doi Surface cua VirtualDisplay cu.
  private fun setupCapture() {
    val (width, height) = getScreenSize()
    captureWidth = width
    captureHeight = height

    val oldReader = imageReader
    val newReader = ImageReader.newInstance(width, height, PixelFormat.RGBA_8888, 2)
    imageReader = newReader

    val display = virtualDisplay
    if (display == null) {
      // Lan dau tien: tao moi
      virtualDisplay = projection?.createVirtualDisplay(
        "LumoLensCapture",
        width,
        height,
        resources.displayMetrics.densityDpi,
        DisplayManager.VIRTUAL_DISPLAY_FLAG_AUTO_MIRROR,
        newReader.surface,
        null,
        null
      )
    } else {
      // Cac lan sau: dung lai VirtualDisplay cu
      display.resize(width, height, resources.displayMetrics.densityDpi)
      display.setSurface(newReader.surface)
    }

    // Dong ImageReader cu sau khi da chuyen sang cai moi
    oldReader?.close()
  }

  // Lay khung hinh moi nhat thanh Bitmap. Tra ve null neu chua co khung hinh nao.
  private fun grabBitmap(): Bitmap? {
    val image = imageReader?.acquireLatestImage() ?: return null
    val plane = image.planes[0]
    val pixelStride = plane.pixelStride
    // Moi dong anh co the bi them phan dem, nen phai tinh lai chieu rong that
    val rowPadding = plane.rowStride - pixelStride * captureWidth

    val padded = Bitmap.createBitmap(captureWidth + rowPadding / pixelStride, captureHeight, Bitmap.Config.ARGB_8888)
    padded.copyPixelsFromBuffer(plane.buffer)
    val bitmap = Bitmap.createBitmap(padded, 0, 0, captureWidth, captureHeight)
    padded.recycle()
    image.close()
    return bitmap
  }

  // ---------- Nut noi + thanh cong cu ----------

  private fun dp(value: Int): Int = (value * resources.displayMetrics.density).toInt()

  // Tao mot nut tron nho trong thanh cong cu
  private fun menuButton(iconRes: Int, description: String, onClick: () -> Unit): ImageView {
    val button = ImageView(this)
    button.setImageResource(iconRes)
    button.setColorFilter(Color.WHITE)
    button.contentDescription = description
    button.setPadding(dp(10), dp(10), dp(10), dp(10))
    button.background = GradientDrawable().apply {
      shape = GradientDrawable.OVAL
      setColor(Color.parseColor("#2A4A46"))
    }
    button.layoutParams = LinearLayout.LayoutParams(dp(44), dp(44)).apply { topMargin = dp(8) }
    button.setOnClickListener {
      collapseMenu()
      onClick()
    }
    return button
  }

  private fun showWidget() {
    // Nut tron chinh
    val main = TextView(this)
    main.text = "L"
    main.setTextColor(Color.WHITE)
    main.setTextSize(TypedValue.COMPLEX_UNIT_SP, 22f)
    main.gravity = Gravity.CENTER
    main.contentDescription = "Nút dịch Lumo Lens"
    main.background = GradientDrawable().apply {
      shape = GradientDrawable.OVAL
      setColor(accentColor)
    }
    main.elevation = dp(6).toFloat()
    main.layoutParams = LinearLayout.LayoutParams(dp(56), dp(56))
    mainButton = main

    // Thanh cong cu (mac dinh an)
    val menuLayout = LinearLayout(this)
    menuLayout.orientation = LinearLayout.VERTICAL
    menuLayout.gravity = Gravity.CENTER_HORIZONTAL
    menuLayout.visibility = View.GONE
    menuLayout.setPadding(dp(6), 0, dp(6), dp(8))
    menuLayout.background = GradientDrawable().apply {
      cornerRadius = dp(28).toFloat()
      setColor(Color.parseColor("#E612302D"))
    }
    menuLayout.addView(menuButton(android.R.drawable.ic_menu_camera, "Dịch toàn màn hình") { translateFullScreen() })
    menuLayout.addView(menuButton(android.R.drawable.ic_menu_rotate, "Dịch tự động") { toggleAuto() })
    val fixedButton = menuButton(android.R.drawable.ic_menu_edit, "Dịch khu vực cố định") { translateFixedArea() }
    // Nhan giu nut nay de chon lai khu vuc co dinh
    fixedButton.setOnLongClickListener {
      collapseMenu()
      startRegionSelect(true)
      true
    }
    menuLayout.addView(fixedButton)
    menuLayout.addView(menuButton(android.R.drawable.ic_menu_crop, "Dịch khu vực") { startRegionSelect(false) })
    menuLayout.addView(menuButton(android.R.drawable.ic_menu_close_clear_cancel, "Tắt nút dịch") { stopSelf() })
    menu = menuLayout

    val container = LinearLayout(this)
    container.orientation = LinearLayout.VERTICAL
    container.gravity = Gravity.CENTER_HORIZONTAL
    container.addView(main)
    container.addView(menuLayout)
    widget = container

    widgetParams = WindowManager.LayoutParams(
      WindowManager.LayoutParams.WRAP_CONTENT,
      WindowManager.LayoutParams.WRAP_CONTENT,
      WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
      WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
      PixelFormat.TRANSLUCENT
    )
    widgetParams.gravity = Gravity.TOP or Gravity.START
    widgetParams.x = dp(16)
    widgetParams.y = dp(200)

    // Nhan dien cu chi: nhan mot lan, nhan dup, nhan giu
    var moved = false
    val detector = GestureDetector(this, object : GestureDetector.SimpleOnGestureListener() {
      override fun onDown(e: MotionEvent): Boolean = true

      override fun onSingleTapConfirmed(e: MotionEvent): Boolean {
        toggleMenu()
        return true
      }

      override fun onDoubleTap(e: MotionEvent): Boolean {
        translateFullScreen()
        return true
      }

      override fun onLongPress(e: MotionEvent) {
        if (!moved) {
          collapseMenu()
          startRegionSelect(false)
        }
      }
    })

    // Keo de di chuyen nut
    main.setOnTouchListener(object : View.OnTouchListener {
      var startX = 0
      var startY = 0
      var touchX = 0f
      var touchY = 0f

      override fun onTouch(v: View, event: MotionEvent): Boolean {
        detector.onTouchEvent(event)
        when (event.action) {
          MotionEvent.ACTION_DOWN -> {
            startX = widgetParams.x
            startY = widgetParams.y
            touchX = event.rawX
            touchY = event.rawY
            moved = false
          }
          MotionEvent.ACTION_MOVE -> {
            val dx = event.rawX - touchX
            val dy = event.rawY - touchY
            if (abs(dx) > 10 || abs(dy) > 10) moved = true
            if (moved) {
              widgetParams.x = startX + dx.toInt()
              widgetParams.y = startY + dy.toInt()
              windowManager.updateViewLayout(container, widgetParams)
            }
          }
        }
        return true
      }
    })

    windowManager.addView(container, widgetParams)
  }

  private fun toggleMenu() {
    val layout = menu ?: return
    layout.visibility = if (layout.visibility == View.VISIBLE) View.GONE else View.VISIBLE
  }

  private fun collapseMenu() {
    menu?.visibility = View.GONE
  }

  private fun toast(message: String) {
    Toast.makeText(this, message, Toast.LENGTH_SHORT).show()
  }

  // ---------- Cac chuc nang cua nut ----------

  private fun stopAuto() {
    autoMode = false
    handler.removeCallbacks(autoTick)
  }

  private fun clearOverlay() {
    overlay?.let { windowManager.removeView(it) }
    overlay = null
  }

  // Dich toan man hinh. Neu dang hien ban dich thi bam de tat di.
  private fun translateFullScreen() {
    if (isBusy) return
    stopAuto()
    if (overlay != null) {
      clearOverlay()
      return
    }
    startTranslate(null)
  }

  // Dich khu vuc co dinh: lan dau phai chon vung, cac lan sau dung lai vung da luu
  private fun translateFixedArea() {
    if (isBusy) return
    val saved = fixedRect
    if (saved == null) {
      startRegionSelect(true)
      return
    }
    stopAuto()
    clearOverlay()
    startTranslate(saved)
  }

  // Bat / tat che do dich tu dong
  private fun toggleAuto() {
    if (autoMode) {
      stopAuto()
      clearOverlay()
      toast("Đã tắt dịch tự động")
      return
    }
    clearOverlay()
    autoMode = true
    lastAutoKey = ""
    toast("Đã bật dịch tự động")
    handler.post(autoTick)
  }

  // Hien lop phu de nguoi dung keo chon vung. saveAsFixed = true thi luu lai lam khu vuc co dinh.
  private fun startRegionSelect(saveAsFixed: Boolean) {
    if (isBusy || selectionView != null) return
    stopAuto()
    clearOverlay()

    val view = SelectionView(this, accentColor) { selected ->
      selectionView?.let { windowManager.removeView(it) }
      selectionView = null
      if (selected != null) {
        if (saveAsFixed) fixedRect = selected
        startTranslate(selected)
      }
    }
    val params = WindowManager.LayoutParams(
      captureWidth,
      captureHeight,
      WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
      WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
      PixelFormat.TRANSLUCENT
    )
    params.gravity = Gravity.TOP or Gravity.START
    windowManager.addView(view, params)
    selectionView = view
  }

  // Ket thuc mot lan dich: bat lai nut noi va lop phu
  private fun finishWork() {
    isBusy = false
    mainButton?.text = "L"
    widget?.visibility = View.VISIBLE
    overlay?.visibility = View.VISIBLE
  }

  // ---------- Quy trinh dich ----------

  // region = null la dich ca man hinh, con lai chi dich trong khung do
  private fun startTranslate(region: Rect?) {
    if (isBusy) return
    isBusy = true
    mainButton?.text = "..."
    // An nut noi va ban dich cu di de chung khong lot vao anh chup
    widget?.visibility = View.INVISIBLE
    overlay?.visibility = View.INVISIBLE

    // Xoay man hinh thi kich thuoc doi, phai cap nhat lai VirtualDisplay
    val (width, height) = getScreenSize()
    var delay = 200L
    if (width != captureWidth || height != captureHeight) {
      setupCapture()
      delay = 600L
    }
    handler.postDelayed({ captureAndRead(0, region) }, delay)
  }

  // Thu lay anh toi da 10 lan, giong vong lap thu lai cua app goc
  private fun captureAndRead(attempt: Int, region: Rect?) {
    val bitmap = grabBitmap()
    if (bitmap == null) {
      if (attempt < 10) {
        handler.postDelayed({ captureAndRead(attempt + 1, region) }, 150)
      } else {
        toast("Không chụp được màn hình")
        finishWork()
      }
      return
    }

    // Cat anh theo khung da chon (neu co), khung nam ngoai man hinh thi cat lai cho vua
    val safeRegion = region?.let { Rect(it) }
    if (safeRegion != null && !safeRegion.intersect(0, 0, bitmap.width, bitmap.height)) {
      toast("Khu vực nằm ngoài màn hình")
      bitmap.recycle()
      finishWork()
      return
    }
    val cropped = if (safeRegion != null) {
      Bitmap.createBitmap(bitmap, safeRegion.left, safeRegion.top, safeRegion.width(), safeRegion.height())
    } else {
      bitmap
    }
    val offsetX = safeRegion?.left ?: 0
    val offsetY = safeRegion?.top ?: 0

    recognizer.process(InputImage.fromBitmap(cropped, 0))
      .addOnSuccessListener { result ->
        // Moi block la mot doan van, gom ca vi tri tren man hinh
        val joiner = if (sourceLang == "zh" || sourceLang == "ja") "" else " "
        val boxes = ArrayList<Rect>()
        val texts = ArrayList<String>()
        for (block in result.textBlocks) {
          val rect = block.boundingBox ?: continue
          val text = block.text.replace("\n", joiner).trim()
          if (text.isEmpty() || boxes.size >= MAX_BLOCKS) continue
          // Khung OCR tinh theo anh da cat, cong them vi tri cat de ra toa do tren man hinh
          val box = Rect(rect)
          box.offset(offsetX, offsetY)
          boxes.add(box)
          texts.add(text)
        }

        // Gop cac khoi o gan nhau (thuong la cung mot bong thoai) thanh mot khoi lon
        // de dich tron nghia va ve mot o che lon, chu dich to hon
        var merged = true
        while (merged) {
          merged = false
          mergeLoop@ for (i in boxes.indices) {
            for (j in i + 1 until boxes.size) {
              val gap = min(boxes[i].height(), boxes[j].height()) / 2
              val nearArea = Rect(boxes[i])
              nearArea.inset(-gap, -gap)
              if (Rect.intersects(nearArea, boxes[j])) {
                boxes[i].union(boxes[j])
                texts[i] = texts[i] + joiner + texts[j]
                boxes.removeAt(j)
                texts.removeAt(j)
                merged = true
                break@mergeLoop
              }
            }
          }
        }

        if (texts.isEmpty()) {
          if (!autoMode) toast("Không tìm thấy chữ trên màn hình")
          clearOverlay()
          bitmap.recycle()
          finishWork()
          return@addOnSuccessListener
        }

        // Che do tu dong: man hinh khong doi thi giu nguyen ban dich cu, khong goi server
        val key = texts.joinToString("|")
        if (autoMode && key == lastAutoKey) {
          bitmap.recycle()
          finishWork()
          return@addOnSuccessListener
        }
        lastAutoKey = key

        translateAndDraw(bitmap, boxes, texts)
      }
      .addOnFailureListener {
        toast("Không đọc được chữ")
        bitmap.recycle()
        finishWork()
      }
      .addOnCompleteListener {
        // Anh cat chi dung de OCR, xong thi giai phong
        if (cropped !== bitmap) cropped.recycle()
      }
  }

  private fun translateAndDraw(bitmap: Bitmap, boxes: List<Rect>, texts: List<String>) {
    networkExecutor.execute {
      try {
        val translated = callServer(texts)
        handler.post {
          drawOverlay(bitmap, boxes, translated)
          bitmap.recycle()
          finishWork()
        }
      } catch (e: Exception) {
        handler.post {
          // Loi server thi dung dich tu dong, tranh bao loi lien tuc moi 3 giay
          stopAuto()
          toast("Dịch lỗi: ${e.message}")
          bitmap.recycle()
          finishWork()
        }
      }
    }
  }

  // Goi POST /api/translate tren server Node.js
  private fun callServer(texts: List<String>): List<String> {
    val body = JSONObject()
      .put("texts", JSONArray(texts))
      .put("sourceLang", sourceLang)
      .put("targetLang", targetLang)
      .put("model", model)

    val connection = URL("$serverUrl/api/translate").openConnection() as HttpURLConnection
    connection.requestMethod = "POST"
    connection.setRequestProperty("Content-Type", "application/json; charset=utf-8")
    connection.setRequestProperty("x-app-key", appKey)
    connection.connectTimeout = 10000
    connection.readTimeout = 40000
    connection.doOutput = true
    connection.outputStream.use { it.write(body.toString().toByteArray(Charsets.UTF_8)) }

    if (connection.responseCode != 200) {
      throw Exception("server trả về ${connection.responseCode}")
    }
    val json = JSONObject(connection.inputStream.bufferedReader().readText())
    val array = json.getJSONArray("translations")
    return List(array.length()) { array.getString(it) }
  }

  // ---------- Ve lop phu ----------

  private fun drawOverlay(bitmap: Bitmap, boxes: List<Rect>, translated: List<String>) {
    // Thay ban dich cu (neu co) bang ban dich moi
    clearOverlay()
    val root = FrameLayout(this)

    for (i in boxes.indices) {
      // Noi rong o che ra mot chut de che het net chu OCR doc sot o mep
      val rect = Rect(boxes[i])
      val padding = max(dp(4), rect.height() / 6)
      rect.inset(-padding, -padding)
      rect.intersect(0, 0, bitmap.width, bitmap.height)
      if (rect.width() < 2 || rect.height() < 2) continue

      // Lay mau nen: doc 8 diem sat mep ngoai o che (4 goc + 4 giua canh),
      // chon mau xuat hien nhieu nhat. Mau duoc lam tron de cac mau gan giong nhau tinh chung.
      val right = rect.right - 1
      val bottom = rect.bottom - 1
      val centerX = rect.centerX()
      val centerY = rect.centerY()
      val xs = intArrayOf(rect.left, centerX, right, rect.left, right, rect.left, centerX, right)
      val ys = intArrayOf(rect.top, rect.top, rect.top, centerY, centerY, bottom, bottom, bottom)
      val colorCount = HashMap<Int, Int>()
      for (k in xs.indices) {
        val pixel = bitmap.getPixel(xs[k].coerceIn(0, bitmap.width - 1), ys[k].coerceIn(0, bitmap.height - 1))
        val rounded = pixel and 0xFFF0F0F0.toInt()
        colorCount[rounded] = (colorCount[rounded] ?: 0) + 1
      }
      val background = (colorCount.maxByOrNull { it.value }?.key ?: Color.WHITE) or 0xFF000000.toInt()

      // Nen sang thi chu den, nen toi thi chu trang
      val brightness = 0.299 * Color.red(background) + 0.587 * Color.green(background) + 0.114 * Color.blue(background)

      val textView = TextView(this)
      textView.text = translated[i]
      textView.setBackgroundColor(background)
      textView.setTextColor(if (brightness > 140) Color.BLACK else Color.WHITE)
      textView.gravity = Gravity.CENTER
      textView.setPadding(dp(2), dp(1), dp(2), dp(1))
      // Tu thu nho chu cho vua khung
      TextViewCompat.setAutoSizeTextTypeUniformWithConfiguration(textView, 10, 24, 1, TypedValue.COMPLEX_UNIT_SP)

      val params = FrameLayout.LayoutParams(maxOf(rect.width(), 1), maxOf(rect.height(), 1))
      params.leftMargin = rect.left
      params.topMargin = rect.top
      root.addView(textView, params)
    }

    // Khoa man hinh khi dich: lop phu nuot cu cham nen app ben duoi khong cuon duoc, ban dich khong bi lech.
    // Rieng che do tu dong thi cho cham xuyen qua (NOT_TOUCHABLE) vi man hinh phai tiep tuc thay doi.
    var flags = WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS
    if (autoMode) flags = flags or WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE
    val overlayParams = WindowManager.LayoutParams(
      captureWidth,
      captureHeight,
      WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
      flags,
      PixelFormat.TRANSLUCENT
    )
    overlayParams.gravity = Gravity.TOP or Gravity.START

    windowManager.addView(root, overlayParams)
    overlay = root

    // Cua so them sau nam tren cung: them lai nut noi de khong bi lop phu che, con bam dup de tat duoc
    widget?.let {
      windowManager.removeView(it)
      windowManager.addView(it, widgetParams)
    }
  }
}

// Lop phu toan man hinh de nguoi dung keo chon vung can dich.
// Tra ve khung da chon qua onDone, hoac null neu nguoi dung chi cham (huy) hay chon qua nho.
class SelectionView(
  context: Context,
  private val accentColor: Int,
  private val onDone: (Rect?) -> Unit
) : View(context) {

  private val fillPaint = Paint().apply { color = Color.argb(50, 255, 255, 255) }
  private val strokePaint = Paint().apply {
    color = accentColor
    style = Paint.Style.STROKE
    strokeWidth = 4f * resources.displayMetrics.density
  }
  private val hintPaint = Paint().apply {
    color = Color.WHITE
    textSize = 16f * resources.displayMetrics.scaledDensity
    textAlign = Paint.Align.CENTER
    isAntiAlias = true
  }
  private val minSize = 24f * resources.displayMetrics.density

  private var startX = 0f
  private var startY = 0f
  private var selected: RectF? = null

  override fun onDraw(canvas: Canvas) {
    canvas.drawColor(Color.argb(110, 0, 0, 0))
    canvas.drawText("Kéo để chọn vùng cần dịch", width / 2f, height * 0.15f, hintPaint)
    selected?.let {
      canvas.drawRect(it, fillPaint)
      canvas.drawRect(it, strokePaint)
    }
  }

  override fun onTouchEvent(event: MotionEvent): Boolean {
    when (event.action) {
      MotionEvent.ACTION_DOWN -> {
        startX = event.x
        startY = event.y
        selected = RectF(startX, startY, startX, startY)
      }
      MotionEvent.ACTION_MOVE -> {
        selected = RectF(min(startX, event.x), min(startY, event.y), max(startX, event.x), max(startY, event.y))
        invalidate()
      }
      MotionEvent.ACTION_UP -> {
        val box = selected
        val tooSmall = box == null || box.width() < minSize || box.height() < minSize
        if (tooSmall || box == null) {
          onDone(null)
        } else {
          // Cat khung cho nam trong man hinh
          val left = box.left.toInt().coerceIn(0, width)
          val top = box.top.toInt().coerceIn(0, height)
          val right = box.right.toInt().coerceIn(0, width)
          val bottom = box.bottom.toInt().coerceIn(0, height)
          onDone(Rect(left, top, right, bottom))
        }
      }
      MotionEvent.ACTION_CANCEL -> onDone(null)
    }
    return true
  }
}
