package expo.modules.screentranslator

import android.widget.TextView
import org.junit.Assert.assertEquals
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class ScreenOverlayLayoutTest {
  @Test fun screenshotContentCompensatesForWindowOrigin() {
    val root = ScreenOverlayLayout(RuntimeEnvironment.getApplication())
    val text = TextView(root.context)
    root.screenContent.addView(text, android.widget.FrameLayout.LayoutParams(100, 40).apply {
      leftMargin = 80
      topMargin = 120
    })
    root.measure(
      android.view.View.MeasureSpec.makeMeasureSpec(1080, android.view.View.MeasureSpec.EXACTLY),
      android.view.View.MeasureSpec.makeMeasureSpec(1920, android.view.View.MeasureSpec.EXACTLY)
    )
    root.layout(12, 24, 1092, 1944)
    val origin = IntArray(2)
    root.getLocationOnScreen(origin)
    assertEquals(-origin[0].toFloat(), root.screenContent.translationX, 0f)
    assertEquals(-origin[1].toFloat(), root.screenContent.translationY, 0f)
    assertEquals(120, text.top)

    // Khi status bar an hoac cua so doi vi tri, khong giu lai offset cu.
    root.layout(0, 0, 1080, 1920)
    root.getLocationOnScreen(origin)
    assertEquals(-origin[0].toFloat(), root.screenContent.translationX, 0f)
    assertEquals(-origin[1].toFloat(), root.screenContent.translationY, 0f)
  }
}
