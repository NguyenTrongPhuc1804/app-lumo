package expo.modules.screentranslator

import android.graphics.Bitmap
import android.graphics.Color
import android.util.Log
import org.opencv.android.OpenCVLoader
import org.opencv.android.Utils
import org.opencv.core.Core
import org.opencv.core.Mat
import org.opencv.core.Size
import org.opencv.imgproc.Imgproc
import org.opencv.photo.Photo
import kotlin.math.abs
import kotlin.math.max
import kotlin.math.min

internal data class OverlayPatch(val bitmap: Bitmap, val textColor: Int, val backgroundColor: Int)

internal object OverlayImageProcessor {
  private val openCvReady by lazy {
    try { OpenCVLoader.initLocal() } catch (e: LinkageError) {
      Log.w("LumoOverlay", "OpenCV unavailable", e)
      false
    } catch (e: Exception) {
      Log.w("LumoOverlay", "OpenCV init failed", e)
      false
    }
  }

  private fun brightness(color: Int): Double =
    0.299 * Color.red(color) + 0.587 * Color.green(color) + 0.114 * Color.blue(color)

  private fun dominantColor(colors: List<Int>): Int {
    if (colors.isEmpty()) return Color.WHITE
    // Nhom mau gan nhau de pixel khu rang cua khong lan at mau nen/chu that.
    val groups = HashMap<Int, LongArray>()
    for (color in colors) {
      val r = Color.red(color)
      val g = Color.green(color)
      val b = Color.blue(color)
      val key = ((r / 16) shl 8) or ((g / 16) shl 4) or (b / 16)
      val group = groups.getOrPut(key) { LongArray(4) }
      group[0]++
      group[1] += r.toLong()
      group[2] += g.toLong()
      group[3] += b.toLong()
    }
    val group = groups.values.maxByOrNull { it[0] }!!
    return Color.rgb((group[1] / group[0]).toInt(), (group[2] / group[0]).toInt(), (group[3] / group[0]).toInt())
  }

  private fun buildBackground(source: Bitmap, background: Int, useOpenCv: Boolean): Bitmap {
    val output = Bitmap.createBitmap(source.width, source.height, Bitmap.Config.ARGB_8888)
    // Fallback an toan khi thieu native lib, o qua lon hoac mask khong dang tin.
    output.eraseColor(background)
    if (!useOpenCv || source.width.toLong() * source.height > 240000 || !openCvReady) return output
    val rgba = Mat()
    val rgb = Mat()
    val gray = Mat()
    val mask = Mat()
    val restored = Mat()
    val result = Mat()
    var kernel: Mat? = null
    try {
      Utils.bitmapToMat(source, rgba)
      Imgproc.cvtColor(rgba, rgb, Imgproc.COLOR_RGBA2RGB)
      Imgproc.cvtColor(rgb, gray, Imgproc.COLOR_RGB2GRAY)
      val threshold = if (brightness(background) > 128) Imgproc.THRESH_BINARY_INV else Imgproc.THRESH_BINARY
      Imgproc.threshold(gray, mask, 0.0, 255.0, threshold or Imgproc.THRESH_OTSU)
      val size = max(1, min(7, min(source.width, source.height) / 12))
      kernel = Imgproc.getStructuringElement(Imgproc.MORPH_ELLIPSE, Size(size.toDouble(), size.toDouble()))
      Imgproc.dilate(mask, mask, kernel)
      val fraction = Core.countNonZero(mask).toDouble() / (source.width * source.height)
      if (fraction > 0.0 && fraction < 0.65) {
        Photo.inpaint(rgb, mask, restored, 3.0, Photo.INPAINT_TELEA)
        Imgproc.cvtColor(restored, result, Imgproc.COLOR_RGB2RGBA)
        Utils.matToBitmap(result, output)
      }
    } catch (e: Exception) {
      Log.w("LumoOverlay", "Inpaint failed; using edge color", e)
    } catch (e: LinkageError) {
      Log.w("LumoOverlay", "Native inpaint unavailable", e)
    } finally {
      kernel?.release()
      result.release()
      restored.release()
      mask.release()
      gray.release()
      rgb.release()
      rgba.release()
    }
    return output
  }

  fun prepare(source: Bitmap, useOpenCv: Boolean = true): OverlayPatch {
    val width = source.width
    val height = source.height
    val pixels = IntArray(width * height)
    source.getPixels(pixels, 0, width, 0, 0, width, height)
    val edge = max(1, min(width, height) / 10)
    val backgroundSamples = ArrayList<Int>()
    val textSamples = ArrayList<Int>()
    // Luoi 2 chieu khong bi trung chu ky voi chieu rong nhu stride tren mang phang.
    // Lay rieng ca bon canh, ke ca canh phai/duoi khi kich thuoc khong chia het.
    val xSteps = min(width - 1, 63).coerceAtLeast(1)
    val ySteps = min(height - 1, 63).coerceAtLeast(1)
    for (sample in 0..xSteps) {
      val x = sample * (width - 1) / xSteps
      backgroundSamples.add(pixels[x])
      backgroundSamples.add(pixels[(height - 1) * width + x])
    }
    for (sample in 0..ySteps) {
      val y = sample * (height - 1) / ySteps
      backgroundSamples.add(pixels[y * width])
      backgroundSamples.add(pixels[y * width + width - 1])
    }
    val background = dominantColor(backgroundSamples)
    for (sy in 0..ySteps) for (sx in 0..xSteps) {
      val x = sx * (width - 1) / xSteps
      val y = sy * (height - 1) / ySteps
      val color = pixels[y * width + x]
      if (x >= edge && x < width - edge && y >= edge && y < height - edge &&
        abs(brightness(color) - brightness(background)) >= 50) textSamples.add(color)
    }
    val text = if (textSamples.isEmpty()) {
      if (brightness(background) > 128) Color.BLACK else Color.WHITE
    } else dominantColor(textSamples)
    return OverlayPatch(buildBackground(source, background, useOpenCv), text, background)
  }
}
