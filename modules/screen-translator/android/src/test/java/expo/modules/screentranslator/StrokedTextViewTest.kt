package expo.modules.screentranslator

import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class StrokedTextViewTest {
  @Test fun drawingRestoresTextColorAndPaintStyle() {
    val context = RuntimeEnvironment.getApplication()
    val view = StrokedTextView(context)
    view.text = "Translation"
    view.setTextColor(Color.BLUE)
    view.strokeColor = Color.WHITE
    view.strokeWidthPx = 2f
    view.layout(0, 0, 160, 40)
    val bitmap = Bitmap.createBitmap(160, 40, Bitmap.Config.ARGB_8888)
    view.draw(Canvas(bitmap))
    assertEquals(Color.BLUE, view.currentTextColor)
    assertEquals(android.graphics.Paint.Style.FILL, view.paint.style)
    assertEquals(0f, view.paint.strokeWidth, 0f)
    assertFalse(view.includeFontPadding)
    bitmap.recycle()
  }
}
