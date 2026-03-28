use std::sync::atomic::AtomicU64;

pub(crate) const MAX_IMPORT_BYTES: u64 = 20 * 1024 * 1024;
pub(crate) const MAX_EXPORT_BYTES: usize = 512 * 1024 * 1024;
pub(crate) const MAX_BATCH_IMPORT_PATHS: usize = 256;
pub(crate) const MAX_EXPORT_FRAMES: usize = 10_000;
pub(crate) const MAX_API_KEY_LENGTH: usize = 4096;
pub(crate) const API_KEY_STORE_FILE_NAME: &str = "provider-api-keys.json";
pub(crate) const IMAGE_ASSETS_DIR_NAME: &str = "image-assets";
pub(crate) const ALLOWED_API_KEY_PROVIDERS: [&str; 6] = [
    "fal",
    "replicate",
    "openai",
    "stability",
    "together",
    "gemini",
];
pub(crate) const ALLOWED_IMAGE_EXTENSIONS: [&str; 10] = [
    "png", "jpg", "jpeg", "gif", "webp", "bmp", "svg", "avif", "tif", "tiff",
];
pub(crate) static ASSET_ID_COUNTER: AtomicU64 = AtomicU64::new(0);
