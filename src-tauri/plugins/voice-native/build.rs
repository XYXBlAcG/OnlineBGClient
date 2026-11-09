fn main() {
    if std::env::var("CARGO_CFG_TARGET_OS").as_deref() == Ok("ios") {
        cc::Build::new()
            .file("ios-shim/VoiceNativeShim.mm")
            .flag("-fobjc-arc")
            .compile("voice_native_shim");
    }
    tauri_plugin::Builder::new(&[])
        .try_build()
        .expect("cannot build voice native plugin");
}
