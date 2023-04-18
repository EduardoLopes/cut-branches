#[derive(serde::Serialize)]
pub struct Error {
  pub message: String,
  pub kind: String,
}