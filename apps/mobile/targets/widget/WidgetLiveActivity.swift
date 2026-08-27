import ActivityKit
import WidgetKit
import SwiftUI

struct WidgetLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: DegerlendirmeActivityAttributes.self) { context in
            // Kilit ekranı / banner UI
            HStack(spacing: 12) {
                Image(systemName: "checkmark.circle.fill")
                    .font(.system(size: 28))
                    .foregroundStyle(.green)
                VStack(alignment: .leading, spacing: 2) {
                    Text("Değerlendirme Tamamlandı")
                        .font(.subheadline).bold()
                    Text("\(context.state.personelAd) · \(context.state.magazaAd)")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                Spacer()
                if !context.state.puanMetni.isEmpty {
                    Text(context.state.puanMetni)
                        .font(.headline)
                        .foregroundStyle(.green)
                }
            }
            .padding()
            .activityBackgroundTint(Color(.systemBackground))
            .activitySystemActionForegroundColor(.primary)

        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundStyle(.green)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    if !context.state.puanMetni.isEmpty {
                        Text(context.state.puanMetni)
                            .font(.headline)
                            .foregroundStyle(.green)
                    }
                }
                DynamicIslandExpandedRegion(.center) {
                    VStack(spacing: 2) {
                        Text("Değerlendirme Tamamlandı")
                            .font(.footnote).bold()
                        Text("\(context.state.personelAd) · \(context.state.magazaAd)")
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                    }
                }
            } compactLeading: {
                Image(systemName: "checkmark.circle.fill")
                    .foregroundStyle(.green)
            } compactTrailing: {
                if !context.state.puanMetni.isEmpty {
                    Text(context.state.puanMetni)
                        .foregroundStyle(.green)
                }
            } minimal: {
                Image(systemName: "checkmark.circle.fill")
                    .foregroundStyle(.green)
            }
        }
    }
}

extension DegerlendirmeActivityAttributes.ContentState {
    fileprivate static var ornek: DegerlendirmeActivityAttributes.ContentState {
        .init(personelAd: "Ahmet Yılmaz", magazaAd: "Marmara Şube", puanMetni: "92/100")
    }
}

#Preview("Bildirim", as: .content, using: DegerlendirmeActivityAttributes()) {
   WidgetLiveActivity()
} contentStates: {
    DegerlendirmeActivityAttributes.ContentState.ornek
}
