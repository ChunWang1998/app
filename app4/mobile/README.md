# Decibel Meter (app4/mobile)

Minimal on-device sound level estimate for Expo Go (SDK 57) and production native builds.

```bash
cd app4/mobile && npm install && npm start
```

Open in Expo Go. Grant the microphone when you tap Start.

## How the number is computed

`expo-audio` recorder metering is **dBFS** (about -160 silence to 0 near clipping), not A-weighted SPL.

```
display dB = clamp(dBFS + 100 + offset, 0, 140)
```

At offset 0, 0 dBFS maps to 100 dB. The calibration adjust is -20…+20 dB (step 1), saved locally with AsyncStorage. Smoothing and session max/avg run on the pre-offset base (`dBFS + 100`); the offset is applied only when rendering current / max / avg. Changing calibration mid-session remaps those numbers and does **not** reset the session. Avg is the arithmetic mean of the remapped smoothed values, not an energy average. Native -160 dBFS silence sentinels are ignored. The reading is an **estimate**, not a professional or legal-grade instrument.

Metering pauses when the app backgrounds. After Stop, the last **smoothed** reading stays frozen (it does not snap to the last raw sample); before the first usable sample after Start, the UI shows "—". Audio is processed on-device for the level reading only. `expo-audio` writes a short-lived cache file while metering; the app deletes `recorder.uri` (via `expo-file-system`) on stop, on unmount, and before the next start, and never saves, plays, exports, or sends it. If a delete fails, the URI is kept in a bounded in-memory retry list of 20 (oldest dropped; paths are not logged) and retried on the next stop/unmount/start cleanup. No account, network, analytics, waveform, spectrum, history, export, or IAP.

`expo-audio` also adds the Android `MODIFY_AUDIO_SETTINGS` permission (needed later for the Play Data safety / privacy label). It is not a microphone permission; it lets the OS session change things like silent-mode playback while recording.

## iOS measurement mode (native builds only)

`expo-audio` `setAudioModeAsync` configures `AVAudioSession` with **mode `.default`** (`AudioModule.setAudioMode` uses `setCategory(category, mode: .default)` when options are empty, or `setCategory(category, options:)` otherwise — a fresh session is still `.default`). That mode allows AGC and voice processing, which we do not want while metering.

The local Expo module `audio-measurement-session` (`modules/audio-measurement-session`) sets category `.playAndRecord` or `.record` and **mode `.measurement`**. JS calls it **after** `setAudioModeAsync` and **after** `recorder.record()` (and again after a foreground resume) so our mode wins. On Stop / unmount, `restoreSession` puts back the previous category/mode when possible and deactivates the session with `notifyOthersOnDeactivation` so other apps' audio can resume. Expo Go does not include the native code: the JS wrapper feature-detects with `requireOptionalNativeModule` / try-catch and no-ops. No crash path.

This has not been verified on a physical iPhone in this change; confirm on a development or production build.

## EAS

- `ios.bundleIdentifier` / `android.package`: `com.tinytoolshed.decibelmeter`
- `owner`: `leowang1105`; `extra.eas.projectId`: `117e579d-6aec-40ea-8e97-19bc314debcb`
- `ios.buildNumber`: `"1"`; `version`: `1.0.0`
- `eas.json` profiles: `development` (dev client), `preview` (iOS simulator), `production` (`autoIncrement: true`)
- Do not put Apple team IDs, ASC app IDs, or credential paths in the repo (`credentials.json` is gitignored). Do not run `eas build` / `eas submit` from this tree unless asked.

## Tests

```bash
npm test
```
