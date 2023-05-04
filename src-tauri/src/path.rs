extern crate execute;

use std::process::Command;

use std::collections::hash_map::DefaultHasher;
use std::env;
use std::hash::{Hash, Hasher};
use std::path::Path;

use crate::error::Error;

#[derive(Debug, serde::Serialize)]
struct RootPathResponse {
    root_path: String,
    id: Option<u64>,
}

impl Hash for RootPathResponse {
    fn hash<H: Hasher>(&self, state: &mut H) {
        self.root_path.hash(state);
    }
}

pub fn set_current_dir(path: &Path) -> Result<(), Error> {
    env::set_current_dir(&path).map_err(|error| Error {
        message: format!(
            "Unable to access the path <strong>{0}</strong>",
            path.display()
        ),
        description: Some(error.to_string()),
        kind: "set_current_dir".to_string(),
    })
}

pub fn is_git_repository(path: &Path) -> Result<bool, Error> {
    set_current_dir(&path)?;

    let result = Command::new("git")
        .arg("rev-parse")
        .arg("--is-inside-work-tree")
        .output()
        .unwrap();

    let stdout = String::from_utf8(result.stdout).unwrap();
    let stderr = String::from_utf8(result.stderr).unwrap();

    if !stdout.is_empty() {
        return Ok(true);
    }

    Err(Error {
        message: format!(
            "The path <strong>{0}</strong> is not a git repository",
            path.display()
        ),
        description: Some(stderr),
        kind: "is_git_repository".to_string(),
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

    if !stderr.is_empty() {
        return Err(Error {
            message: format!(
                "We can't get the toplevel path of this git repository. Make sure the path {0} is a git repository",
                raw_path.display()
            ),
            description: Some(stderr),
            kind: "is_git_repository".to_string(),
        });
    }

    let mut response = RootPathResponse {
        root_path: rootpath.trim().to_string(),
        id: None,
    };

    response.id = Some(calculate_hash(&response));

    Ok(serde_json::to_string(&response).unwrap())
}
