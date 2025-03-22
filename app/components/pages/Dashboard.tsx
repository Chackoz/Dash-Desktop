"use client";

import React, { useState, useEffect, useMemo } from "react";
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
  Terminal,
  Upload,
  Code2,
  PlayCircle,
  Network,
  FileText,
  Loader,
  AlertCircle,
} from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useTheme } from "./ThemeProvider";
import { currentDASHVersion } from "../../data/data";
import {
  DashNetworkProps,
  DockerConfig,
  GithubRelease,
  PresenceData,
  SystemMetadata,
  Task,
  NodeStatus,
  UserPoints,
} from "../../types/types";
import { signOut } from "firebase/auth";
import { firebaseService } from "../../services/firebase";
import { TaskService } from "../../services/task";
import { NodeService } from "../../services/node";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import NetworkPanel from "./NetworkPanel";
import { LeftSidebar } from ".././ui/LeftSideBar";
import { DockerForm } from ".././ui/DockerForm";
import { CodeEditor } from ".././ui/CodeEditor";
import { TaskDetails } from ".././ui/TaskDetails";

const auth = firebaseService.auth;
const database = firebaseService.database;

const updateNodeStatus = NodeService.updateNodeStatus;
const createTask = TaskService.createTask;

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string }) => Promise<string[]>;
      on: (event: string, handler: (accounts: string[]) => void) => void;
    };
  }
}

