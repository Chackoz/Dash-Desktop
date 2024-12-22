"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
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
import { dracula } from "@uiw/codemirror-theme-dracula";

interface Task {
  id: string;
  status: "pending" | "completed" | "failed" | "running" | "assigned";
  createdAt: string;
  output?: string;
  workerId?: string;
  assignedTo?: string;
  assignedAt?: string;
  clientId?: string;
  code?: string;
  requirements?: string;
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

const TaskDetails: React.FC<{ task: Task; onClose: () => void }> = React.memo(
  ({ task }) => (
    <DialogContent className="min-w-[70%] h-fit max-h-[90%]  rounded-3xl overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Task Details</DialogTitle>
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
            {task.id}
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
              theme={dracula}
              extensions={[python()]}
              editable={false}
              className="text-xs"
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

export default function DashNetwork() {
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
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [currentEditor, setCurrentEditor] = useState<"code" | "requirements">(
    "code"
  );

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDarkMode);
  }, [isDarkMode]);

  // Network setup effect
  useEffect(() => {
    const presenceRef = ref(database, "presence");
    const connectRef = ref(database, ".info/connected");
    const clientTasksRef = ref(database, "tasks");

    // Generate or retrieve client ID
    const newClientId =
      localStorage.getItem("clientId") || push(presenceRef).key || "";
    localStorage.setItem("clientId", newClientId);
    setClientId(newClientId);

    // Set up presence
    const setupPresence = () => {
      set(ref(database, `presence/${newClientId}`), {
        status: "idle",
        lastSeen: new Date().toISOString(),
        type: "client",
      });
    };

    setupPresence();

    // Connection handler
    const handleConnection = (snapshot: DataSnapshot) => {
      if (snapshot.val()) {
        onDisconnect(ref(database, `presence/${newClientId}`)).remove();
        setNodeStatus("online");
      } else {
        setNodeStatus("offline");
      }
    };

    // Presence handler
    const handlePresence = (snapshot: DataSnapshot) => {
      setNetworkNodes(snapshot.val() ? Object.keys(snapshot.val()).length : 0);
    };

    // Tasks handler
    const handleTasks = async (snapshot: DataSnapshot) => {
      const tasks = snapshot.val();
      if (!tasks) return;

      // Process assigned tasks
      Object.entries(tasks).forEach(async ([taskId, task]) => {
        const typedTask = task as Task;
        if (
          typedTask.assignedTo === newClientId &&
          typedTask.status === "assigned" &&
          typedTask.code
        ) {
          await executeTask(taskId, typedTask);
        }
      });

      // Update recent tasks
      const tasksList = Object.entries(tasks)
        .map(([id, data]) => ({
          id,
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
      off(connectRef);
      off(presenceRef);
      off(clientTasksRef);
    };
  }, [showAllTasks]);

  // Task execution helper
  const executeTask = async (taskId: string, task: Task) => {
    
    updateNodeStatus(clientId, "busy");
    setNodeStatus("busy");
    try {
      await update(ref(database, `tasks/${taskId}`), {
        status: "running",
        startedAt: new Date().toISOString(),
      });

      const result = await invoke<string>("run_python_code", {
        code: task.code,
        requirements: task.requirements,
      });

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
    
    updateNodeStatus(clientId, "idle");
    setNodeStatus("idle");
  };

  // Task handlers
  const handleRunLocally = async () => {
    if (!code) {
      setOutput("Please enter some code first.");
      return;
    }
    setOutput(`Running code locally...\nRequirements:\n${requirements}`);
    setIsLoading(true);
    setNodeStatus("busy");
    updateNodeStatus(clientId , "busy");
    try {
      const result = await invoke<string>("run_python_code", {
        code,
        requirements,
      });
      setOutput(
        `Running code locally...\nRequirements:\n${requirements}\nOutput:\n` +
          result
      );
    } catch (error) {
      setOutput(`Error: ${(error as Error).toString()}`);
    } finally {
      setIsLoading(false);
    }
    setNodeStatus("idle");
    updateNodeStatus(clientId , "idle");
  };

  const handleDistribute = async () => {
    if (!code || nodeStatus === "offline" || !clientId) {
      setOutput(
        "Error: Cannot distribute task. Please check your connection and code."
      );
      return;
    }

    setIsLoading(true);
    try {
      const taskId = await createTask(clientId, code, requirements);
      setOutput(
        `Task distributed successfully!\nTask ID: ${taskId}\nStatus: Pending\n`
      );

      const taskRef = ref(database, `tasks/${taskId}`);
      onValue(taskRef, (snapshot) => {
        const task = snapshot.val();
        if (task && task.status !== "pending") {
          setOutput(
            `Task ${taskId}\nStatus: ${task.status}\nWorker: ${
              task.assignedTo || "Unknown"
            }\n${task.output || ""}`
          );
        }
      });
    } catch (error) {
      setOutput(`Error distributing task: ${(error as Error).message}`);
    } finally {
      setIsLoading(false);
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

  const filteredTasks = useMemo(
    () =>
      recentTasks.map((task) => ({
        ...task,
        id: task.id.replaceAll("-", ""),
      })),
    [recentTasks]
  );

  return (
    <div className="h-screen bg-background text-foreground flex">
      <div className="w-80 border-r flex flex-col">
        <Card className="rounded-none border-0 border-b">
          <CardHeader className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CardTitle className="text-lg">DASH</CardTitle>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsDarkMode(!isDarkMode)}
              >
                {isDarkMode ? (
                  <Sun className="w-4 h-4" />
                ) : (
                  <Moon className="w-4 h-4" />
                )}
              </Button>
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
                    <TaskStatus status={task.status} output={task.output} />
                    <div className="text-xs font-mono truncate text-muted-foreground">
                      {`Task: ${task.id}`}
                    </div>
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

      <div className="flex-1 flex flex-col">
        <div className="border-b p-4">
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
        </div>

        <div className="flex-1 p-6">
          <div className="h-full flex flex-col">
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
                    theme={dracula}
                    extensions={[python()]}
                    onChange={setCode}
                    className="flex-1"
                    height="400px"
                  />
                </TabsContent>
                <TabsContent value="requirements" className="flex-1 mt-4">
                  <textarea
                    value={requirements}
                    onChange={(e) => setRequirements(e.target.value)}
                    className="w-full h-[400px] font-mono text-sm p-4 rounded bg-secondary/50 resize-none focus:outline-none focus:ring-1"
                    placeholder="# Enter your requirements comma seperated
numpy==1.21.0
pandas>=1.3.0
requests"
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

            <div className="mt-4">
              <div className="flex items-center space-x-2 mb-2">
                <Terminal className="w-4 h-4" />
                <span className="font-medium">Output</span>
              </div>
              <textarea
                value={output}
                readOnly
                className="w-full font-mono text-sm p-4 rounded bg-secondary/50 resize-none h-48 focus:outline-none focus:ring-1"
              />
            </div>
          </div>
        </div>
      </div>

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
