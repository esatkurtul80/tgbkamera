import ActivityKit

// NOT: Bu dosya targets/widget/DegerlendirmeActivityAttributes.swift ile
// AYNEN (satır satır) eşleşmeli. ActivityKit, App ve Widget Extension
// hedeflerinin her biri için bu struct'ı ayrı ayrı derler; ikisi arasında
// tip uyuşmazlığı olursa Live Activity başlatılamaz veya widget'ta
// içerik görünmez.
struct DegerlendirmeActivityAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        var personelAd: String
        var magazaAd: String
        var puanMetni: String
    }
}
