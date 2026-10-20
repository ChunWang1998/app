import ExpoModulesCore
import Speech

#if canImport(FoundationModels)
import FoundationModels
#endif

/**
 On-device Apple Foundation Models. Deployment target stays iOS 17.
 All FoundationModels calls are behind `if #available(iOS 26, *)`
 and use SystemLanguageModel.default only.
 */
public class AppleFoundationModelsModule: Module {
  public func definition() -> ModuleDefinition {
    Name("AppleFoundationModels")

    AsyncFunction("getAvailability") { (locale: String) -> [String: String] in
      #if canImport(FoundationModels)
      if #available(iOS 26, *) {
        return Self.availability(locale: locale)
      }
      #endif
      return ["status": "unavailable", "reason": "os"]
    }

    AsyncFunction("parseIntent") { (text: String, locale: String) -> [String: Any] in
      #if canImport(FoundationModels)
      if #available(iOS 26, *) {
        return await Self.parse(text: text, locale: locale)
      }
      #endif
      return ["ok": false, "reason": "unavailable"]
    }

    Function("supportsOnDeviceSpeech") { (locale: String) -> Bool in
      let tag = Self.mappedLocale(locale)
      guard let recognizer = SFSpeechRecognizer(locale: Locale(identifier: tag)) else {
        return false
      }
      return recognizer.isAvailable && recognizer.supportsOnDeviceRecognition
    }
  }

  #if canImport(FoundationModels)
  @available(iOS 26, *)
  static func availability(locale: String) -> [String: String] {
    let model = SystemLanguageModel.default
    switch model.availability {
    case .available:
      let loc = Locale(identifier: mappedLocale(locale))
      if model.supportsLocale(loc) {
        return ["status": "available"]
      }
      return ["status": "unavailable", "reason": "locale"]
    case .unavailable(let reason):
      return ["status": "unavailable", "reason": String(describing: reason)]
    @unknown default:
      return ["status": "unavailable", "reason": "unknown"]
    }
  }

  @available(iOS 26, *)
  static func parse(text: String, locale: String) async -> [String: Any] {
    let model = SystemLanguageModel.default
    switch model.availability {
    case .available:
      break
    default:
      return ["ok": false, "reason": "unavailable"]
    }
    let loc = Locale(identifier: mappedLocale(locale))
    if !model.supportsLocale(loc) {
      return ["ok": false, "reason": "locale"]
    }

    let session = LanguageModelSession(instructions: """
      Extract a habit-tracker intent from the user. On-device only.
      kind is one of: create, query_since, query_week, query_today, log, unknown.
      name is the item title only — no cadence or date words.
      lastDonePhrase and reminderPhrase are copied as spoken; do not convert them to dates or numbers.
      """)
    do {
      let response = try await session.respond(to: text, generating: TrackerIntent.self)
      let c = response.content
      return [
        "ok": true,
        "kind": c.kind,
        "name": c.name ?? "",
        "lastDonePhrase": c.lastDonePhrase ?? "",
        "reminderPhrase": c.reminderPhrase ?? "",
      ]
    } catch {
      let s = String(describing: error)
      if s.localizedCaseInsensitiveContains("guardrail") { return ["ok": false, "reason": "guardrail"] }
      if s.localizedCaseInsensitiveContains("context") { return ["ok": false, "reason": "context"] }
      return ["ok": false, "reason": "error"]
    }
  }
  #endif

  static func mappedLocale(_ locale: String) -> String {
    let tag = locale.trimmingCharacters(in: .whitespacesAndNewlines)
    if tag == "zh-Hant" || tag.lowercased().hasPrefix("zh") { return "zh-TW" }
    if tag.lowercased().hasPrefix("ja") { return "ja-JP" }
    if tag.lowercased().hasPrefix("de") { return "de-DE" }
    if tag.lowercased().hasPrefix("fr") { return "fr-FR" }
    if tag.lowercased().hasPrefix("en") { return "en-US" }
    return tag.isEmpty ? "en-US" : tag
  }
}

#if canImport(FoundationModels)
@available(iOS 26, *)
@Generable
struct TrackerIntent {
  @Guide(description: "One of: create, query_since, query_week, query_today, log, unknown")
  var kind: String
  @Guide(description: "Item name only, no dates or cadence")
  var name: String?
  @Guide(description: "Last-done phrase as spoken, or empty")
  var lastDonePhrase: String?
  @Guide(description: "Reminder cadence phrase as spoken, or empty")
  var reminderPhrase: String?
}
#endif
