package expo.modules.screentranslator

import android.animation.ValueAnimator
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
import android.graphics.Matrix
import android.graphics.Paint
import android.graphics.PixelFormat
import android.graphics.Rect
import android.graphics.RectF
import android.graphics.SweepGradient
import android.graphics.drawable.BitmapDrawable
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
import android.view.animation.LinearInterpolator
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
    var instance: TranslatorService? = null
      private set
    private const val CHANNEL_ID = "lumo_lens_channel"
    private const val MAX_BLOCKS = 50
    private const val AUTO_DEBOUNCE_MS = 800L
    private const val STABLE_FRAME_DELAY_MS = 350L
  }

  private val handler = Handler(Looper.getMainLooper())
  private val networkExecutor = Executors.newSingleThreadExecutor()

  private lateinit var windowManager: WindowManager
  private var recognizer: TextRecognizer? = null
  private val activeReaders = mutableMapOf<TextRecognizer, Int>()

  // Cau hinh nhan tu JS
  private var serverUrl = ""
  private var appKey = ""
  private var sourceLang = "en"
  private var targetLang = "vi"
  private var model = ""
  private var mode = "game"
  private val mangaContext = MangaContext()
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
  private var clearContextButton: ImageView? = null
  private var menuScroll: android.widget.ScrollView? = null
  private val storyDetector = StoryChangeDetector()
  private var storyConfirmation: LinearLayout? = null
  private var keepStoryButton: TextView? = null
  private var resetStoryButton: TextView? = null
  private var pendingStoryTitle: String? = null
  private lateinit var widgetParams: WindowManager.LayoutParams
  private var overlay: FrameLayout? = null
  private val overlayBitmaps = ArrayList<Bitmap>()
  @Volatile private var destroyed = false
  private val pendingPatches = ArrayList<OverlayPatch>()
  private var selectionView: SelectionView? = null
  private var glowView: GlowView? = null // lop sang luc cho server dich

  // Trang thai lam viec
  private var isBusy = false
  private val autoState = AutoTranslationState()
  private val autoMode get() = autoState.enabled
  private var workId = 0L
  private var activeAutoGeneration: Long? = null
  private var cachedTranslations: List<String> = emptyList()
  private var fixedRect: Rect? = null // khu vuc co dinh da chon

  // One callback after interaction, never periodic OCR while idle.
  private val autoRetryRunnable = Runnable {
    if (!destroyed && !isBusy && pendingStoryTitle == null && autoState.takePending()) startTranslate(null)
  }

  private fun scheduleAutoTranslation() {
    handler.removeCallbacks(autoRetryRunnable)
    if (autoMode && !destroyed) handler.postDelayed(autoRetryRunnable, AUTO_DEBOUNCE_MS)
  }

  private fun onAutoInteraction() {
    if (!autoMode || destroyed) return
    autoState.interact()
    clearOverlay()
    scheduleAutoTranslation()
  }

  private fun isCurrentWork(id: Long, generation: Long?): Boolean =
    !destroyed && id == workId && (generation == null || autoState.isCurrent(generation))

  fun updateConfig(newMode: String, newSourceLang: String, newTargetLang: String, newModel: String) {
    val safeMode = if (newMode == "manga") "manga" else "game"
    if (mode == safeMode && sourceLang == newSourceLang && targetLang == newTargetLang && model == newModel) return
    workId++
    isBusy = false
    hideGlow()
    clearOverlay()
    if (sourceLang != newSourceLang) {
      recognizer?.let { old -> if ((activeReaders[old] ?: 0) == 0) old.close() }
      recognizer = null
    }
    mode = safeMode
    clearContextButton?.visibility = if (mode == "manga") View.VISIBLE else View.GONE
    sourceLang = newSourceLang
    targetLang = newTargetLang
    model = newModel
    mangaContext.clear()
    storyDetector.clear()
    hideStoryConfirmation()
    cachedTranslations = emptyList()
    if (autoMode) autoState.start()
    activeAutoGeneration = null
    widget?.visibility = View.VISIBLE
    mainButton?.text = "L"
    scheduleAutoTranslation()
  }

  fun clearMangaContext() {
    if (mode != "manga") return
    workId++
    isBusy = false
    activeAutoGeneration = null
    if (autoMode) autoState.start()
    mangaContext.clear()
    storyDetector.clear()
    hideStoryConfirmation()
    cachedTranslations = emptyList()
    clearOverlay()
    hideGlow()
    widget?.visibility = View.VISIBLE
    mainButton?.text = "L"
    toast("Đã xóa ngữ cảnh truyện")
    scheduleAutoTranslation()
  }

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    if (intent == null) {
      stopSelf()
      return START_NOT_STICKY
    }

    instance = this
    serverUrl = intent.getStringExtra("serverUrl")?.trimEnd('/') ?: ""
    appKey = intent.getStringExtra("appKey") ?: ""
    sourceLang = intent.getStringExtra("sourceLang") ?: "en"
    targetLang = intent.getStringExtra("targetLang") ?: "vi"
    model = intent.getStringExtra("model") ?: ""
    mode = if (intent.getStringExtra("mode") == "manga") "manga" else "game"
    accentColor = Color.parseColor(intent.getStringExtra("accentColor") ?: "#14B8A6")

    // Android 14 bat buoc goi startForeground truoc khi lay MediaProjection
    startForegroundWithNotification()

    windowManager = getSystemService(Context.WINDOW_SERVICE) as WindowManager
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

  override fun onConfigurationChanged(newConfig: android.content.res.Configuration) {
    super.onConfigurationChanged(newConfig)
    if (destroyed) return
    clearOverlay()
    if (autoMode) {
      onAutoInteraction()
    } else {
      workId++
      isBusy = false
      hideGlow()
      widget?.visibility = View.VISIBLE
      mainButton?.text = "L"
    }
    if (projection != null) setupCapture()
  }

  override fun onDestroy() {
    synchronized(pendingPatches) {
      destroyed = true
      pendingPatches.forEach { it.bitmap.recycle() }
      pendingPatches.clear()
    }
    isRunning = false
    if (instance === this) instance = null
    mangaContext.clear()
    autoState.stop()
    workId++
    handler.removeCallbacksAndMessages(null)
    clearOverlay()
    selectionView?.let { windowManager.removeView(it) }
    hideGlow()
    widget?.let { windowManager.removeView(it) }
    virtualDisplay?.release()
    imageReader?.close()
    projection?.stop()
    recognizer?.let { old -> if ((activeReaders[old] ?: 0) == 0) old.close() }
    recognizer = null
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

  // Do sang cua 1 mau (0 = den, 255 = trang)
  private fun brightnessOf(color: Int): Double =
    0.299 * Color.red(color) + 0.587 * Color.green(color) + 0.114 * Color.blue(color)

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
    clearContextButton = menuButton(android.R.drawable.ic_menu_delete, "Xóa ngữ cảnh truyện") { clearMangaContext() }.also {
      it.visibility = if (mode == "manga") View.VISIBLE else View.GONE
      menuLayout.addView(it)
    }
    menuLayout.addView(menuButton(android.R.drawable.ic_menu_close_clear_cancel, "Tắt nút dịch") { stopSelf() })
    menu = menuLayout

    val container = LinearLayout(this)
    container.orientation = LinearLayout.VERTICAL
    container.gravity = Gravity.CENTER_HORIZONTAL
    container.addView(main)
    val scroll = android.widget.ScrollView(this)
    scroll.visibility = View.GONE
    scroll.addView(menuLayout)
    menuLayout.visibility = View.VISIBLE
    scroll.layoutParams = LinearLayout.LayoutParams(dp(68), min(dp(330), resources.displayMetrics.heightPixels / 2))
    container.addView(scroll)
    menuScroll = scroll
    widget = container

    widgetParams = WindowManager.LayoutParams(
      WindowManager.LayoutParams.WRAP_CONTENT,
      WindowManager.LayoutParams.WRAP_CONTENT,
      WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
      WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
        WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL or
        WindowManager.LayoutParams.FLAG_WATCH_OUTSIDE_TOUCH,
      PixelFormat.TRANSLUCENT
    )
    container.setOnTouchListener { _, event ->
      if (event.actionMasked == MotionEvent.ACTION_OUTSIDE) onAutoInteraction()
      false
    }
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
    val layout = menuScroll ?: return
    layout.visibility = if (layout.visibility == View.VISIBLE) View.GONE else View.VISIBLE
  }

  private fun collapseMenu() {
    menuScroll?.visibility = View.GONE
  }

  private fun hideStoryConfirmation() {
    storyConfirmation?.let { widget?.removeView(it) }
    storyConfirmation = null
    pendingStoryTitle = null
  }

  private fun showStoryConfirmation(title: String) {
    if (pendingStoryTitle != null || mode != "manga") return
    collapseMenu()
    pendingStoryTitle = title
    val panel = LinearLayout(this)
    panel.orientation = LinearLayout.VERTICAL
    panel.setPadding(dp(10), dp(10), dp(10), dp(10))
    panel.setBackgroundColor(Color.parseColor("#E612302D"))
    val message = TextView(this)
    message.text = "Có vẻ bạn đã chuyển truyện. Xóa ngữ cảnh cũ?"
    message.setTextColor(Color.WHITE)
    panel.addView(message)
    val reset = TextView(this)
    reset.text = "Xóa ngữ cảnh"
    reset.setTextColor(Color.WHITE)
    reset.setPadding(0, dp(12), 0, dp(12))
    reset.setOnClickListener {
      clearMangaContext()
      storyDetector.accept(title)
      if (!autoMode) startTranslate(null)
    }
    panel.addView(reset)
    resetStoryButton = reset
    val keep = TextView(this)
    keep.text = "Giữ ngữ cảnh"
    keep.setTextColor(Color.WHITE)
    keep.setPadding(0, dp(12), 0, dp(12))
    keep.setOnClickListener {
      storyDetector.dismiss(title)
      hideStoryConfirmation()
      if (autoMode) { autoState.interact(); scheduleAutoTranslation() } else startTranslate(null)
    }
    panel.addView(keep)
    keepStoryButton = keep
    widget?.addView(panel, LinearLayout.LayoutParams(dp(220), LinearLayout.LayoutParams.WRAP_CONTENT))
    storyConfirmation = panel
  }

  private fun toast(message: String) {
    Toast.makeText(this, message, Toast.LENGTH_SHORT).show()
  }

  // ---------- Cac chuc nang cua nut ----------

  private fun stopAuto() {
    autoState.stop()
    cachedTranslations = emptyList()
    handler.removeCallbacks(autoRetryRunnable)
    clearOverlay()
  }

  private fun clearOverlay() {
    overlay?.let { windowManager.removeView(it) }
    overlay = null
    for (bitmap in overlayBitmaps) bitmap.recycle()
    overlayBitmaps.clear()
  }

  // Dich toan man hinh. Neu dang hien ban dich thi bam de tat di.
  private fun translateFullScreen() {
    if (isBusy) return
    val hadOverlay = overlay != null
    stopAuto()
    if (hadOverlay) return
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
    if (!autoMode && isBusy && activeAutoGeneration == null) return
    if (autoMode) {
      stopAuto()
      clearOverlay()
      toast("Đã tắt dịch tự động")
      return
    }
    clearOverlay()
    autoState.start()
    cachedTranslations = emptyList()
    toast("Đã bật dịch tự động")
    scheduleAutoTranslation()
  }

  // Hien lop phu de nguoi dung keo chon vung. saveAsFixed = true thi luu lai lam khu vuc co dinh.
  private fun startRegionSelect(saveAsFixed: Boolean) {
    if (isBusy || selectionView != null) return
    stopAuto()
    clearOverlay()

    val view = SelectionView(this, accentColor) { selected ->
      // SelectionView tra ve toa do cuc bo; chuyen sang toa do anh chup truoc khi OCR.
      val origin = IntArray(2)
      selectionView?.getLocationOnScreen(origin)
      selected?.offset(origin[0], origin[1])
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
  private fun finishWork(id: Long = workId) {
    if (destroyed || id != workId) return
    isBusy = false
    hideGlow()
    mainButton?.text = "L"
    widget?.visibility = View.VISIBLE
    if (activeAutoGeneration == null || autoState.isCurrent(activeAutoGeneration!!)) {
      overlay?.visibility = View.VISIBLE
    }
    activeAutoGeneration = null
    scheduleAutoTranslation()
  }

  // ---------- Quy trinh dich ----------

  // region = null la dich ca man hinh, con lai chi dich trong khung do
  private fun startTranslate(region: Rect?) {
    if (isBusy || destroyed || pendingStoryTitle != null) return
    isBusy = true
    val id = ++workId
    val generation = if (autoMode) autoState.generation else null
    activeAutoGeneration = generation
    mainButton?.text = "..."
    // An nut noi va ban dich cu di de chung khong lot vao anh chup
    // Keep the small widget available in auto mode so outside-touch and stop still work.
    if (generation == null) widget?.visibility = View.INVISIBLE
    overlay?.visibility = View.INVISIBLE

    // Xoay man hinh thi kich thuoc doi, phai cap nhat lai VirtualDisplay
    val (width, height) = getScreenSize()
    var delay = 200L
    if (width != captureWidth || height != captureHeight) {
      setupCapture()
      delay = 600L
    }
    handler.postDelayed({ captureAndRead(0, region, id, generation) }, delay)
  }

  // Thu lay anh toi da 10 lan, giong vong lap thu lai cua app goc
  private fun captureAndRead(attempt: Int, region: Rect?, id: Long, generation: Long?, previous: IntArray? = null) {
    if (!isCurrentWork(id, generation)) {
      finishWork(id)
      return
    }
    val bitmap = grabBitmap()
    if (bitmap == null) {
      if (attempt < 10) {
        handler.postDelayed({ captureAndRead(attempt + 1, region, id, generation, previous) }, 150)
      } else {
        toast("Không chụp được màn hình")
        finishWork()
      }
      return
    }

    if (generation != null) {
      val sample = IntArray(32 * 32)
      for (y in 0 until 32) for (x in 0 until 32) {
        sample[y * 32 + x] = bitmap.getPixel(x * bitmap.width / 32, y * bitmap.height / 32)
      }
      val stable = previous != null && sample.indices.count { i ->
        val a = sample[i]
        val b = previous[i]
        abs(Color.red(a) - Color.red(b)) + abs(Color.green(a) - Color.green(b)) + abs(Color.blue(a) - Color.blue(b)) > 45
      } <= sample.size / 50
      if (!stable) {
        bitmap.recycle()
        if (attempt < 10) {
          handler.postDelayed({ captureAndRead(attempt + 1, region, id, generation, sample) }, STABLE_FRAME_DELAY_MS)
        } else {
          finishWork(id)
        }
        return
      }
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

    val reader = try {
      recognizer ?: when (sourceLang) {
        "zh" -> TextRecognition.getClient(ChineseTextRecognizerOptions.Builder().build())
        "ja" -> TextRecognition.getClient(JapaneseTextRecognizerOptions.Builder().build())
        "ko" -> TextRecognition.getClient(KoreanTextRecognizerOptions.Builder().build())
        else -> TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)
      }.also { recognizer = it }
    } catch (e: Exception) {
      if (cropped !== bitmap) cropped.recycle()
      bitmap.recycle()
      if (generation != null) stopAuto()
      toast("Không khởi tạo được OCR: ${e.message}")
      finishWork(id)
      return
    }
    activeReaders[reader] = (activeReaders[reader] ?: 0) + 1
    reader.process(InputImage.fromBitmap(cropped, 0))
      .addOnSuccessListener { result ->
        if (!isCurrentWork(id, generation)) {
          bitmap.recycle()
          finishWork(id)
          return@addOnSuccessListener
        }
        // Moi block la mot doan van, gom ca vi tri tren man hinh
        val joiner = if (sourceLang == "zh" || sourceLang == "ja") "" else " "
        val boxes = ArrayList<Rect>()
        val texts = ArrayList<String>()
        // Chieu cao trung binh 1 dong chu goc (pixel), dung de chon co chu ban dich
        val lineHeights = ArrayList<Int>()
        for (block in result.textBlocks) {
          val rect = block.boundingBox ?: continue
          val text = block.text.replace("\n", joiner).trim()
          if (text.isEmpty() || boxes.size >= MAX_BLOCKS) continue
          // Khung OCR tinh theo anh da cat, cong them vi tri cat de ra toa do tren man hinh
          val box = Rect(rect)
          box.offset(offsetX, offsetY)
          boxes.add(box)
          texts.add(text)

          var totalHeight = 0
          var lineCount = 0
          for (line in block.lines) {
            val lineBox = line.boundingBox ?: continue
            totalHeight += lineBox.height()
            lineCount++
          }
          lineHeights.add(if (lineCount > 0) totalHeight / lineCount else rect.height())
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
                // Gop khoi thi lay dong chu nho hon de chu dich khong bi tran
                lineHeights[i] = min(lineHeights[i], lineHeights[j])
                boxes.removeAt(j)
                texts.removeAt(j)
                lineHeights.removeAt(j)
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

        if (mode == "manga") {
          val changedTitle = storyDetector.observe(texts)
          if (changedTitle != null) {
            bitmap.recycle()
            finishWork(id)
            showStoryConfirmation(changedTitle)
            return@addOnSuccessListener
          }
        }

        // Che do tu dong: man hinh khong doi thi giu nguyen ban dich cu, khong goi server
        // Include positions so identical words at a new scroll position are not stale.
        val key = texts.indices.joinToString("|") { "${texts[it]}@${boxes[it].flattenToString()}" }
        val cached = if (generation != null && !autoState.shouldTranslate(key)) cachedTranslations else null
        translateAndDraw(bitmap, boxes, texts, lineHeights, id, generation, key, cached)
      }
      .addOnFailureListener {
        if (isCurrentWork(id, generation)) {
          if (generation != null) stopAuto()
          toast("Không đọc được chữ")
        }
        bitmap.recycle()
        finishWork(id)
      }
      .addOnCompleteListener {
        val remaining = (activeReaders[reader] ?: 1) - 1
        if (remaining == 0) {
          activeReaders.remove(reader)
          if (reader !== recognizer) reader.close()
        } else activeReaders[reader] = remaining
        // Anh cat chi dung de OCR, xong thi giai phong
        if (cropped !== bitmap) cropped.recycle()
      }
  }

  // Chi hien lop sang khi dich tay; auto mode giu nut noi de nguoi dung co the dung.
  private fun showGlow() {
    if (autoMode || glowView != null) return
    val view = GlowView(this)
    val params = WindowManager.LayoutParams(
      captureWidth,
      captureHeight,
      WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
      WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
        WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE or
        WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
      PixelFormat.TRANSLUCENT
    )
    params.gravity = Gravity.TOP or Gravity.START
    windowManager.addView(view, params)
    glowView = view
  }

  private fun hideGlow() {
    glowView?.let {
      it.stop()
      windowManager.removeView(it)
    }
    glowView = null
  }

  private fun translateAndDraw(bitmap: Bitmap, boxes: List<Rect>, texts: List<String>, lineHeights: List<Int>, id: Long, generation: Long?, key: String, cached: List<String>?) {
    showGlow()
    val request = buildTranslationRequest(texts)
    val requestMode = mode
    networkExecutor.execute {
      try {
        val translated = cached ?: callServer(request)
        require(translated.size == boxes.size) { "Số bản dịch không khớp số ô OCR" }
        val patches = ArrayList<OverlayPatch>()
        val rects = ArrayList<Rect>()
        val heights = ArrayList<Int>()
        val labels = ArrayList<String>()
        try {
          for (i in boxes.indices) {
            if (destroyed) break
            val rect = Rect(boxes[i])
            rect.inset(-dp(2), -dp(2))
            if (!rect.intersect(0, 0, bitmap.width, bitmap.height) || rect.width() < 2 || rect.height() < 2) continue
            val crop = Bitmap.createBitmap(bitmap, rect.left, rect.top, rect.width(), rect.height())
            try {
              patches.add(OverlayImageProcessor.prepare(crop))
            } finally {
              if (crop !== bitmap) crop.recycle()
            }
            rects.add(rect)
            heights.add(lineHeights[i])
            labels.add(translated[i])
          }
        } catch (e: Exception) {
          patches.forEach { it.bitmap.recycle() }
          throw e
        }
        bitmap.recycle()
        synchronized(pendingPatches) {
          if (destroyed) {
            patches.forEach { it.bitmap.recycle() }
          } else {
            pendingPatches.addAll(patches)
            handler.post {
              synchronized(pendingPatches) { pendingPatches.clear() }
              if (isCurrentWork(id, generation)) {
                drawOverlay(rects, labels, heights, patches)
                if (requestMode == "manga" && cached == null) mangaContext.append(texts, translated)
                if (generation != null) {
                  autoState.commit(generation, key)
                  cachedTranslations = translated
                }
              } else {
                patches.forEach { if (!it.bitmap.isRecycled) it.bitmap.recycle() }
              }
              finishWork(id)
            }
          }
        }
      } catch (e: Exception) {
        if (destroyed) {
          bitmap.recycle()
          return@execute
        }
        handler.post {
          if (destroyed) return@post
          if (isCurrentWork(id, generation)) {
            stopAuto()
            toast("Dịch lỗi: ${e.message}")
          }
          if (!bitmap.isRecycled) bitmap.recycle()
          finishWork(id)
        }
      }
    }
  }

  // Goi POST /api/translate tren server Node.js
  private fun buildTranslationRequest(texts: List<String>): JSONObject {
    val body = JSONObject()
      .put("texts", JSONArray(texts))
      .put("sourceLang", sourceLang)
      .put("targetLang", targetLang)
      .put("model", model)
      .put("mode", mode)
    if (mode == "manga") {
      val context = JSONArray()
      for (turn in mangaContext.snapshot()) {
        val pairs = JSONArray()
        for (pair in turn) pairs.put(JSONObject().put("source", pair.source).put("translation", pair.translation))
        context.put(pairs)
      }
      body.put("context", context)
    }
    return body
  }

  private fun callServer(body: JSONObject): List<String> {

    val connection = URL("$serverUrl/api/translate").openConnection() as HttpURLConnection
    connection.requestMethod = "POST"
    connection.setRequestProperty("Content-Type", "application/json; charset=utf-8")
    connection.setRequestProperty("x-app-key", appKey)
    connection.connectTimeout = 10000
    connection.readTimeout = 40000
    connection.doOutput = true
    try {
      connection.outputStream.use { it.write(body.toString().toByteArray(Charsets.UTF_8)) }
      if (connection.responseCode != 200) {
        throw Exception("server trả về ${connection.responseCode}")
      }
      val json = JSONObject(connection.inputStream.bufferedReader().use { it.readText() })
      val array = json.getJSONArray("translations")
      return List(array.length()) { array.getString(it) }
    } finally {
      connection.disconnect()
    }
  }

  // ---------- Ve lop phu ----------

  private fun drawOverlay(boxes: List<Rect>, translated: List<String>, lineHeights: List<Int>, patches: List<OverlayPatch>) {
    // Thay ban dich cu (neu co) bang ban dich moi
    clearOverlay()
    val root = ScreenOverlayLayout(this)

    for (i in boxes.indices) {
      val rect = boxes[i]
      val patch = patches[i]
      overlayBitmaps.add(patch.bitmap)
      val textView = StrokedTextView(this)
      textView.text = translated[i]
      textView.background = BitmapDrawable(resources, patch.bitmap)
      textView.setTextColor(patch.textColor)
      textView.strokeColor = if (brightnessOf(patch.textColor) > 128) Color.BLACK else Color.WHITE
      textView.strokeWidthPx = max(1f, resources.displayMetrics.density * 0.75f)
      textView.gravity = Gravity.CENTER
      textView.setPadding(dp(2), 0, dp(2), 0)
      // Co chu toi da bang chieu cao dong chu goc, ban dich dai hon thi tu thu nho lai
      val maxPx = max(lineHeights[i], 2)
      val minPx = min(dp(8), maxPx - 1)
      TextViewCompat.setAutoSizeTextTypeUniformWithConfiguration(textView, minPx, maxPx, 1, TypedValue.COMPLEX_UNIT_PX)

      val params = FrameLayout.LayoutParams(maxOf(rect.width(), 1), maxOf(rect.height(), 1))
      params.leftMargin = rect.left
      params.topMargin = rect.top
      root.screenContent.addView(textView, params)
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
    // Android 12+ rejects cross-UID touches under an opaque, untrusted overlay.
    if (autoMode) {
      val maxOpacity = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        getSystemService(android.hardware.input.InputManager::class.java).maximumObscuringOpacityForTouch
      } else 0.8f
      overlayParams.alpha = min(0.8f, maxOpacity)
    }

    windowManager.addView(root, overlayParams)
    overlay = root

    // Cua so them sau nam tren cung: them lai nut noi de khong bi lop phu che, con bam dup de tat duoc
    widget?.let {
      windowManager.removeView(it)
      windowManager.addView(it, widgetParams)
    }
  }
}

// Dai mau (xanh duong, tim, do hong, xanh la) quay quanh 4 vien man hinh, dam sat mep roi tan dan vao trong.
// THU NGHIEM cach B: SweepGradient quay quanh tam. Chi ve, khong nhan cham. Goi stop() truoc khi go khoi WindowManager.
class GlowView(context: Context) : View(context) {

  // Dau va cuoi cung mau de dai mau noi lien thanh vong
  private val colors = intArrayOf(
    Color.parseColor("#4285F4"),
    Color.parseColor("#9B72F2"),
    Color.parseColor("#EA4C6B"),
    Color.parseColor("#34A853"),
    Color.parseColor("#4285F4")
  )
  private val paint = Paint().apply {
    isAntiAlias = true
    style = Paint.Style.STROKE
  }
  private val matrix = Matrix()
  private var sweep: SweepGradient? = null
  private val density = resources.displayMetrics.density
  // progress 0 -> 1 lap lai lien tuc, moi khoi troi lech pha nhau
  private var progress = 0f
  // fade 0 -> 1: lop mau hien dan len luc moi bat
  private var fade = 0f

  private val animator = ValueAnimator.ofFloat(0f, 1f).apply {
    duration = 5000
    repeatCount = ValueAnimator.INFINITE
    interpolator = LinearInterpolator()
    addUpdateListener { progress = it.animatedValue as Float; invalidate() }
  }
  private val fadeAnimator = ValueAnimator.ofFloat(0f, 1f).apply {
    duration = 700
    addUpdateListener { fade = it.animatedValue as Float }
  }

  init {
    animator.start()
    fadeAnimator.start()
  }

  fun stop() {
    animator.cancel()
    fadeAnimator.cancel()
  }

  override fun onSizeChanged(w: Int, h: Int, oldw: Int, oldh: Int) {
    // Tam gradient dat giua man hinh de dai mau quay deu quanh 4 canh
    sweep = SweepGradient(w / 2f, h / 2f, colors, null)
  }

  override fun onDraw(canvas: Canvas) {
    if (width == 0) return
    val shader = sweep ?: return
    // Xoay gradient quanh tam theo progress
    matrix.setRotate(progress * 360f, width / 2f, height / 2f)
    shader.setLocalMatrix(matrix)
    paint.shader = shader

    // Ve 12 vien long nhau: vien ngoai cung dam nhat, cang vao trong cang mo, tao do tan mem
    val layers = 12
    val step = 5f * density
    for (i in 0 until layers) {
      val inset = step * i
      paint.strokeWidth = step * 2f
      paint.alpha = ((1f - i.toFloat() / layers) * 80 * fade).toInt()
      canvas.drawRect(inset, inset, width - inset, height - inset, paint)
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
