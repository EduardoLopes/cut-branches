#[derive(serde::Serialize)]
pub struct Error {
    pub message: String,
    pub kind: String,
    pub description: Option<String>,
}
