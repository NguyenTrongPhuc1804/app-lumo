# Auto Translation Gaminik-Like Implementation Plan

Goal: Hide stale translations on outside touch, debounce for 800 ms, translate a stable frame once, and reject obsolete asynchronous results.

Architecture: Keep capture and networking in TranslatorService. Use a small Kotlin AutoTranslationState for generations, pending interaction and completed content keys. Observe ACTION_OUTSIDE through the existing floating widget. Keep automatic result windows non-touchable.

Spec: User-approved plan in this conversation, based on static inspection of Gaminik 5.3.2 build 828. ACTION_OUTSIDE is not ACTION_UP; do not claim exact finger release detection.

Constraints: No AccessibilityService or new permission. No periodic OCR while idle. One request at a time. Preserve manual translation. No formatter. Android 15 touch passthrough requires physical-device verification.

Review focus: stop/restart with old callbacks; touch during server request; duplicate text after failed request; rotation during capture; bitmap ownership during cancellation.

- [ ] Task 1: Add AutoTranslationState and unit tests for generations, coalescing and successful content keys.
- [ ] Task 2: Add generation guards to capture, OCR, network result, completion and cleanup.
- [ ] Task 3: Replace autoTick with debounced interaction and bounded stable-frame sampling; wire outside touch through widget.
- [ ] Task 4: Verify cleanup and manual modes, run native tests and APK compilation where tools are available.
- [ ] Task 5: Fresh-context review and fix important findings; report device-only limitations.

Verification: npm test; native module testDebugUnitTest and assembleRelease after Expo prebuild if Android build prerequisites are available. Do not claim native tests passed without actual output.
