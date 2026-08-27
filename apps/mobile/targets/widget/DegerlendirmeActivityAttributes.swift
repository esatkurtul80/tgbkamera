import ActivityKit

// NOT: Bu dosya, Live Activity'yi başlatan ana uygulama hedefinde de
// AYNEN (satır satır) bulunmalı — bkz. modules/live-activity/ios/DegerlendirmeActivityAttributes.swift.
// ActivityKit, App ve Widget Extension'ın farklı derleme birimlerinde aynı
// isim + şekle sahip bir struct'a ihtiyaç duyar; Apple'ın kendi örnekleri de
// bu dosyayı iki hedefe birden eklemeyi önerir.
struct DegerlendirmeActivityAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        var personelAd: String
        var magazaAd: String
        var puanMetni: String
    }
}
