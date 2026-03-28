use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ImportedImagePayload {
    pub(crate) data_url: String,
    pub(crate) path: String,
    pub(crate) prompt: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ImportedImageAssetPayload {
    pub(crate) asset_id: String,
    pub(crate) asset_path: String,
    pub(crate) path: String,
    pub(crate) prompt: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct SavedImageAssetPayload {
    pub(crate) asset_id: String,
    pub(crate) asset_path: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct SaveImageAssetRequest {
    pub(crate) bytes_base64: String,
    pub(crate) extension: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct SaveBinaryFileRequest {
    pub(crate) output_path: String,
    pub(crate) bytes_base64: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct PngFramePayload {
    pub(crate) file_name: String,
    pub(crate) png_base64: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ExportPngSequenceRequest {
    pub(crate) base_output_dir: String,
    pub(crate) folder_name: String,
    pub(crate) frames: Vec<PngFramePayload>,
    pub(crate) manifest_json: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ExportPngSequenceResponse {
    pub(crate) frame_count: usize,
    pub(crate) output_dir: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct CreateExportFolderResponse {
    pub(crate) output_dir: String,
}
