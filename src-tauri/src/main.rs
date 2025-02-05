#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use std::fs;
use std::io::Write;
use tempfile::NamedTempFile;
use env_logger;
use std::process::{Command, Stdio};
use uuid::Uuid;
use serde::Serialize;
use sys_info::{cpu_num, cpu_speed, mem_info};
#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

#[cfg(target_os = "windows")]
const CREATE_NO_WINDOW: u32 = 0x08000000;

#[derive(Serialize)]
struct SystemSpecs {
    os: String,
    cpu: String,
    ram: String,
    gpu: Option<String>,
    gpu_vram: Option<String>,
    docker: bool,
    python: Option<String>,
    node: Option<String>,
    rust: Option<String>,
}

fn start_docker_background() {
    #[cfg(target_os = "windows")]
    {
        Command::new("cmd")
            .args(["/C", "start /B docker info > NUL 2>&1"])
            .creation_flags(CREATE_NO_WINDOW)
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .spawn()
            .ok();
    }

    #[cfg(not(target_os = "windows"))]
    {
        Command::new("sh")
            .args(["-c", "docker info > /dev/null 2>&1 &"])
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .spawn()
            .ok();
    }
}

fn check_docker() -> bool {
    let mut cmd = Command::new("docker");
    cmd.arg("--version")
        .stdout(Stdio::null())
        .stderr(Stdio::null());

    #[cfg(target_os = "windows")]
    cmd.creation_flags(CREATE_NO_WINDOW);

    cmd.status()
        .map(|status| status.success())
        .unwrap_or(false)
}

fn get_version(cmd: &str, args: &[&str]) -> Option<String> {
    let mut command = Command::new(cmd);
    command.args(args)
        .stdout(Stdio::piped())
        .stderr(Stdio::null());
    
    #[cfg(target_os = "windows")]
    {
        command.creation_flags(CREATE_NO_WINDOW);
    }

    command.output().ok().and_then(|output| {
        if output.status.success() {
            String::from_utf8(output.stdout)
                .ok()
                .map(|v| v.trim().to_string())
        } else {
            None
        }
    })
}

#[tauri::command]
fn get_system_specs() -> SystemSpecs {
    let os = std::env::consts::OS.to_string();
    let cpu = format!(
        "{} cores @ {} MHz",
        cpu_num().unwrap_or(0),
        cpu_speed().unwrap_or(0)
    );
    let ram = if let Ok(mem) = mem_info() {
        format!("{:.1} GB", mem.total as f64 / (1024.0 * 1024.0))
    } else {
        "Unknown".to_string()
    };
    
    let docker = check_docker();
    let python = get_version("python", &["--version"]);
    let node = get_version("node", &["--version"]);
    let rust = get_version("rustc", &["--version"]);
    
    SystemSpecs {
        os,
        cpu,
        ram,
        gpu: None,
        gpu_vram: None,
        docker,
        python,
        node,
        rust,
    }
}

