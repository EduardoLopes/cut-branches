extern crate execute;

use std::process::Command;

use std::env;
use std::path::Path;

#[derive(Debug)]
#[derive(serde::Serialize)]
struct RootPathResponse {
  root_path: String,  
  errors: Vec<String>,
}

#[tauri::command]
pub fn get_root(path: String) -> String {
  let mut errors: Vec<String> = Vec::new();

  let raw_path = Path::new(&path);
  env::set_current_dir(&raw_path).expect("Unable to change into");

  let dir_child = Command::new("git")
    .arg("rev-parse")
    .arg("--show-toplevel")
    
    .output()
    .expect("Failed to execute command");

  let root_path: String = match String::from_utf8(dir_child.stdout) {
    Ok(output) => Some(output.trim().to_string()),
    Err(err) => {
      let e = format!("{:?}", err);
      errors.push(e);

      None
    }
  }
  .unwrap();

  errors.push(String::from_utf8(dir_child.stderr).unwrap());

  let response = RootPathResponse {
    root_path: root_path,    
    errors: errors
      .into_iter()
      .filter(|s| !s.is_empty())
      .collect::<Vec<_>>(),
  };

  return serde_json::to_string(&response).unwrap();
}