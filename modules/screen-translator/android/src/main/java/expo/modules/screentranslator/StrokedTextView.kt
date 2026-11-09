package expo.modules.screentranslator

import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import androidx.appcompat.widget.AppCompatTextView

internal class StrokedTextView(context: Context) : AppCompatTextView(context) {
  var strokeColor: Int = Color.WHITE
  var strokeWidthPx: Float = 1f
  private var drawingStroke = false

  init {
    includeFontPadding = false
  }

  override fun invalidate() {
    if (!drawingStroke) super.invalidate()
  }

  override fun onDraw(canvas: Canvas) {
    val colors = textColors
    drawingStroke = true
    try {
      paint.style = Paint.Style.STROKE
      paint.strokeWidth = strokeWidthPx
      setTextColor(strokeColor)
      super.onDraw(canvas)
    } finally {
      paint.style = Paint.Style.FILL
      paint.strokeWidth = 0f
      setTextColor(colors)
      drawingStroke = false
    }
    super.onDraw(canvas)
  }
}
