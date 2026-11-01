use std::{
    fs,
    path::{Path, PathBuf},
    sync::LazyLock,
};
pub const LEGACY_ID: &str = "cn.hullqin.companion";
pub static APP_ID: LazyLock<String> = LazyLock::new(|| {
    let config: serde_json::Value =
        serde_json::from_str(include_str!("../tauri.conf.json")).unwrap();
    config["identifier"].as_str().unwrap().to_owned()
});
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn migration_preserves_original_and_never_overwrites_new_data() {
        let root = std::env::temp_dir().join(format!("onlinebg-migrate-{}", std::process::id()));
        let _ = fs::remove_dir_all(&root);
        fs::create_dir_all(root.join("old/IndexedDB")).unwrap();
        fs::write(root.join("old/IndexedDB/save"), b"saved game").unwrap();
        copy_profile(&root.join("old"), &root.join("new")).unwrap();
        assert_eq!(
            fs::read(root.join("new/IndexedDB/save")).unwrap(),
            b"saved game"
        );
        fs::write(root.join("new/IndexedDB/save"), b"new game").unwrap();
        copy_profile(&root.join("old"), &root.join("new")).unwrap();
        assert_eq!(
            fs::read(root.join("new/IndexedDB/save")).unwrap(),
            b"new game"
        );
        assert_eq!(
            fs::read(root.join("old/IndexedDB/save")).unwrap(),
            b"saved game"
        );
        fs::remove_dir_all(root).unwrap();
    }
}
pub fn copy_profile(source: &Path, destination: &Path) -> Result<(), String> {
    if !source.is_dir() {
        return Ok(());
    }
    if destination.exists()
        && fs::read_dir(destination)
            .map_err(|e| e.to_string())?
            .next()
            .is_some()
    {
        return Ok(());
    }
    let parent = destination.parent().ok_or("数据目录无父目录")?;
    fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    let staged = parent.join(format!(
        ".onlinebg-migrate-{}-{}",
        std::process::id(),
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_nanos()
    ));
    fs::create_dir(&staged).map_err(|e| e.to_string())?;
    let mut queue = vec![(source.to_path_buf(), staged.clone())];
    let result = (|| {
        while let Some((from, to)) = queue.pop() {
            for entry in fs::read_dir(from).map_err(|e| e.to_string())? {
                let entry = entry.map_err(|e| e.to_string())?;
                let kind = entry.file_type().map_err(|e| e.to_string())?;
                if kind.is_symlink() {
                    continue;
                }
                let path = to.join(entry.file_name());
                if kind.is_dir() {
                    fs::create_dir(&path).map_err(|e| e.to_string())?;
                    queue.push((entry.path(), path));
                } else if kind.is_file() {
                    fs::copy(entry.path(), path).map_err(|e| e.to_string())?;
                }
            }
        }
        if destination.exists() {
            fs::remove_dir(destination).map_err(|e| e.to_string())?;
        }
        fs::rename(&staged, destination).map_err(|e| e.to_string())
    })();
    if result.is_err() {
        let _ = fs::remove_dir_all(staged);
    }
    result
}
pub fn prepare() -> Result<(), String> {
    let mut roots: Vec<PathBuf> = [
        dirs::config_dir(),
        dirs::data_dir(),
        dirs::data_local_dir(),
        dirs::cache_dir(),
    ]
    .into_iter()
    .flatten()
    .collect();
    #[cfg(target_os = "macos")]
    if let Some(home) = dirs::home_dir() {
        roots.push(home.join("Library/WebKit"));
    }
    roots.sort();
    roots.dedup();
    for root in roots {
        copy_profile(&root.join(LEGACY_ID), &root.join(APP_ID.as_str()))?;
    }
    Ok(())
}
