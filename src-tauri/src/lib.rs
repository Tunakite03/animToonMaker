use base64::{engine::general_purpose, Engine as _};
use std::ffi::OsStr;
use std::fs;
use std::path::{Path, PathBuf};

const MAX_IMPORT_BYTES: u64 = 20 * 1024 * 1024;
const ALLOWED_IMAGE_EXTENSIONS: [&str; 10] = [
    "png", "jpg", "jpeg", "gif", "webp", "bmp", "svg", "avif", "tif", "tiff",
];

/// Read a local image file and return it as a base64-encoded data URL
/// (e.g. `data:image/png;base64,iVBOR...`).
///
/// Called from the frontend via `invoke("read_image_as_data_url", { path })`.
/// The command validates the input path to reduce accidental exposure to
/// arbitrary local files and to avoid importing unexpectedly large payloads.
#[tauri::command]
fn read_image_as_data_url(path: String) -> Result<String, String> {
    let canonical_path = validate_image_path(&path)?;
    let bytes = fs::read(&canonical_path).map_err(|_| "Failed to read image file".to_string())?;
    let mime = image_mime_from_path(&canonical_path);
    let b64 = general_purpose::STANDARD.encode(bytes);
    Ok(format!("data:{};base64,{}", mime, b64))
}

fn validate_image_path(path: &str) -> Result<PathBuf, String> {
    let trimmed = path.trim();
    if trimmed.is_empty() || trimmed.len() > 4096 {
        return Err("Invalid image path".into());
    }

    let canonical = fs::canonicalize(trimmed).map_err(|_| "Image file not found".to_string())?;
    let metadata = fs::metadata(&canonical).map_err(|_| "Image file not found".to_string())?;

    if !metadata.is_file() {
        return Err("Expected a file path".into());
    }

    if !has_allowed_image_extension(&canonical) {
        return Err("Unsupported image file type".into());
    }

    if metadata.len() == 0 {
        return Err("Image file is empty".into());
    }

    if metadata.len() > MAX_IMPORT_BYTES {
        return Err(format!(
            "Image file exceeds the {} MB import limit",
            MAX_IMPORT_BYTES / 1024 / 1024
        ));
    }

    Ok(canonical)
}

fn has_allowed_image_extension(path: &Path) -> bool {
    path.extension()
        .and_then(OsStr::to_str)
        .map(|ext| ext.to_ascii_lowercase())
        .is_some_and(|ext| ALLOWED_IMAGE_EXTENSIONS.contains(&ext.as_str()))
}

/// Detect a MIME type from a file path's extension (case-insensitive).
/// Falls back to `image/png` for unknown extensions.
fn image_mime_from_path(path: &Path) -> &'static str {
    match path
        .extension()
        .and_then(OsStr::to_str)
        .map(|ext| ext.to_ascii_lowercase())
        .as_deref()
    {
        Some("png") => "image/png",
        Some("jpg" | "jpeg") => "image/jpeg",
        Some("gif") => "image/gif",
        Some("webp") => "image/webp",
        Some("bmp") => "image/bmp",
        Some("svg") => "image/svg+xml",
        Some("avif") => "image/avif",
        Some("tif" | "tiff") => "image/tiff",
        _ => "image/png",
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_http::init())
        .invoke_handler(tauri::generate_handler![read_image_as_data_url])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs::{self, File};
    use std::time::{SystemTime, UNIX_EPOCH};

    fn temp_file_path(ext: &str) -> PathBuf {
        let unique = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system time should be valid")
            .as_nanos();

        std::env::temp_dir().join(format!("animtoonmaker-test-{unique}.{ext}"))
    }

    #[test]
    fn validate_image_path_accepts_supported_file() {
        let path = temp_file_path("png");
        fs::write(&path, b"fake image bytes").expect("should write test file");

        let result = validate_image_path(path.to_str().expect("utf8 path"));

        fs::remove_file(&path).expect("should clean up test file");
        assert!(result.is_ok());
    }

    #[test]
    fn validate_image_path_rejects_non_image_extension() {
        let path = temp_file_path("txt");
        fs::write(&path, b"not an image").expect("should write test file");

        let result = validate_image_path(path.to_str().expect("utf8 path"));

        fs::remove_file(&path).expect("should clean up test file");
        assert!(matches!(result, Err(message) if message.contains("Unsupported")));
    }

    #[test]
    fn validate_image_path_rejects_large_files() {
        let path = temp_file_path("png");
        let file = File::create(&path).expect("should create test file");
        file.set_len(MAX_IMPORT_BYTES + 1)
            .expect("should enlarge test file");

        let result = validate_image_path(path.to_str().expect("utf8 path"));

        fs::remove_file(&path).expect("should clean up test file");
        assert!(matches!(result, Err(message) if message.contains("import limit")));
    }
}