export default function DashNetwork({ user }: DashNetworkProps) {
  // Editor State
  const [code, setCode] = useState("");
  const [requirements, setRequirements] = useState("");
  const [output, setOutput] = useState("");
  const [currentEditor, setCurrentEditor] = useState<"code" | "requirements">(
    "code",
  );

  // UI State
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"editor" | "upload">("editor");
  const [nodeStatus, setNodeStatus] = useState<NodeStatus>("idle");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showAllTasks, setShowAllTasks] = useState(false);

  // Network State
  const [clientId, setClientId] = useState("");
  const [recentTasks, setRecentTasks] = useState<Task[]>([]);
  const [networkNodes, setNetworkNodes] = useState(0);

  // Docker State
  const [isDockerMode, setIsDockerMode] = useState(false);
  const [dockerImage, setDockerImage] = useState("");
  const [dockerCommand, setDockerCommand] = useState("");
  const [memoryLimit, setMemoryLimit] = useState("512m");
  const [cpuLimit, setCpuLimit] = useState("1");
  const [isStoppingContainer, setIsStoppingContainer] = useState(false);
  const [userPoints, setUserPoints] = useState<UserPoints>({ totalPoints: 0, lastUpdated: '' });

  // Version Control State
  const [latestVersion, setLatestVersion] = useState<GithubRelease | null>(
    null,
  );
  const [currentVersion, setCurrentVersion] = useState(currentDASHVersion);
  const [hasUpdate, setHasUpdate] = useState(false);

  // Wallet State
  const [walletAddress, setWalletAddress] = useState<string>("");
  const [isConnecting, setIsConnecting] = useState(false);

  const { isDarkMode, toggleTheme } = useTheme();


  const fetchUserPoints = async () => {
    if (!user.uid) return;
    try {
      const points = await TaskService.getUserPoints(user.uid);
      setUserPoints(points);
    } catch (error) {
      console.error('Error fetching user points:', error);
    }
  };

  // Version Check Effect
  useEffect(() => {
    const checkForUpdates = async () => {
      try {
        const response = await fetch(
          "https://api.github.com/repos/Chackoz/Dash-Desktop/releases/latest",
        );
        if (!response.ok) throw new Error("Failed to fetch latest release");

        const release: GithubRelease = await response.json();
        setLatestVersion(release);

        const current = currentVersion.replace(/[^0-9.]/g, "");
        const latest = release.tag_name.replace(/[^0-9.]/g, "");
        setCurrentVersion(current);
        setHasUpdate(current < latest);
      } catch (error) {
        console.error("Failed to check for updates:", error);
      }
    };

    checkForUpdates();
  }, [currentVersion]);

  // Network Presence Effect
  useEffect(() => {
    if (!database) return;

    const presenceRef = ref(database, "presence");
    const connectRef = ref(database, ".info/connected");
    const clientTasksRef = ref(database, "tasks");

    // Generate or retrieve client ID
    const storedClientId =
      localStorage.getItem("clientId") || push(presenceRef).key || "";
    localStorage.setItem("clientId", storedClientId);
    setClientId(storedClientId);

    const setupPresence = async () => {
      if (!storedClientId || !database) return;

      const clientPresenceRef = ref(database, `presence/${storedClientId}`);
      const systemMetadata = await invoke<SystemMetadata>("get_system_specs");

      const presenceData: PresenceData = {
        status: "idle",
        lastSeen: new Date().toISOString(),
        type: "client",
        userId: user.uid,
        email: user.email || "",
        systemMetadata,
      };

      await set(clientPresenceRef, presenceData);
      onDisconnect(clientPresenceRef).remove();

      const interval = setInterval(() => {
        update(clientPresenceRef, {
          lastSeen: new Date().toISOString(),
        });
      }, 30000);

      return () => clearInterval(interval);
    };

    let presenceCleanup: (() => void) | undefined;

    const handleConnection = async (snapshot: DataSnapshot) => {
      if (snapshot.val()) {
        presenceCleanup = await setupPresence();
        setNodeStatus("online");
      } else {
        presenceCleanup?.();
        setNodeStatus("offline");
      }
    };

    const handlePresence = (snapshot: DataSnapshot) => {
      const presenceData = snapshot.val();
      if (!presenceData) {
        setNetworkNodes(0);
        return;
      }

      const activeNodes = Object.entries(presenceData).filter(([_, data]) => {
        console.log(_);
        const presence = data as PresenceData;
        return (
          presence.lastSeen &&
          presence.status &&
          presence.type === "client" &&
          new Date().getTime() - new Date(presence.lastSeen).getTime() < 60000
        );
      }).length;

      setNetworkNodes(activeNodes);
    };

    const handleTasks = async (snapshot: DataSnapshot) => {
      const tasks = snapshot.val();
      if (!tasks) return;

      Object.entries(tasks).forEach(async ([taskId, task]) => {
        const typedTask = task as Task;
        if (
          typedTask.assignedTo === storedClientId &&
          typedTask.status === "assigned"
        ) {
          await executeTask(taskId, typedTask);
        }
      });

      const tasksList = Object.entries(tasks)
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        .map(([_, data]) => ({ ...(data as Task) }))
        .filter((task) => task.userId === user.uid)
        .filter((task) => showAllTasks || task.clientId === storedClientId)
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );

      setRecentTasks(tasksList);
    };

    onValue(connectRef, handleConnection);
    onValue(presenceRef, handlePresence);
    onValue(clientTasksRef, handleTasks);

    return () => {
      presenceCleanup?.();
      off(connectRef);
      off(presenceRef);
      off(clientTasksRef);
    };
  }, [showAllTasks, user.uid, user.email]);

  // Handlers
  const handleLogout = async () => {
    try {
      if (auth) {
        await signOut(auth);
      }
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

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
        `Running code locally...\nRequirements:\n${requirements}\n\n${result}`,
      );
    } catch (error) {
      setOutput(`Error: ${(error as Error).toString()}`);
    } finally {
      setIsLoading(false);
      setNodeStatus("idle");
      updateNodeStatus(clientId, "idle");
    }
  };

  const handleDistribute = async () => {
    setOutput("");
    if (nodeStatus === "offline" || !clientId) {
      setOutput("Error: Cannot distribute task. Please check your connection.");
      return;
    }

    if (isDockerMode) {
      await handleDockerDistribution();
    } else {
      await handleCodeDistribution();
    }
  };

  const handleStopContainer = async (taskId?: string) => {
    setIsStoppingContainer(true);
    try {
      const result = await invoke<string>("stop_docker_container", {
        containerId: taskId ? taskId : "df",
      });
      setOutput(`Stop container result: ${result}`);
      if (!database) {
        return;
      }
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

  const handleDockerDistribution = async () => {
    const validationError = validateDockerConfig(
      dockerImage,
      memoryLimit,
      cpuLimit,
    );
    if (validationError) {
      setOutput(`Error: ${validationError}`);
      return;
    }

    setIsLoading(true);
    try {
      const dockerConfig: DockerConfig = {
        image: dockerImage,
        command: dockerCommand ? parseDockerCommand(dockerCommand) : [],
        memoryLimit,
        cpuLimit,
      };

      const taskId = await createTask(clientId, null, undefined, dockerConfig);
      if (!taskId) throw new Error("Failed to create Docker task");

      await monitorTask(taskId);
    } catch (error) {
      setOutput(`Error distributing Docker task: ${(error as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCodeDistribution = async () => {
    if (!code) {
      setOutput("Error: Please enter code to distribute.");
      return;
    }

    setIsLoading(true);
    try {
      const taskId = await createTask(clientId, code, requirements);
      await monitorTask(taskId);
    } catch (error) {
      setOutput(`Error distributing task: ${(error as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const monitorTask = async (taskId: string) => {
    if (!database) return;

    setOutput(
      `Task distributed successfully!\nTask ID: ${taskId}\nStatus: Pending\n`,
    );
    const taskRef = ref(database, `tasks/${taskId}`);

    onValue(taskRef, (snapshot) => {
      const task = snapshot.val();
      if (task && task.status !== "pending") {
        const statusInfo =
          `Task ${taskId}\n` +
          `Status: ${task.status}\n` +
          `Worker: ${task.assignedTo || "Unknown"}\n\n` +
          (task.error ? `Error: ${task.error}\n\n` : "") +
          (task.output || "");

        setOutput(statusInfo);

        if (task.status === "completed" || task.status === "failed") {
          off(taskRef);
        }
      }
    });
  };

  // Modify the executeTask function in DashNetwork
const executeTask = async (taskId: string, task: Task) => {
  setNodeStatus("busy");
  updateNodeStatus(clientId, "busy");
  const startTime = new Date().toISOString();

  try {
    if (!database) return;

    await update(ref(database, `tasks/${taskId}`), {
      status: "running",
      startedAt: startTime,
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
    } else if (task.code) {
      result = await invoke<string>("run_python_code", {
        code: task.code,
        requirements: task.requirements,
      });
    } else {
      throw new Error("Invalid task configuration");
    }

    const endTime = new Date().toISOString();
    
    // Calculate runtime and award points
    const runtime = Math.floor((new Date(endTime).getTime() - new Date(startTime).getTime()) / 1000);
    await TaskService.awardPoints(user.uid, runtime);

    await update(ref(database, `tasks/${taskId}`), {
      status: "completed",
      doneUserId: user.uid,
      output: result,
      completedAt: endTime,
      runtime: runtime // Store runtime for reference
    });

    // Refresh user points after task completion
    await fetchUserPoints();

  } catch (error) {
    if (!database) return;

    await update(ref(database, `tasks/${taskId}`), {
      status: "failed",
      doneUserId: user.uid,
      output: `Error: ${(error as Error).toString()}`,
      completedAt: new Date().toISOString(),
    });
  } finally {
    setNodeStatus("idle");
    updateNodeStatus(clientId, "idle");
  }
};
useEffect(() => {
  if (!database || !user.uid) return;

  fetchUserPoints();

  const userPointsRef = ref(database, `userPoints/${user.uid}`);
  const unsubscribe = onValue(userPointsRef, (snapshot) => {
    const points = snapshot.val();
    if (points) {
      setUserPoints(points);
    }
  });

  return () => unsubscribe();
}, [user.uid]);

  // Memoized Values
  const filteredTasks = useMemo(
    () =>
      recentTasks
        .filter((task) => showAllTasks || task.clientId === clientId)
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        ),
    [recentTasks, showAllTasks, clientId],
  );

  const connectWallet = async () => {
    if (typeof window.ethereum === "undefined") {
      setOutput("Please install MetaMask to use this feature.");
      return;
    }

    setIsConnecting(true);
    try {
      // Request account access
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      setWalletAddress(accounts[0]);
      setOutput(`Wallet connected: ${accounts[0]}`);

      // Listen for account changes
      window.ethereum.on("accountsChanged", (newAccounts: string[]) => {
        setWalletAddress(newAccounts[0]);
      });
    } catch (error) {
      setOutput(`Error connecting wallet: ${(error as Error).message}`);
    } finally {
      setIsConnecting(false);
    }
  };

  const validateDockerConfig = (
    image: string,
    memoryLimit: string,
    cpuLimit: string,
  ): string | null => {
    if (!image) {
      return "Docker image is required";
    }

    // Validate memory limit format (e.g., "512m", "1g")
    const memoryRegex = /^\d+[mg]$/i;
    if (!memoryRegex.test(memoryLimit)) {
      return "Invalid memory limit format. Use format like '512m' or '1g'";
    }

    // Validate CPU limit as a number
    const cpuNumber = parseFloat(cpuLimit);
    if (isNaN(cpuNumber) || cpuNumber <= 0) {
      return "CPU limit must be a positive number";
    }

    return null;
  };

  // Parse docker command into array
  const parseDockerCommand = (command: string): string[] => {
    // Handle quoted strings and split by spaces
    const regex = /[^\s"']+|"([^"]*)"|'([^']*)'/g;
    const parts: string[] = [];
    let match: RegExpExecArray | null;

    while ((match = regex.exec(command)) !== null) {
      // If we matched a quoted string, use the captured group
      if (match[1] || match[2]) {
        parts.push(match[1] || match[2] || "");
      } else {
        parts.push(match[0]);
      }
    }

    return parts;
  };

  // File upload handler
  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      setCode(text);

      // Extract requirements from comments if present
      const requirementsMatch = text.match(/^#\s*requirements:(.+)$/m);
      if (requirementsMatch) {
        setRequirements(requirementsMatch[1].trim());
      }

      setActiveTab("editor");
    } catch (error) {
      setOutput(`Error reading file: ${(error as Error).message}`);
    }
  };

  return (
    <div className="flex h-screen bg-background text-foreground">
      {/* Left Sidebar */}
      <LeftSidebar
        user={user}
        isDarkMode={isDarkMode}
        toggleTheme={toggleTheme}
        handleLogout={handleLogout}
        hasUpdate={hasUpdate}
        latestVersion={latestVersion}
        clientId={clientId}
        nodeStatus={nodeStatus}
        networkNodes={networkNodes}
        showAllTasks={showAllTasks}
        setShowAllTasks={setShowAllTasks}
        filteredTasks={filteredTasks}
        setSelectedTask={setSelectedTask}
        walletAddress={walletAddress}
        isConnecting={isConnecting}
        connectWallet={connectWallet}
        userPoints={userPoints}
      />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col">
        <div className="border-b p-4">
          <div className="relative flex h-8 w-full items-center justify-between">
            {!isDockerMode && (
              <div className="flex space-x-4">
                <Button
                  variant={activeTab === "editor" ? "secondary" : "ghost"}
                  onClick={() => setActiveTab("editor")}
                  className="space-x-2"
                >
                  <Code2 className="h-4 w-4" />
                  <span>Editor</span>
                </Button>
                <Button
                  variant={activeTab === "upload" ? "secondary" : "ghost"}
                  onClick={() => setActiveTab("upload")}
                  className="space-x-2"
                >
                  <Upload className="h-4 w-4" />
                  <span>Upload</span>
                </Button>
              </div>
            )}
            <div className="absolute right-4 flex items-center space-x-2">
              <Terminal className="h-4 w-4" />
              <span className="text-sm">Docker Mode</span>
              <Switch
                checked={isDockerMode}
                onCheckedChange={setIsDockerMode}
              />
            </div>

            <Button
              variant="destructive"
              size="sm"
              onClick={() => handleStopContainer("df")}
              disabled={isStoppingContainer}
              className="hidden items-center gap-2"
            >
              {isStoppingContainer ? (
                <Loader className="h-4 w-4 animate-spin" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <span>Stop Container</span>
            </Button>
          </div>
        </div>

        <div className="flex-1 p-6">
          <div className="flex h-full flex-col">
            {isDockerMode ? (
              <DockerForm
                dockerImage={dockerImage}
                setDockerImage={setDockerImage}
                dockerCommand={dockerCommand}
                setDockerCommand={setDockerCommand}
                memoryLimit={memoryLimit}
                setMemoryLimit={setMemoryLimit}
                cpuLimit={cpuLimit}
                setCpuLimit={setCpuLimit}
                handleRunDocker={handleRunLocally}
                handleDistribute={handleDistribute}
                isLoading={isLoading}
                nodeStatus={nodeStatus}
              />
            ) : (
              <>
                {activeTab === "editor" ? (
                  <CodeEditor
                    code={code}
                    setCode={setCode}
                    requirements={requirements}
                    setRequirements={setRequirements}
                    currentEditor={currentEditor}
                    setCurrentEditor={setCurrentEditor}
                    handleRunLocally={handleRunLocally}
                    handleDistribute={handleDistribute}
                    isLoading={isLoading}
                    nodeStatus={nodeStatus}
                  />
                ) : (
                  <div className="grid flex-1 grid-cols-2 gap-4">
                    <label className="flex flex-1 cursor-pointer items-center justify-center rounded border-2 border-dashed transition-colors hover:bg-secondary/50">
                      <div className="text-center">
                        <Code2 className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
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
                    <label className="flex flex-1 cursor-pointer items-center justify-center rounded border-2 border-dashed transition-colors hover:bg-secondary/50">
                      <div className="text-center">
                        <FileText className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
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

                <div className="mt-4 flex space-x-4">
                  <Button
                    onClick={handleRunLocally}
                    disabled={isLoading || !code}
                    variant="secondary"
                    className="space-x-2"
                  >
                    <PlayCircle className="h-4 w-4" />
                    <span>Run Locally</span>
                  </Button>
                  <Button
                    onClick={handleDistribute}
                    disabled={isLoading || !code || nodeStatus === "offline"}
                    className="space-x-2"
                  >
                    <Network className="h-4 w-4" />
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

            <div
              className={`mt-4 h-full ${
                isDockerMode ? "max-h-[50%]" : "max-h-[30%]"
              }`}
            >
              <div className="mb-2 flex items-center space-x-2">
                <Terminal className="h-4 w-4" />
                <span className="font-medium">Output</span>
              </div>
              <textarea
                value={output}
                readOnly
                className={`h-full w-full resize-none rounded bg-secondary/50 p-4 font-mono text-sm ${
                  isDockerMode ? "min-h-[35vh]" : "min-h-[18vh]"
                }focus:outline-none focus:ring-1`}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="col-span-1 h-full">
        <NetworkPanel
          userId={user.uid}
          userName={user.displayName || user.uid}
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
