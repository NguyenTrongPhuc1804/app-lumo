package expo.modules.screentranslator

import android.content.Context
import android.widget.FrameLayout

// OCR dung toa do anh chup toan man hinh; cua so overlay co the bat dau duoi status bar.
class ScreenOverlayLayout(context: Context) : FrameLayout(context) {
  val screenContent = FrameLayout(context)
  private val screenOrigin = IntArray(2)

  init {
    clipChildren = false
    clipToPadding = false
    addView(screenContent, LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT))
  }

  override fun onLayout(changed: Boolean, left: Int, top: Int, right: Int, bottom: Int) {
    super.onLayout(changed, left, top, right, bottom)
    getLocationOnScreen(screenOrigin)
    screenContent.translationX = -screenOrigin[0].toFloat()
    screenContent.translationY = -screenOrigin[1].toFloat()
  }
}
