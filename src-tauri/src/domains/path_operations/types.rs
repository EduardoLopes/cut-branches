use std::hash::{Hash, Hasher};

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct RootPathResponse {
    pub root_path: String,
    pub id: Option<String>,
}

impl PartialEq for RootPathResponse {
    fn eq(&self, other: &Self) -> bool {
        self.root_path == other.root_path
    }
}

impl Eq for RootPathResponse {}

impl Hash for RootPathResponse {
    fn hash<H: Hasher>(&self, state: &mut H) {
        self.root_path.hash(state);
    }
}