package expo.modules.screentranslator

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.media.projection.MediaProjectionManager
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
  @Field val appKey: String = ""
  @Field val sourceLang: String = "en"
  @Field val targetLang: String = "vi"
  @Field val accentColor: String = "#14B8A6"
  @Field val model: String = ""
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
        .putExtra("appKey", options.appKey)
        .putExtra("sourceLang", options.sourceLang)
        .putExtra("targetLang", options.targetLang)
        .putExtra("accentColor", options.accentColor)
        .putExtra("model", options.model)
      ContextCompat.startForegroundService(context, intent)
      promise?.resolve(true)
    }
  }
}
