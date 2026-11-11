# Translation Modes Implementation Plan

Goal: Game mode without history; Manga mode with session-only context.
Architecture: Android owns bounded context; backend receives snapshots and bypasses Mongo translation cache for Manga.
Tech Stack: Expo, Kotlin, Express, Node test, JUnit, Robolectric.
Spec: approved design and detailed seven-task plan in this conversation, 2026-11-11.

## Global Constraints
- Default game; modes game and manga.
- At most 3 turns and 6000 UTF-16 code units, source plus translation.
- RAM only; no context logs or persistence.
- Invalidate stale work on clear/configuration changes.
- No new dependencies, no unrelated formatting.

## Review Focus
- Stale callbacks after reset must not restore context.
- Duplicate OCR must not inflate history.
- Malformed or oversized context must fail before model calls.
- Chapter changes must not cause automatic resets.
- Manga duplicate texts retain position and count.

## Tasks
- [ ] Task 1: MangaContext with snapshots, deduplication, eviction and clear; JUnit RED then GREEN.
- [ ] Task 2: backend validation, Manga cache bypass and contextual prompt; Node RED then GREEN.
- [ ] Task 3: mode settings and native updateConfig bridge; configuration invalidation tests.
- [ ] Task 4: connect context snapshots and valid result commits to all translation paths.
- [ ] Task 5: Manga-only clear button, stale work invalidation and scrollable menu.
- [ ] Task 6: explicit title detection twice consecutively, nonblocking confirmation and dismissal memory.
- [ ] Task 7: HomePanel mode selector, integration tests, TypeScript and release builds.

Each task: failing behavioral tests, minimal implementation, passing suite, scoped commit.
Verification: server npm test; mobile npm test and npx tsc --noEmit; Android :screen-translator:testDebugUnitTest, :screen-translator:assembleRelease, :app:assembleRelease.
Final: fresh whole-change review; physical Android 15 checks if a device is available.
