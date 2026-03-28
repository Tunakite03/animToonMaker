mod commands;
mod constants;
mod models;
mod utils;

use models::{
    CreateExportFolderResponse, ExportPngSequenceRequest, ExportPngSequenceResponse,
    ImportedImageAssetPayload, ImportedImagePayload, SaveBinaryFileRequest, SaveImageAssetRequest,
    SavedImageAssetPayload,
};
use std::collections::HashMap;

/// Read a local image file and return it as a base64-encoded data URL
/// (e.g. `data:image/png;base64,iVBOR...`).
///
/// Called from the frontend via `invoke("read_image_as_data_url", { path })`.
/// The command validates the input path to reduce accidental exposure to
/// arbitrary local files and to avoid importing unexpectedly large payloads.
#[tauri::command]
fn read_image_as_data_url(path: String) -> Result<String, String> {
    commands::read_image_as_data_url(path)
}

/// Read multiple local image files in one invoke call and return only successful entries.
#[tauri::command]
fn read_images_as_data_urls(paths: Vec<String>) -> Result<Vec<ImportedImagePayload>, String> {
    commands::read_images_as_data_urls(paths)
}

/// Import one local image file and persist it as an app-managed asset handle.
#[tauri::command]
fn import_image_path_as_asset(
    app: tauri::AppHandle,
    path: String,
) -> Result<ImportedImageAssetPayload, String> {
    commands::import_image_path_as_asset(app, path)
}

/// Import multiple local image files in one call and persist each as an asset handle.
#[tauri::command]
fn import_image_paths_as_assets(
    app: tauri::AppHandle,
    paths: Vec<String>,
) -> Result<Vec<ImportedImageAssetPayload>, String> {
    commands::import_image_paths_as_assets(app, paths)
}

/// Persist image bytes as an app-managed asset and return a stable handle + path.
#[tauri::command]
fn save_image_asset(
    app: tauri::AppHandle,
    request: SaveImageAssetRequest,
) -> Result<SavedImageAssetPayload, String> {
    commands::save_image_asset(app, request)
}

/// Resolve an image asset handle to an absolute local file path.
#[tauri::command]
fn resolve_image_asset_path(app: tauri::AppHandle, asset_id: String) -> Result<String, String> {
    commands::resolve_image_asset_path(app, asset_id)
}

/// Save a binary file chosen via native save dialog.
#[tauri::command]
fn save_binary_file(request: SaveBinaryFileRequest) -> Result<(), String> {
    commands::save_binary_file(request)
}

/// Export a full PNG sequence (frames + animation.json) into a new folder.
#[tauri::command]
fn export_png_sequence(
    request: ExportPngSequenceRequest,
) -> Result<ExportPngSequenceResponse, String> {
    commands::export_png_sequence(request)
}

/// Create an export folder and return its canonical path.
#[tauri::command]
fn create_export_folder(
    base_output_dir: String,
    folder_name: String,
) -> Result<CreateExportFolderResponse, String> {
    commands::create_export_folder(base_output_dir, folder_name)
}

/// Load all provider API keys from app data storage.
#[tauri::command]
fn get_provider_api_keys(app: tauri::AppHandle) -> Result<HashMap<String, String>, String> {
    commands::get_provider_api_keys(app)
}

/// Create/update/remove one provider API key in app data storage.
#[tauri::command]
fn set_provider_api_key(
    app: tauri::AppHandle,
    provider: String,
    api_key: String,
) -> Result<(), String> {
    commands::set_provider_api_key(app, provider, api_key)
}

#[cfg(test)]
fn validate_image_path(path: &str) -> Result<std::path::PathBuf, String> {
    utils::validate_image_path(path)
}

#[cfg(test)]
fn validate_safe_name(value: &str, required_extension: Option<&str>) -> Result<String, String> {
    utils::validate_safe_name(value, required_extension)
}

#[cfg(test)]
fn validate_api_key_provider(provider: &str) -> Result<&'static str, String> {
    utils::validate_api_key_provider(provider)
}

#[cfg(test)]
fn validate_asset_id(asset_id: &str) -> Result<String, String> {
    utils::validate_asset_id(asset_id)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            read_image_as_data_url,
            read_images_as_data_urls,
            import_image_path_as_asset,
            import_image_paths_as_assets,
            save_image_asset,
            resolve_image_asset_path,
            save_binary_file,
            export_png_sequence,
            create_export_folder,
            get_provider_api_keys,
            set_provider_api_key
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::constants::MAX_IMPORT_BYTES;
    use std::fs::{self, File};
    use std::path::PathBuf;
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

    #[test]
    fn validate_safe_name_rejects_separators() {
        let result = validate_safe_name("folder/file.png", Some("png"));
        assert!(result.is_err());
    }

    #[test]
    fn validate_safe_name_requires_extension_when_requested() {
        let result = validate_safe_name("frame001.jpg", Some("png"));
        assert!(result.is_err());
    }

    #[test]
    fn validate_api_key_provider_accepts_known_provider() {
        let result = validate_api_key_provider("openai");
        assert!(matches!(result, Ok("openai")));
    }

    #[test]
    fn validate_api_key_provider_rejects_unknown_provider() {
        let result = validate_api_key_provider("unknown-provider");
        assert!(result.is_err());
    }

    #[test]
    fn validate_asset_id_accepts_valid_value() {
        let result = validate_asset_id("img-abc-1.png");
        assert!(matches!(result, Ok(value) if value == "img-abc-1.png"));
    }

    #[test]
    fn validate_asset_id_rejects_unknown_extension() {
        let result = validate_asset_id("img-abc-1.txt");
        assert!(result.is_err());
    }
}
