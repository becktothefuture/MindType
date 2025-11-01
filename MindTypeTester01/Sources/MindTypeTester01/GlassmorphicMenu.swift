/*╔══════════════════════════════════════════════════════╗
  ║  ░  G L A S S M O R P H I C   M E N U   V I E W  ░░░  ║
  ║                                                      ║
  ║                                                      ║
  ║                                                      ║
  ║                                                      ║
  ║           ╌╌  P L A C E H O L D E R  ╌╌              ║
  ║                                                      ║
  ║                                                      ║
  ║                                                      ║
  ║                                                      ║
  ╚══════════════════════════════════════════════════════╝
  • WHAT ▸ SwiftUI-compatible glassmorphism blur wrapper for menu surfaces
  • WHY  ▸ Provide modern frosted glass look using NSVisualEffectView
  • HOW  ▸ NSViewRepresentable with .ultraThinMaterial, rounded corners, shadow
*/

import SwiftUI
import AppKit

/// A SwiftUI wrapper for NSVisualEffectView to achieve glassmorphism
struct GlassBackground: NSViewRepresentable {
    let material: NSVisualEffectView.Material
    let cornerRadius: CGFloat
    
    func makeNSView(context: Context) -> NSVisualEffectView {
        let view = NSVisualEffectView()
        view.material = material
        view.blendingMode = .behindWindow
        view.state = .active
        view.wantsLayer = true
        view.layer?.cornerRadius = cornerRadius
        view.layer?.masksToBounds = true
        
        // Subtle shadow for depth
        view.shadow = NSShadow()
        view.shadow?.shadowColor = NSColor.black.withAlphaComponent(0.25)
        view.shadow?.shadowBlurRadius = 8
        view.shadow?.shadowOffset = CGSize(width: 0, height: -1)
        
        return view
    }
    
    func updateNSView(_ nsView: NSVisualEffectView, context: Context) {
        nsView.material = material
        nsView.state = .active
        nsView.layer?.cornerRadius = cornerRadius
    }
}

/// Convenience view modifier for glassmorphic container styling
extension View {
    func glassContainer(cornerRadius: CGFloat = 12,
                        material: NSVisualEffectView.Material = .ultraThinMaterial) -> some View {
        background(GlassBackground(material: material, cornerRadius: cornerRadius))
            .clipShape(RoundedRectangle(cornerRadius: cornerRadius, style: .continuous))
    }
}
