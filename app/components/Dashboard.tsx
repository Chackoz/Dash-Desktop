"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { User } from "firebase/auth";
import { auth, DockerConfig, Task } from "@/app/utils/firebaseConfig";
import { signOut } from "firebase/auth";
import {
  ref,
  onValue,
  set,
  push,
  onDisconnect,
  update,
  off,
  DataSnapshot,
} from "firebase/database";
import { invoke } from "@tauri-apps/api/core";
import {
  Code2,
  Network,
  PlayCircle,
  Terminal,
  Upload,
  Clock,
  CheckCircle,
  XCircle,
  Loader,
  Timer,
  Sun,
  Moon,
  FileText,
  LogOut,
  AlertCircle,
} from "lucide-react";
import {
  createTask,
  database,
  updateNodeStatus,
} from "@/app/utils/firebaseConfig";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import CodeMirror from "@uiw/react-codemirror";
import { python } from "@codemirror/lang-python";
import { githubDark } from "@uiw/codemirror-theme-github";
import { useTheme } from "./ThemeProvider";
import NetworkPanel from "./NetworkPanel";

interface DashNetworkProps {
  user: User;
}

interface PresenceData {
  status: "idle" | "online" | "offline" | "busy";
  lastSeen: string;
  type: "client" | "worker";
  email?: string;
  userId?: string;
}

const TaskStatus = React.memo<{
  status: Task["status"];
  output?: Task["output"];
}>(({ status }) => {
  const statusConfig = {
    completed: { icon: CheckCircle, color: "text-green-500", animate: false },
    assigned: { icon: Loader, color: "text-blue-500", animate: true },
    failed: { icon: XCircle, color: "text-red-500", animate: false },
    running: { icon: Loader, color: "text-blue-500", animate: true },
    pending: { icon: Clock, color: "text-blue-500", animate: true },
  };

  const config = statusConfig[status] || {
    icon: Timer,
    color: "text-gray-500",
  };
  const Icon = config.icon;

  return (
    <div className={`flex items-center ${config.color}`}>
      <Icon className={`w-4 h-4 ${config.animate ? "animate-spin" : ""}`} />
    </div>
  );
});

TaskStatus.displayName = "TaskStatus";

