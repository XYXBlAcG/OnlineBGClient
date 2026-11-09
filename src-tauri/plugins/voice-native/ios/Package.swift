// swift-tools-version:5.9

import PackageDescription

let package = Package(
  name: "tauri-plugin-voice-native",
  platforms: [
    .iOS(.v15),
    .macOS(.v10_15)
  ],
  products: [
    .library(
      name: "tauri-plugin-voice-native",
      type: .static,
      targets: ["tauri-plugin-voice-native"])
  ],
  dependencies: [
    .package(name: "Tauri", path: "../.tauri/tauri-api"),
    .package(
      name: "LiveKit",
      url: "https://github.com/livekit/client-sdk-swift.git",
      exact: "2.19.0"),
  ],
  targets: [
    .target(
      name: "tauri-plugin-voice-native",
      dependencies: [
        .byName(name: "Tauri"),
        .product(name: "LiveKit", package: "LiveKit"),
      ],
      path: "Sources")
  ],
  swiftLanguageVersions: [.v5]
)
