# Mind⠶type⠶Tester⠶01

A cutting-edge macOS status bar application that enhances your text editing experience by displaying a ⠶ symbol overlay next to your caret cursor system-wide.

## What It Does

Mind⠶type⠶Tester⠶01 places a subtle ⠶ symbol to the right of your text cursor in any text field across all macOS applications. This creates a visual enhancement that makes the caret position more prominent and easier to track, especially in applications with subtle cursor styling.

## Features

- **System-wide Enhancement**: Works across all macOS applications that support text input
- **Glassmorphism UI**: Beautiful frosted-glass menu design with modern aesthetics
- **Customizable Appearance**: Adjust opacity and size through the status bar menu
- **Privacy-First**: Only monitors text field focus - never reads or stores text content
- **Performance Optimized**: Minimal system impact with efficient event handling (< 2% CPU, < 50MB RAM)
- **Auto-hide**: Overlay automatically disappears after 2 seconds to avoid visual clutter
- **Swift 6.0**: Built with latest Swift concurrency features and strict concurrency checking

## Requirements

- **macOS 14.0** (Sonoma) or later
- **Accessibility Permissions** (required for system-wide text field monitoring)
- **Apple Silicon** recommended for optimal performance

## Installation & Setup

### Option 1: Swift Package Manager (Recommended)

1. **Clone the Repository**
   ```bash
   git clone <repository-url>
   cd MindTypeTester01
   ```

2. **Build the Application**
   ```bash
   swift build -c release
   ```

3. **Run the Application**
   ```bash
   swift run
   ```

### Option 2: Xcode

1. **Open in Xcode**
   ```bash
   open Package.swift
   ```

2. **Build and Run**
   - Select "My Mac" as the target
   - Press ⌘R to build and run

### Grant Accessibility Permissions

1. When prompted, open **System Settings → Privacy & Security → Accessibility**
2. Enable "MindTypeTester01"
3. The app will automatically request this permission on first run

### Start Using

1. The ⠶ symbol will appear in the status bar (top-right corner)
2. Click the ⠶ icon to access settings and controls
3. Toggle "Enable ⠶ Overlay" to start/stop the enhancement
4. Customize opacity and size to your preference

## How It Works

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   MenuBarExtra (SwiftUI)                 │
│              Glassmorphism UI with Controls              │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│                 AppState (@MainActor)                    │
│          Reactive State Management (Combine)             │
└──────────────────────┬──────────────────────────────────┘
                       │
           ┌───────────┴───────────┐
           ▼                       ▼
┌──────────────────────┐  ┌──────────────────────┐
│ AccessibilityMonitor │  │ CaretOverlayManager  │
│  (AXUIElement APIs)  │  │  (Core Animation)    │
└──────────────────────┘  └──────────────────────┘
```

### Core Subsystems

1. **Accessibility Monitoring**: Uses Apple's Accessibility APIs to detect when text fields gain focus
2. **Caret Position Detection**: Calculates the exact screen position of the text cursor
3. **Overlay Rendering**: Displays a ⠶ symbol overlay at the caret position using Core Animation
4. **Smart Management**: Automatically hides the overlay after brief display to maintain clean UI

## Privacy & Security

- **No Text Storage**: The app never reads, stores, or transmits text content
- **Secure Field Exclusion**: Automatically skips password fields and other secure text inputs
- **IME Awareness**: Properly handles Input Method Editor (IME) states for international text input
- **Minimal Permissions**: Only requests the specific accessibility permission needed for functionality
- **Privacy Manifest**: Declares all API usage in compliance with Apple's privacy requirements

## Customization

Access the status bar menu (click the ⠶ icon) to customize:

- **Enable/Disable**: Toggle the overlay functionality
- **Opacity**: Adjust overlay transparency (0.1 - 1.0)
- **Size**: Scale the overlay size (0.5x - 2.0x)

## Troubleshooting

### Permission Issues
- If the overlay doesn't appear, check that accessibility permissions are granted
- Go to **System Settings → Privacy & Security → Accessibility**
- Ensure "MindTypeTester01" is enabled
- Restart the app after granting permissions

### Performance Issues
- The app is designed to have minimal system impact
- If you experience lag, try reducing the overlay opacity or size
- Check Activity Monitor to verify CPU usage is < 2%

### Compatibility Issues
- Requires macOS 14.0 or later
- May not work with certain applications that heavily customize text input handling
- Some apps (like terminal emulators) may require additional configuration

## Technical Architecture

### Modern Swift 6.0 Features

- **Strict Concurrency**: Full Swift 6 concurrency checking enabled
- **@MainActor**: UI classes marked for main thread execution
- **Async/Await**: Modern concurrency patterns throughout
- **Sendable Protocol**: Thread-safe data structures
- **Property Wrappers**: Reactive state management with @Published

### Performance Optimizations

- **CALayer Rasterization**: Complex layers cached for performance
- **Lazy Initialization**: Overlay window created only when needed
- **Debouncing**: Redundant position updates filtered
- **Weak References**: Retain cycles prevented with [weak self]

### Design Patterns

- **MVVM**: Clear separation between views and business logic
- **Observer Pattern**: Combine for reactive state updates
- **Singleton**: Shared managers for system-wide resources
- **Delegation**: Async callbacks for event handling

## Development

This app demonstrates modern 2025 Swift development practices:

- **Swift 6.0**: Latest language features and safety improvements
- **SwiftUI**: Declarative UI with excellent performance
- **Async/Await**: Modern concurrency patterns for responsive UI
- **Property Wrappers**: Clean state management with @Published and @StateObject
- **Accessibility-First**: Built with accessibility considerations from the ground up
- **Performance-Focused**: Optimized for minimal system impact

### Building from Source

```bash
# Clone the repository
git clone <repository-url>
cd MindTypeTester01

# Run tests
swift test

# Build release version
swift build -c release

# Run the app
swift run
```

### Testing

```bash
# Run all tests
swift test

# Run specific test
swift test --filter MindTypeTester01Tests.testAppStateInitialization
```

## License

This is a demonstration application showcasing modern macOS development techniques for system-wide UI enhancements.

## Credits

Built with ❤️ using:
- Swift 6.0
- SwiftUI
- Core Animation
- Accessibility APIs
- Combine

---

*Built for the future of text editing on macOS*
