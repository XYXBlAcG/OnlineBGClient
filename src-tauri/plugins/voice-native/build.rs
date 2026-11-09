fn main() {
    tauri_plugin::Builder::new(&[])
        .try_build()
        .expect("cannot build voice native plugin");
}
