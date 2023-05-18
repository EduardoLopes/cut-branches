#[derive(serde::Serialize, Debug)]
pub struct Error {
    pub message: String,
    pub kind: String,
    pub description: Option<String>,
}
