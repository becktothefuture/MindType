// Swift package for MindTypeTester01 macOS status bar app

// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "MindTypeTester01",
    platforms: [
        .macOS(.v14)
    ],
    products: [
        .executable(name: "MindTypeTester01", targets: ["MindTypeTester01"])
    ],
    dependencies: [
        // No external dependencies
    ],
    targets: [
        .executableTarget(
            name: "MindTypeTester01",
            dependencies: []
        ),
        .testTarget(
            name: "MindTypeTester01Tests",
            dependencies: ["MindTypeTester01"]
        )
    ]
)
