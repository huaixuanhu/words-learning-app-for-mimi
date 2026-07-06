# Words Learning App For Mimi Stage 7.5: Soft Click Sound Trial

Source plan: `plan_docs/PLAN_V1_MASTER.md`
Derived from: `plan_docs/PLAN_V1_STAGE7_UI_VISUAL_DESIGN.md`, `plan_docs/PLAN_V1_STAGE7_2_UI_REFINEMENT.md`, `plan_docs/PLAN_V1_STAGE7_3_CHILLROUND_FONT_TRIAL.md`, `plan_docs/PLAN_V1_STAGE7_4_THEME_TOGGLE.md`, and the user request to choose one very short, muted click sound for audition.
Scope: add one local CC0 click sound asset, expose a low-volume audition control in Settings, and keep the implementation as a Stage 7 UI（用户界面）feedback trial.
Non-Scope: no global audio-on-by-default behavior, no review scheduler change, no import parser change, no vocabulary schema change, no JSON backup schema change, no Postgres data model change, no Vercel command, no Neon command, no Production（生产环境）deployment, no Production data mutation, no external vocabulary source, no PTE / IELTS toggle implementation, no PWA（Progressive Web App，渐进式 Web 应用）implementation, no notification or background audio.
Exit criteria: one chosen muted click sound is stored locally with license provenance, `/settings` provides a clear audition control, playback volume is intentionally low, local validation passes, and docs record that the sound is UI-only rather than study data.

Superseded by: `plan_docs/PLAN_V1_STAGE7_6_SOUND_DESIGN.md` for app-wide button feedback, Settings sound toggles, and review-completion sound behavior. This Stage 7.5 document remains the source record for the accepted soft-click trial and Kenney CC0 fallback asset provenance.

## Design Decision

Sound source:

- Prefer Kenney Interface Sounds because the official asset page and OpenGameArt mirror list it as Creative Commons CC0.
- Store only the chosen sound, not the full pack.
- Keep the upstream license / provenance note with the local asset.

Sound direction:

- Prefer a very short, dull / muted click.
- Avoid bright glass, sharp tick, high-pitched confirmation, and long notification sounds.
- Keep playback volume quiet enough that it feels like tactile feedback rather than a foreground feature.

Interaction boundary:

- Stage 7.5 only adds a Settings audition control so the user can listen and decide.
- A later step can wire this into broader button feedback after the user accepts the sound.

## Implementation Plan

1. Verify current source and license from Kenney / OpenGameArt.
2. Download the Kenney Interface Sounds package to a temporary local directory.
3. Compare short `click`, `select`, or `switch` candidates and choose the least sharp muted click.
4. Copy one chosen OGG（Ogg Vorbis 音频格式）asset into `public/sounds/`.
5. Add a small client Settings component that plays the asset at low volume.
6. Sync parent docs, changelog, architecture, README, AGENTS, and AI agent log.

## Validation Plan

```bash
npm run lint
npm run typecheck
npm run test
npm run build
git diff --check
npm run governance:preflight
```

Manual / browser validation:

- Open `/settings`.
- Click the audition control after a user gesture.
- Confirm the browser attempts to play the local OGG asset without console errors.
- Confirm no storage, backup, or API data is changed.

## Implementation Record

Status: executed locally on 2026-07-06 20:46 AEST.

Source verification:

- Kenney official Interface Sounds page lists the asset as Creative Commons CC0.
- OpenGameArt's Kenney mirror lists the asset license as CC0, includes 100 separate OGG files, and says credit is not mandatory.
- The downloaded package includes `License.txt`, which states Creative Commons Zero / CC0 and free use in personal, educational, and commercial projects.

Chosen sound:

- Selected `click_001.ogg` from the Kenney Interface Sounds package.
- Reason: it is still a short click, but at about 0.10 seconds it is less needle-like than `click_002` to `click_005`, which are about 0.01 seconds and more likely to feel sharp.
- Added the original OGG（Ogg Vorbis 音频格式）as `public/sounds/mimi-soft-click.ogg`.
- Added a derived M4A（MPEG-4 音频格式）as `public/sounds/mimi-soft-click.m4a` for better mobile browser compatibility.
- Added the package license note as `public/sounds/KENNEY_INTERFACE_SOUNDS_CC0.txt`.

Changed implementation:

- Added `src/components/settings/sound-preview-card.tsx`.
- Added a Settings `Sound` panel that exposes only a `试听` preview button.
- Preview playback now triggers on pointer down and uses Web Audio API（网页音频接口）to generate a short muted click immediately, with:
  - lower-amplitude low-pass filtered noise and a short low-frequency sine tone
  - gain / volume: `0.162`
  - low-pass filter frequency: `320 Hz`
  - sine tone glide: `118 Hz` to `68 Hz`
  - duration: `0.18` seconds
  - audio-file playback kept only as a no-Web-Audio / error fallback, not as a normal layered sound
  - a short playback timeout so the audition button never stays stuck in loading state
- The sound is not attached to global buttons yet.

Validation completed:

- Passed: `npm run lint`.
- Passed: `npm run typecheck`.
- Passed: browser check for `/settings`: Sound panel and `试听` button render, clicking the button updates status to `Played softly.`, the button does not enter a stuck loading state, no horizontal overflow, and no new warning / error console logs.
- Passed: `npm run test` with 13 files and 48 tests.
- Passed: `npm run build`.
- Passed: `git diff --check`.
- Passed: `npm run governance:preflight`.

Safety notes:

- Local UI, static audio asset, and documentation changes only.
- No vocabulary data mutation, review scheduler change, import parser change, JSON backup schema change, CSV export change, Postgres table change, API payload change, Vercel command, Neon command, env var read/change, Production（生产环境）deployment, Production migration, Production import, global button sound behavior, notification, background audio, authentication（认证）, analytics（分析追踪）, AI generation, external vocabulary source, PTE / IELTS toggle implementation, PWA implementation, email, or 付费/扣款 feature was performed.
