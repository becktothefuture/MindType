/*╔══════════════════════════════════════════════════════╗
  ║  ░  C A R E T   O V E R L A Y   M A N A G E R  ░░░░░  ║
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
  • WHAT ▸ Renders ⠶ symbol overlay at caret position system-wide
  • WHY  ▸ Provide visual caret enhancement across all macOS applications
  • HOW  ▸ Core Animation overlay window with precise positioning and styling
*/

import Cocoa
import CoreGraphics
import QuartzCore

/// Manages the system-wide ⠶ symbol overlay at caret positions
@MainActor
final class CaretOverlayManager {
    private var overlayWindow: NSWindow?
    private var overlayLayer: CATextLayer?
    private var hideTimer: Timer?
    
    /// Show the ⠶ overlay at specified screen position
    func showOverlay(at position: CGPoint, opacity: Double = 0.8, scale: Double = 1.0) {
        // Cancel any existing hide timer
        hideTimer?.invalidate()
        
        // Create overlay window if it doesn't exist
        if overlayWindow == nil {
            createOverlayWindow()
        }
        
        // Update overlay position and appearance
        updateOverlayPosition(position, opacity: opacity, scale: scale)
        
        // Auto-hide after brief delay to avoid visual clutter
        hideTimer = Timer.scheduledTimer(withTimeInterval: 2.0, repeats: false) { [weak self] _ in
            self?.hideOverlay()
        }
    }
    
    /// Hide the overlay immediately
    func hideOverlay() {
        hideTimer?.invalidate()
        overlayWindow?.orderOut(nil)
    }
    
    /// Create the overlay window for rendering the ⠶ symbol
    private func createOverlayWindow() {
        // Create a borderless, transparent window that floats above all others
        overlayWindow = NSWindow(
            contentRect: NSRect(x: 0, y: 0, width: 24, height: 24),
            styleMask: [.borderless],
            backing: .buffered,
            defer: false
        )
        
        guard let window = overlayWindow else { return }
        
        // Configure window for overlay behavior
        window.level = .floating // Above normal windows but below popups
        window.backgroundColor = .clear
        window.isOpaque = false
        window.hasShadow = false
        window.ignoresMouseEvents = true // Click-through behavior
        window.collectionBehavior = [.canJoinAllSpaces, .stationary]
        
        // Create Core Animation layer for the ⠶ symbol
        let textLayer = CATextLayer()
        textLayer.string = "⠶"
        textLayer.font = NSFont.monospacedSystemFont(ofSize: 14, weight: .semibold)
        textLayer.fontSize = 14
        textLayer.foregroundColor = NSColor.white.cgColor
        textLayer.backgroundColor = NSColor.black.withAlphaComponent(0.7).cgColor
        textLayer.cornerRadius = 4
        textLayer.alignmentMode = .center
        textLayer.contentsScale = NSScreen.main?.backingScaleFactor ?? 2.0
        
        // Add subtle shadow for better visibility
        textLayer.shadowColor = NSColor.black.cgColor
        textLayer.shadowOffset = CGSize(width: 0, height: -1)
        textLayer.shadowOpacity = 0.5
        textLayer.shadowRadius = 2
        
        // Performance optimization: rasterize for complex layers
        textLayer.shouldRasterize = true
        textLayer.rasterizationScale = NSScreen.main?.backingScaleFactor ?? 2.0
        
        overlayLayer = textLayer
        
        // Set the layer as the window's content
        window.contentView?.layer = textLayer
        window.contentView?.wantsLayer = true
    }
    
    /// Update overlay position and visual properties
    private func updateOverlayPosition(_ position: CGPoint, opacity: Double, scale: Double) {
        guard let window = overlayWindow,
              let layer = overlayLayer else { return }
        
        // Calculate window frame centered on caret position
        let symbolSize = CGSize(width: 20 * scale, height: 20 * scale)
        let windowFrame = NSRect(
            x: position.x + 2, // Offset slightly to the right of caret
            y: position.y - symbolSize.height / 2,
            width: symbolSize.width,
            height: symbolSize.height
        )
        
        // Update window position with animation
        NSAnimationContext.runAnimationGroup { context in
            context.duration = 0.15
            context.timingFunction = CAMediaTimingFunction(name: .easeOut)
            window.animator().setFrame(windowFrame, display: true)
        }
        
        // Update visual properties
        layer.opacity = Float(opacity)
        let transform = CATransform3DMakeScale(scale, scale, 1.0)
        layer.transform = transform
        
        // Ensure window is visible and on top
        window.orderFrontRegardless()
    }
    
    /// Clean up resources when manager is destroyed
    deinit {
        hideTimer?.invalidate()
        overlayWindow?.orderOut(nil)
        overlayWindow = nil
        overlayLayer = nil
    }
}
