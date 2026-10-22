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

 On stop, `restoreSession` puts back the previous category/mode when we have
 a snapshot, then `setActive(false, .notifyOthersOnDeactivation)` so other
 apps' audio can resume. Every path returns a Bool — nothing is thrown.
 */
public class AudioMeasurementSessionModule: Module {
  private var previousCategory: AVAudioSession.Category?
  private var previousMode: AVAudioSession.Mode?
  private var previousOptions: AVAudioSession.CategoryOptions?

  public func definition() -> ModuleDefinition {
    Name("AudioMeasurementSession")

    AsyncFunction("enableMeasurementMode") { () -> Bool in
      let session = AVAudioSession.sharedInstance()
      if self.previousCategory == nil {
        self.previousCategory = session.category
        self.previousMode = session.mode
        self.previousOptions = session.categoryOptions
      }
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

    AsyncFunction("restoreSession") { () -> Bool in
      let session = AVAudioSession.sharedInstance()
      if let category = self.previousCategory, let mode = self.previousMode {
        do {
          try session.setCategory(category, mode: mode, options: self.previousOptions ?? [])
        } catch {
          // still deactivate below so other apps can resume
        }
      }
      self.previousCategory = nil
      self.previousMode = nil
      self.previousOptions = nil
      do {
        try session.setActive(false, options: .notifyOthersOnDeactivation)
        return true
      } catch {
        return false
      }
    }
  }
}
