import ExpoModulesCore
import ActivityKit

public class LiveActivityModule: Module {
  public func definition() -> ModuleDefinition {
    Name("LiveActivity")

    Function("isSupported") { () -> Bool in
      guard #available(iOS 16.2, *) else { return false }
      return ActivityAuthorizationInfo().areActivitiesEnabled
    }

    // Kısa süreli bir tamamlanma bildirimi başlatır ve `durationSeconds`
    // sonra kendini otomatik kapatır (kullanıcı manuel kapatmaz).
    Function("startCompletionActivity") { (personelAd: String, magazaAd: String, puanMetni: String, durationSeconds: Double) in
      guard #available(iOS 16.2, *) else { return }
      guard ActivityAuthorizationInfo().areActivitiesEnabled else { return }

      let state = DegerlendirmeActivityAttributes.ContentState(
        personelAd: personelAd,
        magazaAd: magazaAd,
        puanMetni: puanMetni
      )
      let content = ActivityContent(state: state, staleDate: nil)

      do {
        let activity = try Activity<DegerlendirmeActivityAttributes>.request(
          attributes: DegerlendirmeActivityAttributes(),
          content: content
        )
        Task {
          try? await Task.sleep(nanoseconds: UInt64(max(durationSeconds, 1) * 1_000_000_000))
          await activity.end(nil, dismissalPolicy: .immediate)
        }
      } catch {
        print("[LiveActivity] başlatılamadı: \(error)")
      }
    }
  }
}
