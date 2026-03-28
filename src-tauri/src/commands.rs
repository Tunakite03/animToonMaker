use crate::constants::{
    MAX_API_KEY_LENGTH, MAX_BATCH_IMPORT_PATHS, MAX_EXPORT_BYTES, MAX_EXPORT_FRAMES,
    MAX_IMPORT_BYTES,
};
use crate::models::{
    CreateExportFolderResponse, ExportPngSequenceRequest, ExportPngSequenceResponse,
    ImportedImageAssetPayload, ImportedImagePayload, SaveBinaryFileRequest, SaveImageAssetRequest,
    SavedImageAssetPayload,
};
use crate::utils::{
    build_data_url, decode_base64_payload, file_stem_to_prompt, image_assets_dir,
    image_extension_from_path, load_provider_api_keys, normalize_asset_extension,
    save_provider_api_keys, validate_api_key_provider, validate_asset_id,
    validate_existing_directory, validate_image_path, validate_output_file_path,
    validate_safe_name, write_image_asset_bytes,
};
use std::collections::HashMap;
use std::fs;

/// Read a local image file and return it as a base64-encoded data URL
/// (e.g. `data:image/png;base64,iVBOR...`).
///
/// Called from the frontend via `invoke("read_image_as_data_url", { path })`.
/// The command validates the input path to reduce accidental exposure to
/// arbitrary local files and to avoid importing unexpectedly large payloads.
pub(crate) fn read_image_as_data_url(path: String) -> Result<String, String> {
    let canonical_path = validate_image_path(&path)?;
    build_data_url(&canonical_path)
}

/// Read multiple local image files in one invoke call and return only successful entries.
pub(crate) fn read_images_as_data_urls(
    paths: Vec<String>,
) -> Result<Vec<ImportedImagePayload>, String> {
    if paths.len() > MAX_BATCH_IMPORT_PATHS {
        return Err(format!(
            "Too many image paths in one request (max {MAX_BATCH_IMPORT_PATHS})"
        ));
    }

    let mut imported = Vec::with_capacity(paths.len());

    for raw_path in paths {
        let canonical_path = match validate_image_path(&raw_path) {
            Ok(path) => path,
            Err(_) => continue,
        };

        let data_url = match build_data_url(&canonical_path) {
            Ok(value) => value,
            Err(_) => continue,
        };

        imported.push(ImportedImagePayload {
            data_url,
            path: canonical_path.to_string_lossy().to_string(),
            prompt: file_stem_to_prompt(&canonical_path),
        });
    }

    Ok(imported)
}

/// Import one local image file and persist it as an app-managed asset handle.
pub(crate) fn import_image_path_as_asset(
    app: tauri::AppHandle,
    path: String,
) -> Result<ImportedImageAssetPayload, String> {
    let canonical_path = validate_image_path(&path)?;
    let bytes = fs::read(&canonical_path).map_err(|_| "Failed to read image file".to_string())?;
    if bytes.len() > MAX_IMPORT_BYTES as usize {
        return Err(format!(
            "Image file exceeds the {} MB import limit",
            MAX_IMPORT_BYTES / 1024 / 1024
        ));
    }

    let ext = image_extension_from_path(&canonical_path);
    let (asset_id, asset_path) = write_image_asset_bytes(&app, &bytes, &ext)?;

    Ok(ImportedImageAssetPayload {
        asset_id,
        asset_path: asset_path.to_string_lossy().to_string(),
        path: canonical_path.to_string_lossy().to_string(),
        prompt: file_stem_to_prompt(&canonical_path),
    })
}

/// Import multiple local image files in one call and persist each as an asset handle.
pub(crate) fn import_image_paths_as_assets(
    app: tauri::AppHandle,
    paths: Vec<String>,
) -> Result<Vec<ImportedImageAssetPayload>, String> {
    if paths.len() > MAX_BATCH_IMPORT_PATHS {
        return Err(format!(
            "Too many image paths in one request (max {MAX_BATCH_IMPORT_PATHS})"
        ));
    }

    let mut imported = Vec::with_capacity(paths.len());

    for raw_path in paths {
        let canonical_path = match validate_image_path(&raw_path) {
            Ok(path) => path,
            Err(_) => continue,
        };

        let bytes = match fs::read(&canonical_path) {
            Ok(value) => value,
            Err(_) => continue,
        };

        if bytes.len() > MAX_IMPORT_BYTES as usize {
            continue;
        }

        let ext = image_extension_from_path(&canonical_path);
        let (asset_id, asset_path) = match write_image_asset_bytes(&app, &bytes, &ext) {
            Ok(value) => value,
            Err(_) => continue,
        };

        imported.push(ImportedImageAssetPayload {
            asset_id,
            asset_path: asset_path.to_string_lossy().to_string(),
            path: canonical_path.to_string_lossy().to_string(),
            prompt: file_stem_to_prompt(&canonical_path),
        });
    }

    Ok(imported)
}