export default function DashNetwork({ user }: DashNetworkProps) {
  const [code, setCode] = useState("");
  const [requirements, setRequirements] = useState("");
  const [output, setOutput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"editor" | "upload">("editor");
  const [nodeStatus, setNodeStatus] = useState<
    "idle" | "online" | "offline" | "busy"
  >("idle");
  const [clientId, setClientId] = useState("");
  const [recentTasks, setRecentTasks] = useState<Task[]>([]);
  const [networkNodes, setNetworkNodes] = useState(0);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showAllTasks, setShowAllTasks] = useState(false);

  const [currentEditor, setCurrentEditor] = useState<"code" | "requirements">(
    "code"
  );
  const [isDockerMode, setIsDockerMode] = useState(false);
  const [dockerImage, setDockerImage] = useState("");
  const [dockerCommand, setDockerCommand] = useState("");
  const [memoryLimit, setMemoryLimit] = useState("512m");
  const [cpuLimit, setCpuLimit] = useState("1");
  //const [timeLimit, setTimeLimit] = useState("5m");
  const [isStoppingContainer, setIsStoppingContainer] = useState(false);

  const TaskDetails: React.FC<{ task: Task; onClose: () => void }> = React.memo(
    ({ task }) => (
      <DialogContent className="min-w-[70%] h-fit max-h-[90%]  rounded-3xl overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Task Details</DialogTitle>
          
          </div>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <TaskStatus status={task.status} />
            <span className="text-sm">
              {new Date(task.createdAt).toLocaleString()}
            </span>
          </div>
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Task ID</h3>
            <code className="block p-2 rounded bg-secondary text-xs">
              {task.id ? task.id : task.clientId}
            </code>
          </div>
          {task.output && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Output</h3>
              <pre className="p-2 rounded bg-secondary overflow-x-auto">
                <code className="text-xs">{task.output}</code>
              </pre>
            </div>
          )}
          {task.code && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Code</h3>
              <CodeMirror
                value={task.code}
                theme={githubDark}
                extensions={[python()]}
                editable={false}
                className="text-xs rounded-2xl"
              />
            </div>
          )}
          {task.requirements && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Requirements</h3>
              <pre className="p-2 rounded bg-secondary overflow-x-auto">
                <code className="text-xs">{task.requirements}</code>
              </pre>
            </div>
          )}
        </div>
      </DialogContent>
    )
  );

  TaskDetails.displayName = "TaskDetails";

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const { isDarkMode, toggleTheme } = useTheme();

  useEffect(() => {
    const presenceRef = ref(database, "presence");
    const connectRef = ref(database, ".info/connected");
    const clientTasksRef = ref(database, "tasks");

    // Generate or retrieve client ID
    const storedClientId = localStorage.getItem("clientId");
    let newClientId: string;

    if (!storedClientId) {
      // Generate new client ID only if one doesn't exist
      const newRef = push(presenceRef);
      newClientId = newRef.key || "";
      localStorage.setItem("clientId", newClientId);
    } else {
      newClientId = storedClientId;
    }

    setClientId(newClientId);

    // Set up presence with proper path
    const setupPresence = () => {
      if (!newClientId) return; // Guard against empty client ID

      const clientPresenceRef = ref(database, `presence/${newClientId}`);
      const presenceData = {
        status: "idle",
        lastSeen: new Date().toISOString(),
        type: "client",
        userId: user.uid,
        email: user.email,
      };

      // Set initial presence
      set(clientPresenceRef, presenceData);

      // Set up disconnect cleanup
      onDisconnect(clientPresenceRef).remove();

      // Set up periodic presence updates
      const presenceInterval = setInterval(() => {
        update(clientPresenceRef, {
          lastSeen: new Date().toISOString(),
        });
      }, 30000); // Update every 30 seconds

      return () => clearInterval(presenceInterval);
    };

    let presenceCleanup: (() => void) | undefined;

    // Connection handler
    const handleConnection = (snapshot: DataSnapshot) => {
      if (snapshot.val()) {
        presenceCleanup = setupPresence();
        setNodeStatus("online");
      } else {
        if (presenceCleanup) {
          presenceCleanup();
        }
        setNodeStatus("offline");
      }
    };

    // Presence handler with proper filtering
    const handlePresence = (snapshot: DataSnapshot) => {
      const presenceData = snapshot.val();
      if (!presenceData) {
        setNetworkNodes(0);
        return;
      }

      // Only count valid presence entries
      const activeNodes = Object.entries(presenceData).filter(([id, data]) => {
        const presence = data as PresenceData;
        // Verify the presence entry has required fields and is recent (within last minute)
        return (
          id && // Has valid ID
          presence.lastSeen && // Has lastSeen timestamp
          presence.status && // Has status
          presence.type === "client" && // Is a client
          new Date().getTime() - new Date(presence.lastSeen).getTime() < 60000 // Was active in last minute
        );
      }).length;

      setNetworkNodes(activeNodes);
    };
    // Tasks handler
    const handleTasks = async (snapshot: DataSnapshot) => {
      const tasks = snapshot.val();
      if (!tasks) return;

      // Process assigned tasks
      Object.entries(tasks).forEach(async ([taskId, task]) => {
        const typedTask = task as Task;
        console.log("Task:", taskId, typedTask);
        if (
          typedTask.assignedTo === newClientId &&
          typedTask.status === "assigned"
        ) {
          console.log("Executing assigned task:", taskId);
          await executeTask(taskId, typedTask);
        }
      });

      // Update recent tasks
      const tasksList = Object.entries(tasks)
        .map(([, data]) => ({
          ...(data as Task),
        }))
        .filter((task) => showAllTasks || task.clientId === newClientId)
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
        .slice(0, 10);

      setRecentTasks(tasksList);
    };

    // Set up listeners
    onValue(connectRef, handleConnection);
    onValue(presenceRef, handlePresence);
    onValue(clientTasksRef, handleTasks);

    // Cleanup
    return () => {
      if (presenceCleanup) {
        presenceCleanup();
      }
      off(connectRef);
      off(presenceRef);
      off(clientTasksRef);
    };
  }, [showAllTasks, user.uid, user.email]);

  // Task handlers
  const handleRunLocally = async () => {
    if (!code) {
      setOutput("Please enter some code first.");
      return;
    }
    setOutput(`Running code locally...\nRequirements:\n${requirements}`);
    setIsLoading(true);
    setNodeStatus("busy");
    updateNodeStatus(clientId, "busy");
    try {
      const result = await invoke<string>("run_python_code", {
        code,
        requirements,
      });
      setOutput(
        `Running code locally...\nRequirements:\n${requirements}\n\n` + result
      );
    } catch (error) {
      setOutput(`Error: ${(error as Error).toString()}`);
    } finally {
      setIsLoading(false);
    }
    setNodeStatus("idle");
    updateNodeStatus(clientId, "idle");
  };

  const handleDistribute = async () => {
    setOutput("");
    if (nodeStatus === "offline" || !clientId) {
      setOutput("Error: Cannot distribute task. Please check your connection.");
      return;
    }

    if (isDockerMode) {
      // Validate Docker configuration
      const validationError = validateDockerConfig(
        dockerImage,
        memoryLimit,
        cpuLimit
      );
      if (validationError) {
        setOutput(`Error: ${validationError}`);
        return;
      }

      // Parse and validate Docker command
      const commandArgs = dockerCommand
        ? parseDockerCommand(dockerCommand)
        : [];

      setIsLoading(true);
      try {
        const dockerConfig: DockerConfig = {
          image: dockerImage,
          command: commandArgs,
          memoryLimit,
          cpuLimit,
          //timeLimit,
        };

        const taskId = await createTask(
          clientId,
          null,
          undefined,
          dockerConfig
        );
        setOutput(
          `Docker task distributed successfully!\nTask ID: ${taskId}\nStatus: Pending\n`
        );

        if (!taskId) {
          throw new Error("Failed to create Docker task");
        }

        setOutput(
          `Docker task distributed successfully!\n` +
            `Task ID: ${taskId}\n` +
            `Status: Pending\n` +
            `Image: ${dockerImage}\n` +
            `Command: ${commandArgs.join(" ")}\n` +
            `Memory: ${memoryLimit}\n` +
            `CPU: ${cpuLimit}\n` //+
          //  `Time Limit: ${timeLimit}`
        );

        // Monitor task status
        const taskRef = ref(database, `tasks/${taskId}`);
        onValue(taskRef, (snapshot) => {
          const task = snapshot.val();
          if (task && task.status !== "pending") {
            const statusInfo =
              `Docker task distributed successfully!\n` +
              `Task ${taskId}\n` +
              `Status: ${task.status}\n` +
              `Worker: ${task.assignedTo || "Unknown"}\n\n` +
              (task.error ? `Error: ${task.error}\n\n` : "") +
              (task.output || "");

            setOutput(statusInfo);

            // Handle task completion or failure
            if (task.status === "completed" || task.status === "failed") {
              // Optionally clean up the listener
              off(taskRef);
            }
          }
        });
      } catch (error) {
        setOutput(
          `Error distributing Docker task: ${(error as Error).message}`
        );
      } finally {
        setIsLoading(false);
      }
    } else {
      // Existing code task handling
      if (!code) {
        setOutput("Error: Please enter code to distribute.");
        return;
      }

      setIsLoading(true);
      try {
        const taskId = await createTask(clientId, code, requirements);
        setOutput(
          `Task distributed successfully!\nTask ID: ${taskId}\nStatus: Pending\n` +
            (isDockerMode ? `Docker Image: ${dockerImage}\n` : "")
        );

        const taskRef = ref(database, `tasks/${taskId}`);
        onValue(taskRef, (snapshot) => {
          const task = snapshot.val();
          if (task && task.status !== "pending") {
            setOutput(
              `Task ${taskId}\nStatus: ${task.status}\nWorker: ${
                task.assignedTo || "Unknown"
              }\n\n${task.output || ""}`
            );
          }
        });
      } catch (error) {
        setOutput(`Error distributing task: ${(error as Error).message}`);
      } finally {
        setIsLoading(false);
      }
    }
  };
  const executeTask = async (taskId: string, task: Task) => {
    console.log("Executing task:", task);
    setClientId(localStorage.getItem("clientId") || "");
    if (!(clientId === null || clientId === undefined || clientId === "")) {
      updateNodeStatus(clientId, "busy");
    }
    setNodeStatus("busy");

    try {
      await update(ref(database, `tasks/${taskId}`), {
        status: "running",
        startedAt: new Date().toISOString(),
      });

      let result;
      if (task.taskType === "docker" && task.dockerConfig) {
        result = await invoke<string>("run_docker_hub_image", {
          image: task.dockerConfig.image,
          command: task.dockerConfig.command || [],
          memoryLimit: task.dockerConfig.memoryLimit || "512m",
          cpuLimit: task.dockerConfig.cpuLimit || "1",
          id: task.id,
          timeLimit: task.timeLimit,
        });
        console.log("Docker task result:", result);
        console.log("Task ID:", taskId);
        console.log(
          "Image:",
          task.dockerConfig.image,
          "Command:",
          task.dockerConfig.command,
          "Memory Limit:",
          task.dockerConfig.memoryLimit,
          "CPU Limit:",
          task.dockerConfig.cpuLimit
        );
      } else if (task.code) {
        result = await invoke<string>("run_python_code", {
          code: task.code,
          requirements: task.requirements,
        });
      } else {
        throw new Error("Invalid task configuration");
      }

      await update(ref(database, `tasks/${taskId}`), {
        status: "completed",
        output: result,
        completedAt: new Date().toISOString(),
      });
    } catch (error) {
      await update(ref(database, `tasks/${taskId}`), {
        status: "failed",
        output: `Error: ${(error as Error).toString()}`,
        completedAt: new Date().toISOString(),
      });
    }

    if (!(clientId === null || clientId === undefined || clientId === "")) {
      updateNodeStatus(clientId, "idle");
    }
    setNodeStatus("idle");
  };

  const handleRunDocker = async () => {
    if (!dockerImage) {
      setOutput("Please enter a Docker image name.");
      return;
    }
    setOutput(`Running Docker image: ${dockerImage}`);
    setIsLoading(true);
    setNodeStatus("busy");
    updateNodeStatus(clientId, "busy");

    try {
      const result = await invoke<string>("run_docker_hub_image", {
        image: dockerImage,
        command: dockerCommand ? dockerCommand.split(" ") : [],
        memoryLimit,
        cpuLimit,
      //  timeLimit
      });
      setOutput(`Docker Output:\n${result}`);
    } catch (error) {
      setOutput(`Error: ${(error as Error).toString()}`);
    } finally {
      setIsLoading(false);
      setNodeStatus("idle");
      updateNodeStatus(clientId, "idle");
    }
  };

  const handleStopContainer = async (taskId?: string) => {
    

    setIsStoppingContainer(true);
    try {
      const result = await invoke<string>("stop_docker_container", {
        containerId: taskId?taskId:"df",
      });
      setOutput(`Stop container result: ${result}`);

      // Update task status in Firebase if needed
      const taskRef = ref(database, `tasks/${taskId}`);
      await update(taskRef, {
        status: "stopped",
        stoppedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.log(`Error stopping container: ${error}`);
    } finally {
      setIsStoppingContainer(false);
    }
  };

  const handleFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        file.text().then(setCode);
      }
    },
    []
  );

  const validateDockerConfig = (
    image: string,
    memoryLimit: string,
    cpuLimit: string
  ): string | null => {
    if (!image.trim()) {
      return "Docker image is required";
    }

    // Validate memory format (e.g., 512m, 1g, 2gb)
    if (memoryLimit && !/^\d+[kmg]?b?$/i.test(memoryLimit)) {
      return "Invalid memory limit format (e.g., 512m, 1g)";
    }

    // Validate CPU format (number)
    if (cpuLimit && !/^\d+(\.\d+)?$/.test(cpuLimit)) {
      return "Invalid CPU limit format (e.g., 1, 0.5)";
    }

    return null;
  };

 



  const parseDockerCommand = (command: string): string[] => {
    // Handle quoted arguments properly
    const args: string[] = [];
    let current = "";
    let inQuotes = false;

    for (const char of command) {
      if (char === '"' || char === "'") {
        inQuotes = !inQuotes;
      } else if (char === " " && !inQuotes) {
        if (current) {
          args.push(current);
          current = "";
        }
      } else {
        current += char;
      }
    }

    if (current) {
      args.push(current);
    }

    return args;
  };

  const filteredTasks = useMemo(
    () =>
      recentTasks.map((task) => ({
        ...task,
        id: task.id,
      })),
    [recentTasks]
  );

  return (
    <div className="h-screen bg-background text-foreground flex">
      {/* Left Sidebar */}
      <div className="w-80 border-r flex flex-col">
        <Card className="rounded-none border-0 border-b">
          <CardHeader className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CardTitle className="text-lg">DASH</CardTitle>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => toggleTheme()}
                >
                  {isDarkMode ? (
                    <Sun className="w-4 h-4" />
                  ) : (
                    <Moon className="w-4 h-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleLogout}
                  className="text-red-500 hover:text-red-600"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="text-sm text-muted-foreground mt-2">
              {user.email}
            </div>
            <div className="text-sm text-muted-foreground mt-2">
              {"Client ID : " + clientId?.replaceAll("-", "")}
            </div>
          </CardHeader>
        </Card>

        <div className="p-4 border-b">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status</span>
              <div className="flex items-center space-x-2">
                <div
                  className={`w-2 h-2 rounded-full ${
                    nodeStatus === "online"
                      ? "bg-green-500"
                      : nodeStatus === "offline"
                      ? "bg-red-500"
                      : nodeStatus === "idle"
                      ? "bg-green-500"
                      : "bg-yellow-500"
                  }`}
                />
                <span className="text-sm capitalize">{nodeStatus}</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Active Nodes
              </span>
              <span className="text-sm">{networkNodes}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Show All Tasks
              </span>
              <Switch
                checked={showAllTasks}
                onCheckedChange={setShowAllTasks}
              />
            </div>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-4">
            <h3 className="text-sm font-medium mb-3">Recent Tasks</h3>
            <div className="space-y-2">
              {filteredTasks.map((task) => (
                <button
                  key={`${task.id}-${task.status}-${task.createdAt}`}
                  onClick={() => setSelectedTask(task)}
                  className="w-full p-3 rounded bg-secondary/50 hover:bg-secondary text-left transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-4">
                      <TaskStatus status={task.status} output={task.output} />
                      <div className="text-md font-mono truncate text-muted-foreground">
                        {`Status: ${task.status}`}
                      </div>
                    </div>
                    {/* {(task.status === "running" ||
                      task.status === "assigned") && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStopContainer(task.id ? task.id : task.clientId);
                        }}
                        disabled={isStoppingContainer}
                        className="flex items-center gap-2"
                      >
                        {isStoppingContainer ? (
                          <Loader className="w-4 h-4 animate-spin" />
                        ) : (
                          <AlertCircle className="w-4 h-4" />
                        )}
                        <span>Stop</span>
                      </Button>
                    )} */}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(task.createdAt).toLocaleTimeString()}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </ScrollArea>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        <div className="border-b p-4">
          <div className="flex items-center justify-between">
            <div className="flex space-x-4">
              <Button
                variant={activeTab === "editor" ? "secondary" : "ghost"}
                onClick={() => setActiveTab("editor")}
                className="space-x-2"
              >
                <Code2 className="w-4 h-4" />
                <span>Editor</span>
              </Button>
              <Button
                variant={activeTab === "upload" ? "secondary" : "ghost"}
                onClick={() => setActiveTab("upload")}
                className="space-x-2"
              >
                <Upload className="w-4 h-4" />
                <span>Upload</span>
              </Button>
            </div>
            <div className="flex items-center space-x-2">
              <Terminal className="w-4 h-4" />
              <span className="text-sm">Docker Mode</span>
              <Switch
                checked={isDockerMode}
                onCheckedChange={setIsDockerMode}
              />
            </div>
          
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleStopContainer("df" )}
                disabled={isStoppingContainer}
                className="flex items-center gap-2 hidden"
              >
                {isStoppingContainer ? (
                  <Loader className="w-4 h-4 animate-spin" />
                ) : (
                  <AlertCircle className="w-4 h-4" />
                )}
                <span>Stop Container</span>
              </Button>
           
          </div>
        </div>

        <div className="flex-1 p-6">
          <div className="h-full flex flex-col">
            {isDockerMode ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Docker Image</label>
                    <input
                      className="w-full px-3 py-2 rounded bg-secondary/50"
                      placeholder="e.g., python:3.9-slim"
                      value={dockerImage}
                      onChange={(e) => setDockerImage(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Command (optional)
                    </label>
                    <input
                      className="w-full px-3 py-2 rounded bg-secondary/50"
                      placeholder="e.g., python script.py"
                      value={dockerCommand}
                      onChange={(e) => setDockerCommand(e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Memory Limit</label>
                    <input
                      className="w-full px-3 py-2 rounded bg-secondary/50"
                      placeholder="e.g., 512m"
                      value={memoryLimit}
                      onChange={(e) => setMemoryLimit(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">CPU Limit</label>
                    <input
                      className="w-full px-3 py-2 rounded bg-secondary/50"
                      placeholder="e.g., 1"
                      value={cpuLimit}
                      onChange={(e) => setCpuLimit(e.target.value)}
                    />
                  </div>
                  {/* <div className="space-y-2">
                    <label className="text-sm font-medium">Time Limit</label>
                    <input
                      className="w-full px-3 py-2 rounded bg-secondary/50"
                      placeholder="e.g., 1"
                      value={timeLimit}
                      onChange={(e) => setTimeLimit(e.target.value)}
                    />
                  </div> */}
                </div>

                <Alert>
                  <AlertDescription className="text-sm">
                    Docker containers run with network disabled and limited
                    privileges for security.
                  </AlertDescription>
                </Alert>
                <div className="flex space-x-4">
                  <Button
                    onClick={handleRunDocker}
                    disabled={isLoading || !dockerImage}
                    variant="secondary"
                    className="space-x-2"
                  >
                    <PlayCircle className="w-4 h-4" />
                    <span>Run Docker Locally</span>
                  </Button>
                  <Button
                    onClick={handleDistribute}
                    disabled={
                      isLoading || !dockerImage || nodeStatus === "offline"
                    }
                    className="space-x-2"
                  >
                    <Network className="w-4 h-4" />
                    <span>Distribute Docker</span>
                  </Button>
                </div>
              </div>
            ) : (
              <>
                {activeTab === "editor" ? (
                  <Tabs
                    value={currentEditor}
                    onValueChange={(v) =>
                      setCurrentEditor(v as "code" | "requirements")
                    }
                  >
                    <TabsList>
                      <TabsTrigger value="code" className="space-x-2">
                        <Code2 className="w-4 h-4" />
                        <span>Code</span>
                      </TabsTrigger>
                      <TabsTrigger value="requirements" className="space-x-2">
                        <FileText className="w-4 h-4" />
                        <span>Requirements</span>
                      </TabsTrigger>
                    </TabsList>
                    <TabsContent value="code" className="flex-1 mt-4">
                      <CodeMirror
                        value={code}
                        theme={githubDark}
                        extensions={[python()]}
                        onChange={setCode}
                        className="flex-1 rounded-md overflow-hidden"
                        height="400px"
                      />
                    </TabsContent>
                    <TabsContent value="requirements" className="flex-1 mt-4">
                      <textarea
                        value={requirements}
                        onChange={(e) => setRequirements(e.target.value)}
                        className="w-full h-[400px] font-mono text-sm p-4 rounded bg-secondary/50 resize-none focus:outline-none focus:ring-1"
                        placeholder="# Enter your requirements comma separated&#10;numpy==1.21.0&#10;pandas>=1.3.0&#10;requests"
                      />
                    </TabsContent>
                  </Tabs>
                ) : (
                  <div className="flex-1 grid grid-cols-2 gap-4">
                    <label className="flex-1 flex items-center justify-center border-2 border-dashed rounded cursor-pointer hover:bg-secondary/50 transition-colors">
                      <div className="text-center">
                        <Code2 className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          Upload Python File (.py)
                        </span>
                        <input
                          type="file"
                          className="hidden"
                          accept=".py"
                          onChange={handleFileUpload}
                        />
                      </div>
                    </label>
                    <label className="flex-1 flex items-center justify-center border-2 border-dashed rounded cursor-pointer hover:bg-secondary/50 transition-colors">
                      <div className="text-center">
                        <FileText className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          Upload Requirements (.txt)
                        </span>
                        <input
                          type="file"
                          className="hidden"
                          accept=".txt"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              file.text().then(setRequirements);
                            }
                          }}
                        />
                      </div>
                    </label>
                  </div>
                )}

                <div className="flex space-x-4 mt-4">
                  <Button
                    onClick={handleRunLocally}
                    disabled={isLoading || !code}
                    variant="secondary"
                    className="space-x-2"
                  >
                    <PlayCircle className="w-4 h-4" />
                    <span>Run Locally</span>
                  </Button>
                  <Button
                    onClick={handleDistribute}
                    disabled={isLoading || !code || nodeStatus === "offline"}
                    className="space-x-2"
                  >
                    <Network className="w-4 h-4" />
                    <span>Distribute to Network</span>
                  </Button>
                </div>

                {requirements && (
                  <Alert className="mt-4">
                    <AlertDescription className="text-sm">
                      Requirements will be installed in an isolated environment
                      before running the code.
                    </AlertDescription>
                  </Alert>
                )}
              </>
            )}

            <div className="mt-4">
              <div className="flex items-center space-x-2 mb-2">
                <Terminal className="w-4 h-4" />
                <span className="font-medium">Output</span>
              </div>
              <textarea
                value={output}
                readOnly
                className={`w-full font-mono text-sm p-4 rounded bg-secondary/50 resize-none h-full ${
                  isDockerMode ? "min-h-[35vh] " : "min-h-[18vh] "
                }focus:outline-none focus:ring-1`}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="col-span-1 h-full">
        <NetworkPanel
          userId={clientId}
          userName={user.displayName || clientId}
        />
      </div>

      {/* Task Details Dialog */}
      <Dialog open={!!selectedTask} onOpenChange={() => setSelectedTask(null)}>
        {selectedTask && (
          <TaskDetails
            task={selectedTask}
            onClose={() => setSelectedTask(null)}
          />
        )}
      </Dialog>
    </div>
  );
}
