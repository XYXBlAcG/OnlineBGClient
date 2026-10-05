use std::fs;
use std::path::{Path, PathBuf};
use tauri::Manager;

pub fn runtime_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    match std::env::var_os("COMPANION_HOST_CACHE") {
        Some(path) => Ok(PathBuf::from(path)),
        None => Ok(app.path().app_cache_dir().map_err(|e| e.to_string())?.join("hosting")),
    }
}

pub fn image_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let data = match std::env::var_os("COMPANION_HOST_DATA") {
        Some(path) => PathBuf::from(path),
        None => app.path().app_data_dir().map_err(|e| e.to_string())?.join("rooms"),
    };
    Ok(data.join("assets"))
}

pub fn directory_size(path: &Path) -> Result<u64, String> {
    if !path.exists() { return Ok(0); }
    let metadata = fs::symlink_metadata(path).map_err(|e| e.to_string())?;
    if metadata.is_symlink() { return Ok(0); }
    if metadata.is_file() { return Ok(metadata.len()); }
    fs::read_dir(path).map_err(|e| e.to_string())?.try_fold(0, |size, entry| {
        directory_size(&entry.map_err(|e| e.to_string())?.path()).map(|next| size + next)
    })
}

pub fn remove_directory(path: &Path) -> Result<(), String> {
    if path.exists() { fs::remove_dir_all(path).map_err(|e| e.to_string())?; }
    Ok(())
}

#[tauri::command]
pub fn cache_usage(app: tauri::AppHandle) -> Result<serde_json::Value, String> {
    Ok(serde_json::json!({"runtime":directory_size(&runtime_path(&app)?)?,"images":directory_size(&image_path(&app)?)?}))
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn measures_and_removes_only_the_selected_directory() {
        let root = std::env::temp_dir().join(format!("onlinebg-cache-{}", std::process::id()));
        let cache = root.join("hosting");
        fs::create_dir_all(&cache).unwrap();
        fs::write(cache.join("runtime"), [0u8; 24]).unwrap();
        fs::write(root.join("room.sqlite"), [1u8; 12]).unwrap();
        assert_eq!(directory_size(&cache).unwrap(), 24);
        remove_directory(&cache).unwrap();
        assert_eq!(directory_size(&cache).unwrap(), 0);
        assert!(root.join("room.sqlite").exists());
        fs::remove_dir_all(root).unwrap();
    }
}
