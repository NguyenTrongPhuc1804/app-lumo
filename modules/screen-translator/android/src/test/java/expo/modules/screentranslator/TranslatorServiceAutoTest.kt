package expo.modules.screentranslator

import android.view.MotionEvent
import android.view.WindowManager
import android.widget.LinearLayout
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.Robolectric
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class TranslatorServiceAutoTest {
  private fun service(): TranslatorService {
    val service = Robolectric.buildService(TranslatorService::class.java).create().get()
    val field = TranslatorService::class.java.getDeclaredField("windowManager")
    field.isAccessible = true
    field.set(service, service.getSystemService("window"))
    TranslatorService::class.java.getDeclaredMethod("showWidget").apply { isAccessible = true }.invoke(service)
    return service
  }

  @Test fun floatingWidgetObservesOutsideTouchesWithoutMakingWindowTouchModal() {
    val service = service()
    val field = TranslatorService::class.java.getDeclaredField("widgetParams").apply { isAccessible = true }
    val params = field.get(service) as WindowManager.LayoutParams
    assertTrue(params.flags and WindowManager.LayoutParams.FLAG_WATCH_OUTSIDE_TOUCH != 0)
    assertTrue(params.flags and WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL != 0)
    service.onDestroy()
  }

  @Test fun outsideTouchInvalidatesCurrentAutoResultAndStopIsIdempotent() {
    val service = service()
    val stateField = TranslatorService::class.java.getDeclaredField("autoState").apply { isAccessible = true }
    val state = stateField.get(service) as AutoTranslationState
    state.start()
    val old = state.generation
    val widgetField = TranslatorService::class.java.getDeclaredField("widget").apply { isAccessible = true }
    val widget = widgetField.get(service) as LinearLayout
    val event = MotionEvent.obtain(0, 0, MotionEvent.ACTION_OUTSIDE, 100f, 100f, 0)
    widget.dispatchTouchEvent(event)
    event.recycle()
    assertFalse(state.isCurrent(old))
    val stop = TranslatorService::class.java.getDeclaredMethod("stopAuto").apply { isAccessible = true }
    stop.invoke(service)
    stop.invoke(service)
    assertFalse(state.enabled)
    service.onDestroy()
  }

  @Test fun rotationInvalidatesPendingAutoWork() {
    val service = service()
    val field = TranslatorService::class.java.getDeclaredField("autoState").apply { isAccessible = true }
    val state = field.get(service) as AutoTranslationState
    state.start()
    val old = state.generation
    service.onConfigurationChanged(android.content.res.Configuration())
    assertFalse(state.isCurrent(old))
    service.onDestroy()
  }

  @Test fun automaticOverlayOpacityAllowsCrossUidTouchButManualKeepsOpacity() {
    val service = service()
    val field = TranslatorService::class.java.getDeclaredField("autoState").apply { isAccessible = true }
    val state = field.get(service) as AutoTranslationState
    val draw = TranslatorService::class.java.getDeclaredMethod("drawOverlay", List::class.java, List::class.java, List::class.java, List::class.java).apply { isAccessible = true }
    state.start()
    draw.invoke(service, emptyList<android.graphics.Rect>(), emptyList<String>(), emptyList<Int>(), emptyList<OverlayPatch>())
    val overlay = TranslatorService::class.java.getDeclaredField("overlay").apply { isAccessible = true }.get(service) as android.view.View
    assertTrue((overlay.layoutParams as WindowManager.LayoutParams).alpha <= 0.8f)
    assertTrue((overlay.layoutParams as WindowManager.LayoutParams).flags and WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE != 0)
    state.stop()
    draw.invoke(service, emptyList<android.graphics.Rect>(), emptyList<String>(), emptyList<Int>(), emptyList<OverlayPatch>())
    val manual = TranslatorService::class.java.getDeclaredField("overlay").apply { isAccessible = true }.get(service) as android.view.View
    assertEquals(1f, (manual.layoutParams as WindowManager.LayoutParams).alpha)
    service.onDestroy()
  }

  @Test fun destructionBeforeRecognizerInitializationDoesNotCrash() {
    service().onDestroy()
  }
}
