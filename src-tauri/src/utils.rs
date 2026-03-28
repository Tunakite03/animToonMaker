use crate::constants::{
    ALLOWED_API_KEY_PROVIDERS, ALLOWED_IMAGE_EXTENSIONS, API_KEY_STORE_FILE_NAME, ASSET_ID_COUNTER,
    IMAGE_ASSETS_DIR_NAME, MAX_EXPORT_BYTES, MAX_IMPORT_BYTES,
};
use base64::{engine::general_purpose, Engine as _};
use std::collections::HashMap;
use std::ffi::OsStr;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::atomic::Ordering;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::Manager;

pub(crate) fn validate_image_path(path: &str) -> Result<PathBuf, String> {
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

pub(crate) fn validate_existing_directory(path: &str) -> Result<PathBuf, String> {
    let trimmed = path.trim();
    if trimmed.is_empty() || trimmed.len() > 4096 {
        return Err("Invalid output directory".into());
    }

    let canonical =
        fs::canonicalize(trimmed).map_err(|_| "Output directory does not exist".to_string())?;
    let metadata =
        fs::metadata(&canonical).map_err(|_| "Output directory does not exist".to_string())?;

    if !metadata.is_dir() {
        return Err("Expected a directory path".into());
    }

    Ok(canonical)
}

pub(crate) fn validate_api_key_provider(provider: &str) -> Result<&'static str, String> {
    let normalized = provider.trim().to_ascii_lowercase();
    if !ALLOWED_API_KEY_PROVIDERS.contains(&normalized.as_str()) {
        return Err("Unsupported provider for API key storage".to_string());
    }

    match normalized.as_str() {
        "fal" => Ok("fal"),
        "replicate" => Ok("replicate"),
        "openai" => Ok("openai"),
        "stability" => Ok("stability"),
        "together" => Ok("together"),
        "gemini" => Ok("gemini"),
        _ => Err("Unsupported provider for API key storage".to_string()),
    }
}

pub(crate) fn app_data_api_keys_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|_| "Failed to resolve app data directory".to_string())?;

    fs::create_dir_all(&app_data_dir)
        .map_err(|_| "Failed to initialize app data directory".to_string())?;

    Ok(app_data_dir.join(API_KEY_STORE_FILE_NAME))
}

pub(crate) fn load_provider_api_keys(
    app: &tauri::AppHandle,
) -> Result<HashMap<String, String>, String> {
    let file_path = app_data_api_keys_path(app)?;

    if !file_path.exists() {
        return Ok(HashMap::new());
    }

    let contents =
        fs::read_to_string(&file_path).map_err(|_| "Failed to read stored API keys".to_string())?;

    if contents.trim().is_empty() {
        return Ok(HashMap::new());
    }

    let parsed: HashMap<String, String> =
        serde_json::from_str(&contents).map_err(|_| "Stored API keys are corrupted".to_string())?;

    let mut sanitized = HashMap::new();
    for (provider, api_key) in parsed {
        let provider_id = match validate_api_key_provider(&provider) {
            Ok(value) => value,
            Err(_) => continue,
        };

        let trimmed = api_key.trim();
        if trimmed.is_empty() {
            continue;
        }

        sanitized.insert(provider_id.to_string(), trimmed.to_string());
    }

    Ok(sanitized)
}

pub(crate) fn save_provider_api_keys(
    app: &tauri::AppHandle,
    keys: &HashMap<String, String>,
) -> Result<(), String> {
    let file_path = app_data_api_keys_path(app)?;

    if keys.is_empty() {
        if file_path.exists() {
            fs::remove_file(file_path)
                .map_err(|_| "Failed to remove stored API keys".to_string())?;
        }
        return Ok(());
    }

    let payload =
        serde_json::to_vec_pretty(keys).map_err(|_| "Failed to serialize API keys".to_string())?;

    fs::write(file_path, payload).map_err(|_| "Failed to persist API keys".to_string())
}

pub(crate) fn validate_output_file_path(path: &str) -> Result<PathBuf, String> {
    let trimmed = path.trim();
    if trimmed.is_empty() || trimmed.len() > 4096 {
        return Err("Invalid output file path".to_string());
    }

    let raw_path = PathBuf::from(trimmed);
    let file_name = raw_path
        .file_name()
        .and_then(OsStr::to_str)
        .ok_or_else(|| "Invalid output file name".to_string())?;
    let safe_file_name = validate_safe_name(file_name, None)?;

    let parent = raw_path
        .parent()
        .ok_or_else(|| "Invalid output directory".to_string())?;
    let canonical_parent = validate_existing_directory(&parent.to_string_lossy())?;

    Ok(canonical_parent.join(safe_file_name))
}

pub(crate) fn image_assets_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|_| "Failed to resolve app data directory".to_string())?;

    let assets_dir = app_data_dir.join(IMAGE_ASSETS_DIR_NAME);
    fs::create_dir_all(&assets_dir)
        .map_err(|_| "Failed to initialize image asset directory".to_string())?;

    Ok(assets_dir)
}

