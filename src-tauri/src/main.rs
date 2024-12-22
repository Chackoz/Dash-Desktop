use tauri::Manager; // This import is now used
use std::fs;
use std::io::Write;
use tempfile::NamedTempFile; // Ensure this is imported
use env_logger; // Ensure this is imported
use std::process::Command;


#[tauri::command]
async fn run_python_code(code: String) -> Result<String, String> {
    // Validate input size
    if code.len() > 10_000 {
        return Err("Code is too large!".to_string());
    }

    // Create a temporary file
    let mut temp_file = NamedTempFile::new()
        .map_err(|e| format!("Failed to create temp file: {}", e))?;
    
    // Write the code using the file handle
    temp_file.write_all(code.as_bytes())
        .map_err(|e| format!("Failed to write code: {}", e))?;

    // Persist the temp file path
    let temp_path = temp_file.into_temp_path();

    // Detect Python executable
    let python_executable = std::env::var("PYTHON_EXECUTABLE").unwrap_or("python".to_string());

    // Run the Python interpreter
    let output = Command::new(python_executable)
        .arg(temp_path.to_str().unwrap())
        .output()
        .map_err(|e| format!("Failed to execute Python: {}", e))?;

    // Collect output and errors
    let stdout = String::from_utf8_lossy(&output.stdout);
    let stderr = String::from_utf8_lossy(&output.stderr);

    if !stderr.is_empty() {
        Err(format!("Output:\n{}\nErrors:\n{}", stdout, stderr))
    } else {
        Ok(stdout.to_string())
    }
}

fn main() {
    env_logger::init(); // Enable logging

    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![run_python_code])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
