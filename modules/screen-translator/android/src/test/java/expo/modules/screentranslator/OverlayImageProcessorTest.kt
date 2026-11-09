package expo.modules.screentranslator

import android.graphics.Bitmap
import android.graphics.Color
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class OverlayImageProcessorTest {
  @Test fun largeImageSamplesAllEdgesAndInterior() {
    val image = Bitmap.createBitmap(1000, 4000, Bitmap.Config.ARGB_8888)
    image.eraseColor(Color.WHITE)
    for (y in 0 until 4000) image.setPixel(0, y, Color.RED)
    val blue = Color.rgb(20, 60, 180)
    for (y in 1000 until 3000) for (x in 300 until 700) image.setPixel(x, y, blue)
    val result = OverlayImageProcessor.prepare(image, false)
    assertEquals(Color.WHITE, result.backgroundColor)
    assertEquals(blue, result.textColor)
    result.bitmap.recycle()
    image.recycle()
  }

  @Test fun preservesOriginalTextColorAndSource() {
    val image = Bitmap.createBitmap(100, 40, Bitmap.Config.ARGB_8888)
    image.eraseColor(Color.WHITE)
    val blue = Color.rgb(20, 60, 180)
    for (y in 12..28) for (x in 20..80 step 4) image.setPixel(x, y, blue)
    val result = OverlayImageProcessor.prepare(image, false)
    assertEquals(Color.WHITE, result.backgroundColor)
    assertEquals(blue, result.textColor)
    assertEquals(blue, image.getPixel(20, 12))
    assertNotSame(image, result.bitmap)
    result.bitmap.recycle()
    assertFalse(image.isRecycled)
    image.recycle()
  }

  @Test fun ignoresMinorityEdgeOutlier() {
    val image = Bitmap.createBitmap(100, 40, Bitmap.Config.ARGB_8888)
    image.eraseColor(Color.WHITE)
    image.setPixel(0, 0, Color.RED)
    val result = OverlayImageProcessor.prepare(image, false)
    assertEquals(Color.WHITE, result.backgroundColor)
    assertEquals(Color.BLACK, result.textColor)
    result.bitmap.recycle()
    image.recycle()
  }

  @Test fun darkBackgroundUsesWhiteText() {
    val image = Bitmap.createBitmap(40, 40, Bitmap.Config.ARGB_8888)
    image.eraseColor(Color.BLACK)
    val result = OverlayImageProcessor.prepare(image, false)
    assertEquals(Color.WHITE, result.textColor)
    assertEquals(Color.BLACK, result.bitmap.getPixel(20, 20))
    result.bitmap.recycle()
    image.recycle()
  }

  @Test fun largeRegionFallsBackWithoutNativeInitialization() {
    val image = Bitmap.createBitmap(600, 500, Bitmap.Config.ARGB_8888)
    image.eraseColor(Color.WHITE)
    val result = OverlayImageProcessor.prepare(image)
    assertEquals(Color.WHITE, result.bitmap.getPixel(300, 250))
    assertFalse(image.isRecycled)
    result.bitmap.recycle()
    image.recycle()
  }

  @Test fun lowContrastTextFallsBackToBlack() {
    val image = Bitmap.createBitmap(40, 40, Bitmap.Config.ARGB_8888)
    image.eraseColor(Color.WHITE)
    for (y in 10..30) for (x in 10..30) image.setPixel(x, y, Color.rgb(230, 230, 230))
    val result = OverlayImageProcessor.prepare(image, false)
    assertEquals(Color.BLACK, result.textColor)
    assertEquals(40, result.bitmap.width)
    assertEquals(40, result.bitmap.height)
    result.bitmap.recycle()
    image.recycle()
  }
}
