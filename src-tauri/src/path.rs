extern crate execute;

use std::env;
use std::process::Command;

use std::collections::hash_map::DefaultHasher;
use std::hash::{Hash, Hasher};
use std::path::Path;

use crate::error::Error;

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct RootPathResponse {
    pub root_path: String,
    pub id: Option<u64>,
}

impl Hash for RootPathResponse {
    fn hash<H: Hasher>(&self, state: &mut H) {
        self.root_path.hash(state);
    }
}

pub fn set_current_dir(path: &Path) -> Result<(), Error> {
    env::set_current_dir(&path).map_err(|error| Error {
        message: format!("Unable to access the path **{0}**", path.display()),
        description: Some(error.to_string()),
        kind: "unable_to_access_dir".to_string(),
    })
}

pub fn is_git_repository(path: &Path) -> Result<bool, Error> {
    set_current_dir(&path)?;

    let result = Command::new("git")
        .arg("rev-parse")
        .arg("--is-inside-work-tree")
        .output()
        .unwrap();

    let stderr = String::from_utf8(result.stderr).unwrap();

    if result.status.success() {
        return Ok(true);
    }

    Err(Error {
        message: format!(
            "The folder **{}** is not a git repository",
            path.file_name()
                .unwrap_or_else(|| path.as_os_str())
                .to_string_lossy()
        ),
        description: Some(stderr),
        kind: "is_not_git_repository".to_string(),
    })
}

fn calculate_hash<T: Hash>(t: &T) -> u64 {
    let mut s = DefaultHasher::new();
    t.hash(&mut s);
    s.finish()
}

#[tauri::command(async)]
pub async fn get_root(path: String) -> Result<String, Error> {
    let raw_path = Path::new(&path);
    set_current_dir(&raw_path)?;

    is_git_repository(&raw_path)?;

    let result = Command::new("git")
        .arg("rev-parse")
        .arg("--show-toplevel")
        .output()
        .unwrap();

    let rootpath = String::from_utf8(result.stdout).unwrap();
    let stderr = String::from_utf8(result.stderr).unwrap();

    if !result.status.success() {
        return Err(Error {
            message: format!(
                "We can't get the toplevel path of this git repository. Make sure the path {0} is a git repository",
                raw_path.display()
            ),
            description: Some(stderr),
            kind: "is_git_repository".to_string(),
        });
    }

    let response = RootPathResponse {
        root_path: rootpath.trim().to_string(),
        id: Some(calculate_hash(&rootpath.to_string())),
    };

    Ok(serde_json::to_string(&response).unwrap())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_is_git_repository() {
        // Test with a valid git repository
        let path = Path::new("./");
        assert_eq!(is_git_repository(&path).unwrap(), true);

        // Test with an invalid git repository when the path doesn't exist
        let path = Path::new("/");
        let error = is_git_repository(&path).unwrap_err();
        assert_eq!(error.message, "The path **/** is not a git repository");
        assert_eq!(error.kind, "is_not_git_repository");
    }

    #[tokio::test]
    async fn test_get_root() {
        // Test with a valid git repository
        let path = String::from("./");
        let result = get_root(path).await.unwrap();
        let response: RootPathResponse = serde_json::from_str(&result).unwrap();

        assert_eq!(response.root_path.ends_with("/cut-branches"), true);

        // Test with an invalid git repository when the path doesn't exist
        let path = String::from("/");
        let error = get_root(path).await.unwrap_err();
        assert_eq!(error.message, "The path **/** is not a git repository");
        assert_eq!(error.kind, "is_not_git_repository");
    }
}
