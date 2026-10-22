import AVFoundation
import ExpoModulesCore

/**
 Sets AVAudioSession to measurement mode so AGC and voice processing stay off
 while the decibel meter is running.

 expo-audio `setAudioModeAsync` either calls
 `setCategory(category, mode: .default)` (empty options) or
 `setCategory(category, options:)` (non-empty options, mode unchanged / still
 `.default` on a fresh session). JS must call `enableMeasurementMode` *after*
 that, typically right after `recorder.record()`, so this mode wins.
 */
public class AudioMeasurementSessionModule: Module {
  public func definition() -> ModuleDefinition {
    Name("AudioMeasurementSession")

    AsyncFunction("enableMeasurementMode") { () -> Bool in
      let session = AVAudioSession.sharedInstance()
      let category: AVAudioSession.Category = {
        switch session.category {
        case .playAndRecord, .record:
          return session.category
        default:
          return .playAndRecord
        }
      }()
      do {
        try session.setCategory(category, mode: .measurement, options: session.categoryOptions)
        try session.setActive(true)
        return session.mode == .measurement
      } catch {
        return false
      }
    }
  }
}