pub(crate) fn write_image_asset_bytes(
    app: &tauri::AppHandle,
    bytes: &[u8],
    extension: &str,
) -> Result<(String, PathBuf), String> {
    if bytes.is_empty() {
        return Err("Image payload is empty".to_string());
    }

    let assets_dir = image_assets_dir(app)?;
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|_| "Failed to generate image asset handle".to_string())?
        .as_nanos();
    let nonce = ASSET_ID_COUNTER.fetch_add(1, Ordering::Relaxed);
    let asset_id = format!("img-{now:x}-{nonce:x}.{extension}");
    let asset_path = assets_dir.join(&asset_id);

    fs::write(&asset_path, bytes).map_err(|_| "Failed to persist image asset".to_string())?;
    let canonical_path =
        fs::canonicalize(&asset_path).map_err(|_| "Failed to persist image asset".to_string())?;

    Ok((asset_id, canonical_path))
}

pub(crate) fn validate_asset_id(asset_id: &str) -> Result<String, String> {
    let safe = validate_safe_name(asset_id, None)?;
    let ext = Path::new(&safe)
        .extension()
        .and_then(OsStr::to_str)
        .map(|value| value.to_ascii_lowercase())
        .ok_or_else(|| "Invalid image asset handle".to_string())?;

    if !ALLOWED_IMAGE_EXTENSIONS.contains(&ext.as_str()) {
        return Err("Invalid image asset handle".to_string());
    }

    Ok(safe)
}

pub(crate) fn image_extension_from_path(path: &Path) -> String {
    let ext = path
        .extension()
        .and_then(OsStr::to_str)
        .map(|value| value.to_ascii_lowercase())
        .unwrap_or_else(|| "png".to_string());

    normalize_asset_extension(Some(&ext), "png")
}

pub(crate) fn normalize_asset_extension(extension: Option<&str>, fallback: &str) -> String {
    extension
        .map(|value| value.trim().trim_start_matches('.').to_ascii_lowercase())
        .filter(|value| ALLOWED_IMAGE_EXTENSIONS.contains(&value.as_str()))
        .unwrap_or_else(|| fallback.to_string())
}

pub(crate) fn validate_safe_name(
    value: &str,
    required_extension: Option<&str>,
) -> Result<String, String> {
    let trimmed = value.trim();

    if trimmed.is_empty() || trimmed == "." || trimmed == ".." {
        return Err("Invalid file or folder name".to_string());
    }

    if trimmed.len() > 255 {
        return Err("File or folder name is too long".to_string());
    }

    if trimmed.contains('/') || trimmed.contains('\\') {
        return Err("File or folder name must not contain path separators".to_string());
    }

    if trimmed
        .chars()
        .any(|ch| matches!(ch, '<' | '>' | ':' | '"' | '|' | '?' | '*'))
    {
        return Err("File or folder name contains invalid characters".to_string());
    }

    if let Some(extension) = required_extension {
        let ext = Path::new(trimmed)
            .extension()
            .and_then(OsStr::to_str)
            .map(|value| value.to_ascii_lowercase())
            .ok_or_else(|| "File extension is missing".to_string())?;

        if ext != extension {
            return Err(format!("Expected .{extension} file"));
        }
    }

    Ok(trimmed.to_string())
}

pub(crate) fn decode_base64_payload(payload: &str) -> Result<Vec<u8>, String> {
    let trimmed = payload.trim();
    if trimmed.is_empty() {
        return Err("Binary payload is empty".to_string());
    }

    let bytes = general_purpose::STANDARD
        .decode(trimmed)
        .map_err(|_| "Binary payload is not valid base64".to_string())?;

    if bytes.is_empty() {
        return Err("Binary payload is empty".to_string());
    }

    if bytes.len() > MAX_EXPORT_BYTES {
        return Err("Binary payload exceeds export size limit".to_string());
    }

    Ok(bytes)
}

pub(crate) fn build_data_url(path: &Path) -> Result<String, String> {
    let bytes = fs::read(path).map_err(|_| "Failed to read image file".to_string())?;
    let mime = image_mime_from_path(path);
    let b64 = general_purpose::STANDARD.encode(bytes);
    Ok(format!("data:{};base64,{}", mime, b64))
}

pub(crate) fn file_stem_to_prompt(path: &Path) -> String {
    path.file_stem()
        .and_then(OsStr::to_str)
        .map(str::to_owned)
        .unwrap_or_default()
}

pub(crate) fn has_allowed_image_extension(path: &Path) -> bool {
    path.extension()
        .and_then(OsStr::to_str)
        .map(|ext| ext.to_ascii_lowercase())
        .is_some_and(|ext| ALLOWED_IMAGE_EXTENSIONS.contains(&ext.as_str()))
}

/// Detect a MIME type from a file path's extension (case-insensitive).
/// Falls back to `image/png` for unknown extensions.
pub(crate) fn image_mime_from_path(path: &Path) -> &'static str {
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