/// Persist image bytes as an app-managed asset and return a stable handle + path.
pub(crate) fn save_image_asset(
    app: tauri::AppHandle,
    request: SaveImageAssetRequest,
) -> Result<SavedImageAssetPayload, String> {
    let bytes = decode_base64_payload(&request.bytes_base64)?;
    if bytes.len() > MAX_IMPORT_BYTES as usize {
        return Err(format!(
            "Image payload exceeds the {} MB import limit",
            MAX_IMPORT_BYTES / 1024 / 1024
        ));
    }

    let extension = normalize_asset_extension(request.extension.as_deref(), "png");
    let (asset_id, asset_path) = write_image_asset_bytes(&app, &bytes, &extension)?;

    Ok(SavedImageAssetPayload {
        asset_id,
        asset_path: asset_path.to_string_lossy().to_string(),
    })
}

/// Resolve an image asset handle to an absolute local file path.
pub(crate) fn resolve_image_asset_path(
    app: tauri::AppHandle,
    asset_id: String,
) -> Result<String, String> {
    let normalized_asset_id = validate_asset_id(&asset_id)?;
    let assets_dir = image_assets_dir(&app)?;
    let canonical_assets_dir = fs::canonicalize(&assets_dir)
        .map_err(|_| "Failed to resolve image asset directory".to_string())?;

    let candidate = assets_dir.join(normalized_asset_id);
    let canonical_path =
        fs::canonicalize(&candidate).map_err(|_| "Image asset not found".to_string())?;

    if !canonical_path.starts_with(&canonical_assets_dir) {
        return Err("Invalid image asset handle".to_string());
    }

    let metadata =
        fs::metadata(&canonical_path).map_err(|_| "Image asset not found".to_string())?;
    if !metadata.is_file() {
        return Err("Image asset not found".to_string());
    }

    Ok(canonical_path.to_string_lossy().to_string())
}

/// Save a binary file chosen via native save dialog.
pub(crate) fn save_binary_file(request: SaveBinaryFileRequest) -> Result<(), String> {
    let output_path = validate_output_file_path(&request.output_path)?;
    let bytes = decode_base64_payload(&request.bytes_base64)?;

    fs::write(&output_path, bytes).map_err(|_| "Failed to write export file".to_string())
}

/// Export a full PNG sequence (frames + animation.json) into a new folder.
pub(crate) fn export_png_sequence(
    request: ExportPngSequenceRequest,
) -> Result<ExportPngSequenceResponse, String> {
    if request.frames.is_empty() {
        return Err("No frames provided for export".to_string());
    }

    if request.frames.len() > MAX_EXPORT_FRAMES {
        return Err(format!(
            "Too many frames in one export request (max {MAX_EXPORT_FRAMES})"
        ));
    }

    let base_output_dir = validate_existing_directory(&request.base_output_dir)?;
    let folder_name = validate_safe_name(&request.folder_name, None)?;
    let output_dir = base_output_dir.join(folder_name);

    fs::create_dir_all(&output_dir)
        .map_err(|_| "Failed to create export output folder".to_string())?;

    for frame in &request.frames {
        let file_name = validate_safe_name(&frame.file_name, Some("png"))?;
        let file_path = output_dir.join(file_name);
        let bytes = decode_base64_payload(&frame.png_base64)?;

        fs::write(file_path, bytes).map_err(|_| "Failed to write PNG frame".to_string())?;
    }

    let manifest_bytes = request.manifest_json.as_bytes();
    if manifest_bytes.is_empty() {
        return Err("Manifest payload is empty".to_string());
    }
    if manifest_bytes.len() > MAX_EXPORT_BYTES {
        return Err("Manifest payload is too large".to_string());
    }

    serde_json::from_str::<serde_json::Value>(&request.manifest_json)
        .map_err(|_| "Manifest payload must be valid JSON".to_string())?;

    fs::write(output_dir.join("animation.json"), manifest_bytes)
        .map_err(|_| "Failed to write sequence manifest".to_string())?;

    Ok(ExportPngSequenceResponse {
        frame_count: request.frames.len(),
        output_dir: output_dir.to_string_lossy().to_string(),
    })
}

/// Create an export folder and return its canonical path.
pub(crate) fn create_export_folder(
    base_output_dir: String,
    folder_name: String,
) -> Result<CreateExportFolderResponse, String> {
    let base_output_dir = validate_existing_directory(&base_output_dir)?;
    let folder_name = validate_safe_name(&folder_name, None)?;
    let output_dir = base_output_dir.join(folder_name);

    fs::create_dir_all(&output_dir)
        .map_err(|_| "Failed to create export output folder".to_string())?;

    Ok(CreateExportFolderResponse {
        output_dir: output_dir.to_string_lossy().to_string(),
    })
}

/// Load all provider API keys from app data storage.
pub(crate) fn get_provider_api_keys(
    app: tauri::AppHandle,
) -> Result<HashMap<String, String>, String> {
    load_provider_api_keys(&app)
}

/// Create/update/remove one provider API key in app data storage.
pub(crate) fn set_provider_api_key(
    app: tauri::AppHandle,
    provider: String,
    api_key: String,
) -> Result<(), String> {
    let provider_id = validate_api_key_provider(&provider)?;
    let mut keys = load_provider_api_keys(&app)?;
    let trimmed = api_key.trim();

    if trimmed.is_empty() {
        keys.remove(provider_id);
    } else {
        if trimmed.len() > MAX_API_KEY_LENGTH {
            return Err("API key is too long".to_string());
        }
        keys.insert(provider_id.to_string(), trimmed.to_string());
    }

    save_provider_api_keys(&app, &keys)
}