pub async fn run_with_docker(
    code: &str,
    requirements: &[String],
    container_id: &str,
) -> Result<String, String> {
    let temp_dir = tempfile::TempDir::new()
        .map_err(|e| format!("Failed to create temp directory: {}", e))?;
    
    let script_path = temp_dir.path().join("script.py");
    fs::write(&script_path, code)
        .map_err(|e| format!("Failed to write Python script: {}", e))?;
    
    let dockerfile = if requirements.is_empty() {
        String::from(
            "FROM python:3.9-slim\n\
             WORKDIR /app\n\
             COPY script.py /app/\n\
             CMD [\"python\", \"script.py\"]"
        )
    } else {
        format!(
            "FROM python:3.9-slim\n\
             WORKDIR /app\n\
             COPY script.py /app/\n\
             RUN pip install --no-cache-dir {}\n\
             CMD [\"python\", \"script.py\"]",
            requirements.join(" ")
        )
    };
    
    let dockerfile_path = temp_dir.path().join("Dockerfile");
    fs::write(&dockerfile_path, dockerfile)
        .map_err(|e| format!("Failed to write Dockerfile: {}", e))?;
    
    let mut build_command = Command::new("docker");
    build_command.args([
        "build",
        "--no-cache",
        "-t",
        &format!("python-runner-{}", container_id),
        temp_dir.path().to_str().unwrap(),
    ])
    .stdout(Stdio::piped())
    .stderr(Stdio::piped());

    #[cfg(target_os = "windows")]
    build_command.creation_flags(CREATE_NO_WINDOW);

    let build_output = build_command
        .output()
        .map_err(|e| format!("Docker build command failed: {}", e))?;
    
    if !build_output.status.success() {
        return Err(format!(
            "Docker build failed:\n{}",
            String::from_utf8_lossy(&build_output.stderr)
        ));
    }

    
    
     // Create and run the `docker` command
     let mut command = Command::new("docker");
     command.args([
         "run",
         "--rm",
         "--name",
         &format!("runner-{}", container_id),
         "--memory",
         "512m",
         "--cpus",
         "1",
         "--security-opt",
         "no-new-privileges",
         &format!("python-runner-{}", container_id),
     ]);

      // Add Windows-specific flag
    #[cfg(target_os = "windows")]
    command.creation_flags(0x08000000);

    let run_output = command
    .stdout(Stdio::piped())
    .stderr(Stdio::piped())
    .output()
    .map_err(|e| format!("Docker run failed: {}", e))?;
    
    let mut _command = Command::new("docker");
    _command.args(["rmi", "-f", &format!("python-runner-{}", container_id)]);

    #[cfg(target_os = "windows")]
    _command.creation_flags(0x08000000);


    
    let _ = _command
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .output();
    
    
    let stdout = String::from_utf8_lossy(&run_output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&run_output.stderr).to_string();
    
    if !run_output.status.success() {
        Err(format!(
            "Container execution failed:\nOutput:\n{}\nErrors:\n{}",
            stdout, stderr
        ))
    } else if !stderr.is_empty() {
        Ok(format!(
            "Docker Output:\n{}\nWarnings:\n{}",
            stdout, stderr
        ))
    } else {
        Ok(stdout)
    }
}

async fn run_with_venv(
    code: &str, 
    requirements: &[String], 
    venv_id: &str
) -> Result<String, String> {
    let venv_path = std::env::temp_dir().join(format!("venv_{}", venv_id));
    
    let python_executable = std::env::var("PYTHON_EXECUTABLE").unwrap_or("python".to_string());
    let create_venv = Command::new(&python_executable)
        .args(["-m", "venv", venv_path.to_str().unwrap()])
        .stdout(Stdio::null())
        .stderr(Stdio::piped())
        .output()
        .map_err(|e| format!("Failed to create virtual environment: {}", e))?;

    if !create_venv.status.success() {
        return Err(format!("Failed to create virtual environment: {}", 
            String::from_utf8_lossy(&create_venv.stderr)));
    }

    let venv_python = if cfg!(windows) {
        venv_path.join("Scripts").join("python.exe")
    } else {
        venv_path.join("bin").join("python")
    };

    if !requirements.is_empty() {
        let mut install_cmd = Command::new(&venv_python);
        install_cmd.args(["-m", "pip", "install"]);
        install_cmd.args(requirements);
        install_cmd.stdout(Stdio::null());
        install_cmd.stderr(Stdio::piped());
        
        let install_output = install_cmd
            .output()
            .map_err(|e| format!("Failed to install requirements: {}", e))?;

        if !install_output.status.success() {
            let _ = fs::remove_dir_all(&venv_path);
            return Err(format!("Failed to install requirements: {}", 
                String::from_utf8_lossy(&install_output.stderr)));
        }
    }

    let mut temp_file = NamedTempFile::new()
        .map_err(|e| format!("Failed to create temp file: {}", e))?;
    
    temp_file.write_all(code.as_bytes())
        .map_err(|e| format!("Failed to write code: {}", e))?;

    let temp_path = temp_file.into_temp_path();

    let output = Command::new(&venv_python)
        .arg(temp_path.to_str().unwrap())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .output()
        .map_err(|e| format!("Failed to execute Python: {}", e))?;

    let _ = fs::remove_dir_all(&venv_path);

    let stdout = String::from_utf8_lossy(&output.stdout);
    let stderr = String::from_utf8_lossy(&output.stderr);

    if !stderr.is_empty() {
        Err(format!("Venv Output:\n{}\nErrors:\n{}", stdout, stderr))
    } else {
        Ok(stdout.to_string())
    }
}

