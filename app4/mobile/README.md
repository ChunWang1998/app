# Decibel Meter (app4/mobile)

Minimal on-device sound level estimate for Expo Go (SDK 57).

```bash
cd app4/mobile && npm install && npm start
```

Open in Expo Go. Grant the microphone when you tap Start.

## How the number is computed

`expo-audio` recorder metering is **dBFS** (about -160 silence to 0 near clipping), not A-weighted SPL.

```
display dB = clamp(dBFS + 100 + offset, 0, 140)
```

At offset 0, 0 dBFS maps to 100 dB. Offset is -20…+20 dB (step 1), saved locally with AsyncStorage. The reading is an **estimate**, not a professional or legal-grade instrument.

Metering pauses when the app backgrounds. Audio is processed on-device for the level reading only. `expo-audio` writes a short-lived cache file while metering; the app deletes `recorder.uri` (via `expo-file-system`) on stop, on unmount, and before the next start, and never reads, plays, exports, or sends it. No account, network, analytics, waveform, spectrum, history, export, or IAP.

`expo-audio` also adds the Android `MODIFY_AUDIO_SETTINGS` permission (needed later for the Play Data safety / privacy label). It is not a microphone permission; it lets the OS session change things like silent-mode playback while recording.

## Placeholders

`ios.bundleIdentifier` / `android.package` are `com.example.decibelmeter`. `extra.eas.projectId` is `00000000-0000-0000-0000-000000000000`. Do not treat these as real store or EAS ids. No EAS build/submit from this app yet.

## Tests

```bash
npm test
```
