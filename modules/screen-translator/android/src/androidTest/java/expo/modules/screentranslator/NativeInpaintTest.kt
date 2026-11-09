package expo.modules.screentranslator

import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import org.opencv.android.OpenCVLoader

@RunWith(AndroidJUnit4::class)
class NativeInpaintTest {
  @Test fun teleaRestoresLightAndDarkGradientWithoutChangingSource() {
    assertTrue("OpenCV native must load", OpenCVLoader.initLocal())
    for (dark in listOf(false, true)) {
      val image = Bitmap.createBitmap(320, 100, Bitmap.Config.ARGB_8888)
      for (x in 0 until 320) {
        val shade = (if (dark) 20 else 205) + x * 30 / 320
        for (y in 0 until 100) image.setPixel(x, y, Color.rgb(shade, shade, shade))
      }
      val clean = image.copy(Bitmap.Config.ARGB_8888, false)
      val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = if (dark) Color.WHITE else Color.BLACK
        textSize = 32f
      }
      Canvas(image).drawText("HELLO WORLD", 30f, 62f, paint)
      val original = image.copy(Bitmap.Config.ARGB_8888, false)
      val patch = OverlayImageProcessor.prepare(image)
      val fallback = OverlayImageProcessor.prepare(image, false)
      assertFalse("Native result must not be flat fallback", patch.bitmap.sameAs(fallback.bitmap))
      assertTrue("Source must stay unchanged", image.sameAs(original))
      var before = 0L
      var after = 0L
      for (y in 20 until 75) for (x in 25 until 290) {
        val expected = Color.red(clean.getPixel(x, y))
        before += kotlin.math.abs(Color.red(image.getPixel(x, y)) - expected)
        after += kotlin.math.abs(Color.red(patch.bitmap.getPixel(x, y)) - expected)
      }
      assertTrue("Inpaint must remove text: before=$before after=$after dark=$dark", after < before / 3)
      patch.bitmap.recycle()
      fallback.bitmap.recycle()
      original.recycle()
      clean.recycle()
      image.recycle()
    }
  }
}