#[tauri::command]
async fn run_python_code(code: String, requirements: Option<String>) -> Result<String, String> {
    if code.len() > 10_000 {
        return Err("Code is too large!".to_string());
    }

    let run_id = Uuid::new_v4().to_string();
    
    let requirements: Vec<String> = requirements
        .unwrap_or_default()
        .split(',')
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .collect();

    run_with_docker(&code, &requirements, &run_id).await
}

#[tauri::command]
async fn run_docker_hub_image(
    image: String,
    command: Option<Vec<String>>,
    memory_limit: Option<String>,
    cpu_limit: Option<String>,
    id: Option<String>,
    timeout: Option<String>,
) -> Result<String, String> {
    let container_id = id.unwrap_or_else(|| "default".to_string());

    let mut pullcommand = Command::new("docker");
    pullcommand.args(["pull", &image]);

    #[cfg(target_os = "windows")]
    {
        pullcommand.creation_flags(0x08000000); // CREATE_NO_WINDOW
    }
    
    let pull_output = pullcommand
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .output()
        .map_err(|e| format!("Failed to pull Docker image: {}", e))?;

    if !pull_output.status.success() {
        return Err(format!("Failed to pull image:\n{}", 
            String::from_utf8_lossy(&pull_output.stderr)));
    }

    let mut run_args = Vec::new();
    run_args.extend(vec![
        "run".to_string(),
        "--rm".to_string(),
        "--name".to_string(), 
        format!("hub-runner-{}", container_id),
        "--security-opt".to_string(), 
        "no-new-privileges".to_string(),
    ]);

   
    
    if let Some(mem) = memory_limit {
        run_args.extend(vec!["--memory".to_string(), mem]);
    } else {
        run_args.extend(vec!["--memory".to_string(), "512m".to_string()]);
    }

    if let Some(cpu) = cpu_limit {
        run_args.extend(vec!["--cpus".to_string(), cpu]);
    } else {
        run_args.extend(vec!["--cpus".to_string(), "1".to_string()]);
    }

    run_args.push(image);

    if let Some(cmd) = command {
        run_args.extend(cmd);
    }

    let mut _command = Command::new("docker");
    _command .args(&run_args);

    #[cfg(target_os = "windows")]
    {
        _command.creation_flags(0x08000000); // CREATE_NO_WINDOW
    }

    let run_output =_command
       
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .output()
        .map_err(|e| format!("Docker run failed: {}", e))?;

    let stdout = String::from_utf8_lossy(&run_output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&run_output.stderr).to_string();

    if !run_output.status.success() {
        Err(format!("Container execution failed:\nOutput:\n{}\nErrors:\n{}", stdout, stderr))
    } else if !stderr.is_empty() {
        Ok(format!("Docker Output:\n{}\nWarnings:\n{}", stdout, stderr))
    } else {
        Ok(stdout)
    }
}

#[tauri::command]
async fn stop_docker_container(id: String) -> Result<String, String> {
    let stop_output = Command::new("docker")
        .args([
            "ps",
            "-q",
            "--filter",
            "name=hub-runner-default",
        ])
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .output()
        .map_err(|e| format!("Failed to list containers: {}", e))?;

    let container_ids = String::from_utf8_lossy(&stop_output.stdout);
    
    if container_ids.is_empty() {
        return Ok("No running containers found.".to_string());
    }

    for id in container_ids.split_whitespace() {
        let stop_result = Command::new("docker")
            .args(["stop", id])
            .stdout(Stdio::null())
            .stderr(Stdio::piped())
            .output()
            .map_err(|e| format!("Failed to stop container: {}", e))?;

        if !stop_result.status.success() {
            return Err(format!(
                "Failed to stop container {}:\n{}", 
                id, 
                String::from_utf8_lossy(&stop_result.stderr)
            ));
        }
    }

    Ok("Container(s) stopped successfully.".to_string())
}

fn main() {
    env_logger::init();

    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            run_python_code,
            get_system_specs,
            run_docker_hub_image,
            stop_docker_container 
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}