package expo.modules.screentranslator

// Main-thread state only. Never use auto-mode flags from a network worker.
internal class AutoTranslationState {
  var generation = 0L
    private set
  var enabled = false
    private set
  private var pending = false
  private var completedKey: String? = null

  fun start() {
    generation++
    enabled = true
    pending = true
    completedKey = null
  }

  fun stop() {
    generation++
    enabled = false
    pending = false
    completedKey = null
  }

  fun interact() {
    if (!enabled) return
    generation++
    pending = true
  }

  fun takePending(): Boolean {
    if (!enabled || !pending) return false
    pending = false
    return true
  }

  fun isCurrent(value: Long): Boolean = enabled && generation == value

  fun shouldTranslate(key: String): Boolean = key != completedKey

  fun commit(value: Long, key: String) {
    if (isCurrent(value)) completedKey = key
  }
}
