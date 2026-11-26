package expo.modules.screentranslator

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.media.projection.MediaProjectionManager
import android.net.ConnectivityManager
import android.net.Uri
import android.provider.Settings
import androidx.core.content.ContextCompat
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record

// Du lieu JS gui xuong khi bam "Bat dau"
class StartOptions : Record {
  @Field val serverUrl: String = ""
  // Token dang nhap cua tai khoan. Thay cho appKey cu.
  @Field val token: String = ""
  @Field val sourceLang: String = "en"
  @Field val targetLang: String = "vi"
  @Field val accentColor: String = "#14B8A6"
  @Field val allowAutomatic: Boolean = false
  @Field val model: String = ""
  @Field val mode: String = "game"
}

// Cau noi giua JS va code Android: xin quyen, bat/tat service
class ScreenTranslatorModule : Module() {
  companion object {
    private const val REQUEST_CAPTURE = 4711
  }

  // Giu lai lua chon cua nguoi dung trong luc cho hop thoai xin quyen chup man hinh
  private var pendingOptions: StartOptions? = null
  private var pendingPromise: Promise? = null

  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("ScreenTranslator")

    Function("getGuestInstallId") {
      val preferences = context.getSharedPreferences("guest_trial", Context.MODE_PRIVATE)
      preferences.getString("installId", null) ?: java.util.UUID.randomUUID().toString().also {
        preferences.edit().putString("installId", it).commit()
      }
    }

    Function("hasActiveNetwork") {
      context.getSystemService(ConnectivityManager::class.java)?.activeNetwork != null
    }

    Function("getDeviceLanguageTags") {
      TranslatorInterfaceLanguage.deviceLanguageTags(TranslatorService.instance ?: context)
    }

    Function("setInterfaceLanguage") { language: String ->
      // Keep the preference write and the live service refresh ordered on the main thread.
      val app = context.applicationContext
      android.os.Handler(android.os.Looper.getMainLooper()).post {
        TranslatorInterfaceLanguage.set(app, language)
        TranslatorService.instance?.refreshInterfaceLanguage()
      }
      Unit
    }

    AsyncFunction("getDownloadedLanguagePacks") { promise: Promise ->
      OnDeviceTranslation.downloaded()
        .addOnSuccessListener { models -> promise.resolve(models.map { it.language }) }
        .addOnFailureListener { promise.reject("ERR_LANGUAGE_PACK", it.message, it) }
    }

    AsyncFunction("downloadLanguagePack") { language: String, promise: Promise ->
      OnDeviceTranslation.download(language)
        .addOnSuccessListener { promise.resolve(null) }
        .addOnFailureListener { promise.reject("ERR_LANGUAGE_PACK", it.message, it) }
    }

    AsyncFunction("deleteLanguagePack") { language: String, promise: Promise ->
      OnDeviceTranslation.delete(language)
        .addOnSuccessListener { promise.resolve(null) }
        .addOnFailureListener { promise.reject("ERR_LANGUAGE_PACK", it.message, it) }
    }

    AsyncFunction("prepareOfflineTranslation") { serverUrl: String, token: String, count: Int ->
      if (OfflineTranslationQuota.remaining(context, serverUrl, token) != 0) return@AsyncFunction true
      val (requestId, requestedCount) = OfflineTranslationQuota.pendingRequest(context, serverUrl, token, count)
      val started = android.os.SystemClock.elapsedRealtime()
      val connection = java.net.URL("${serverUrl.trim().trimEnd('/')}/api/basic-translation/offline").openConnection() as java.net.HttpURLConnection
      connection.requestMethod = "POST"
      connection.instanceFollowRedirects = false
      connection.connectTimeout = 10000
      connection.readTimeout = 10000
      connection.doOutput = true
      connection.setRequestProperty("Content-Type", "application/json")
      connection.setRequestProperty("Authorization", "Bearer $token")
      try {
        val body = org.json.JSONObject().put("requestId", requestId).put("count", requestedCount)
        connection.outputStream.use { it.write(body.toString().toByteArray(Charsets.UTF_8)) }
        val status = connection.responseCode
        if (status != 200) {
          val payload = connection.errorStream?.bufferedReader()?.use { it.readText() }.orEmpty()
          val code = runCatching { org.json.JSONObject(payload).optString("code") }.getOrNull()
          if (status == 429 && code == "DAILY_LIMIT") {
            OfflineTranslationQuota.finishRequest(context, serverUrl, token)
            return@AsyncFunction false
          }
          if (status == 401 || status == 403) OfflineTranslationQuota.clear(context, serverUrl, token)
          error("Cannot prepare offline translation: HTTP $status")
        }
        OfflineTranslationQuota.save(context, serverUrl, token, connection.inputStream.bufferedReader().use { it.readText() }, started)
        OfflineTranslationQuota.finishRequest(context, serverUrl, token)
        true
      } finally { connection.disconnect() }
    }

    AsyncFunction("getOfflineTranslationRemaining") { serverUrl: String, token: String ->
      OfflineTranslationQuota.remaining(context, serverUrl, token)
    }

    Function("clearOfflineTranslation") { serverUrl: String, token: String ->
      OfflineTranslationQuota.clear(context, serverUrl, token)
    }

    Function("canDrawOverlays") {
      Settings.canDrawOverlays(context)
    }

    Function("openOverlaySettings") {
      val intent = Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:${context.packageName}"))
      intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      context.startActivity(intent)
    }

    Function("isRunning") {
      TranslatorService.isRunning
    }

    AsyncFunction("start") { options: StartOptions, promise: Promise ->
      if (TranslatorService.isRunning) {
        promise.resolve(true)
        return@AsyncFunction
      }
      val activity = appContext.currentActivity ?: throw Exceptions.MissingActivity()
      val manager = context.getSystemService(Context.MEDIA_PROJECTION_SERVICE) as MediaProjectionManager

      pendingOptions = options
      pendingPromise = promise
      activity.startActivityForResult(manager.createScreenCaptureIntent(), REQUEST_CAPTURE)
    }

    Function("updateConfig") { options: StartOptions ->
      android.os.Handler(android.os.Looper.getMainLooper()).post {
        TranslatorService.instance?.updateConfig(options.mode, options.sourceLang, options.targetLang, options.model, options.token, options.allowAutomatic)
      }
    }

    Function("stop") {
      context.stopService(Intent(context, TranslatorService::class.java))
    }

    // Nguoi dung tra loi hop thoai "Bat dau ghi/chieu man hinh"
    OnActivityResult { _, payload ->
      if (payload.requestCode != REQUEST_CAPTURE) return@OnActivityResult

      val options = pendingOptions
      val promise = pendingPromise
      pendingOptions = null
      pendingPromise = null

      if (payload.resultCode != Activity.RESULT_OK || payload.data == null || options == null) {
        promise?.resolve(false)
        return@OnActivityResult
      }

      val intent = Intent(context, TranslatorService::class.java)
        .putExtra("resultCode", payload.resultCode)
        .putExtra("resultData", payload.data)
        .putExtra("serverUrl", options.serverUrl)
        .putExtra("token", options.token)
        .putExtra("sourceLang", options.sourceLang)
        .putExtra("targetLang", options.targetLang)
        .putExtra("accentColor", options.accentColor)
        .putExtra("model", options.model)
        .putExtra("mode", options.mode)
        .putExtra("allowAutomatic", options.allowAutomatic)
      ContextCompat.startForegroundService(context, intent)
      promise?.resolve(true)
    }
  }
}
