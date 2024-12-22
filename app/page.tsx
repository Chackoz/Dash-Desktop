"use client";
import React, { useState, useEffect } from "react";
import {
  ref,
  onValue,
  set,
  push,
  onDisconnect,
  update,
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
} from "lucide-react";
import { createTask, database } from "@/app/utils/firebaseConfig";

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
}

type TaskStatusProps = {
  status: "completed" | "failed" | "running" | "pending" | "assigned";
};

const TaskStatus: React.FC<TaskStatusProps> = ({ status }) => {
  const getStatusDetails = () => {
    switch (status) {
      case "completed":
        return {
          icon: <CheckCircle className="w-4 h-4" />,
          color: "text-green-500",
        };
      case "assigned":
        return {
          icon: <CheckCircle className="w-4 h-4" />,
          color: "text-green-500",
        };
      case "failed":
        return { icon: <XCircle className="w-4 h-4" />, color: "text-red-500" };
      case "running":
        return {
          icon: <Loader className="w-4 h-4 animate-spin" />,
          color: "text-blue-500",
        };
      case "pending":
        return {
          icon: <Clock className="w-4 h-4 animate-spin" />,
          color: "text-blue-500",
        };
      default:
        console.log("Status", status);
        return { icon: <Timer className="w-4 h-4" />, color: "text-gray-500" };
    }
  };

  const { icon, color } = getStatusDetails();
  return <div className={`flex items-center ${color}`}>{icon}</div>;
};

export default function DashNetwork() {
  const [code, setCode] = useState<string>("");
  const [output, setOutput] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"editor" | "upload">("editor");
  const [nodeStatus, setNodeStatus] = useState<"idle" | "online" | "offline">(
    "idle"
  );
  const [clientId, setClientId] = useState<string>("");
  const [recentTasks, setRecentTasks] = useState<Task[]>([]);
  const [networkNodes, setNetworkNodes] = useState<number>(0);

  useEffect(() => {
    const setupNetwork = async () => {
      const presenceRef = ref(database, "presence");
      const connectRef = ref(database, ".info/connected");

      const newClientId =
        localStorage.getItem("clientId") || push(presenceRef).key;
      localStorage.setItem("clientId", newClientId ?? ""); // Add default empty string if null
      setClientId(newClientId ?? ""); // Ensure clientId is a string

      set(ref(database, `presence/${newClientId}`), {
        status: "idle",
        lastSeen: new Date().toISOString(),
        type: "client",
      });

      onValue(connectRef, (snapshot) => {
        if (snapshot.val()) {
          onDisconnect(ref(database, `presence/${newClientId}`)).remove();
          setNodeStatus("online");
        } else {
          setNodeStatus("offline");
        }
      });

      onValue(presenceRef, (snapshot) => {
        setNetworkNodes(
          snapshot.val() ? Object.keys(snapshot.val()).length : 0
        );
      });

      const clientTasksRef = ref(database, "tasks");

      onValue(clientTasksRef, async (snapshot) => {
        const tasks = snapshot.val();
        if (!tasks) return;

        // Check for tasks assigned to this client
        for (const [taskId, task] of Object.entries(tasks)) {
          const typedTask = task as Task;
          if (
            typedTask.assignedTo === clientId &&
            typedTask.status === "assigned" &&
            typedTask.code
          ) {
            // Execute the assigned task
            try {
              // Update status to running
              await update(ref(database, `tasks/${taskId}`), {
                status: "running",
                startedAt: new Date().toISOString(),
              });

              // Execute the code
              const result = await invoke<string>("run_python_code", {
                code: typedTask.code,
              });

              // Update with success
              await update(ref(database, `tasks/${taskId}`), {
                status: "completed",
                output: result,
                completedAt: new Date().toISOString(),
              });
            } catch (error) {
              // Update with failure
              await update(ref(database, `tasks/${taskId}`), {
                status: "failed",
                output: `Error: ${(error as Error).toString()}`,
                completedAt: new Date().toISOString(),
              });
            }
          }
        }

        // Update recent tasks list
        const tasksList: Task[] = Object.entries(tasks)
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          .map(([id, data]) => ({
            ...(data as Task),
          }))
          .sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )
          .slice(0, 5);
        console.log("Task", tasksList);
        setRecentTasks(tasksList);
      });
    };

    setupNetwork();
  }, [clientId]);

  const handleRunLocally = async () => {
    if (!code) {
      setOutput("Please enter some code first.");
      return;
    }

    setIsLoading(true);
    setOutput("Running locally...\n");

    try {
      const result = await invoke<string>("run_python_code", { code });
      setOutput(result);
    } catch (error) {
      setOutput(`Error: ${(error as Error).toString()}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDistribute = async () => {
    if (!code || nodeStatus === "offline" || !clientId) {
      setOutput(
        "Error: Cannot distribute task. Please check your connection and code."
      );
      return;
    }

    setIsLoading(true);
    setOutput("Distributing to network...\n");

    try {
      const taskId = await createTask(clientId, code);
      setOutput(
        `Task distributed successfully!\n` +
          `Task ID: ${taskId}\n` +
          `Status: Pending\n`
      );

      const taskRef = ref(database, `tasks/${taskId}`);
      onValue(taskRef, (snapshot) => {
        const task = snapshot.val();

        if (task && task.status !== "pending") {
          setOutput(
            `Task ${taskId}\n` +
              `Status: ${task.status}\n` +
              `Worker: ${task.assignedTo || "Unknown"}\n` +
              `${task.output || ""}`
          );
        }
      });
    } catch (error) {
      setOutput(`Error distributing task: ${(error as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-zinc-950 text-white">
      <div className="w-64 border-r border-zinc-800 flex flex-col">
        <div className="p-4 border-b border-zinc-800">
          <div className="flex items-center space-x-2">
            <Network className="w-5 h-5" />
            <span className="font-medium">DASH Network</span>
          </div>
        </div>

        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-400">Status</span>
            <div className="flex items-center space-x-2">
              <div
                className={`w-2 h-2 rounded-full ${
                  nodeStatus === "online"
                    ? "bg-green-500"
                    : nodeStatus === "offline"
                    ? "bg-red-500"
                    : "bg-yellow-500"
                }`}
              />
              <span className="text-sm capitalize">{nodeStatus}</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-400">Active Nodes</span>
            <span className="text-sm">{networkNodes}</span>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4">
          <h3 className="text-sm font-medium text-zinc-400 mb-3">
            Recent Tasks
          </h3>
          <div className="space-y-2">
            {recentTasks.map((task) => (
              <div
                key={task.id}
                className="p-3 rounded bg-zinc-900 border border-zinc-800"
              >
                <div className="flex items-center justify-between mb-2">
                  <TaskStatus status={task.status} />
                  <span className="text-xs text-zinc-500">
                    {new Date(task.createdAt).toLocaleTimeString()}
                  </span>
                </div>
                <div className="text-xs font-mono truncate text-zinc-400">
                  {task.id}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="border-b border-zinc-800 p-4">
          <div className="flex space-x-4">
            <button
              onClick={() => setActiveTab("editor")}
              className={`px-4 py-2 rounded flex items-center space-x-2 ${
                activeTab === "editor" ? "bg-zinc-800" : "hover:bg-zinc-900"
              }`}
            >
              <Code2 className="w-4 h-4" />
              <span>Editor</span>
            </button>
            <button
              onClick={() => setActiveTab("upload")}
              className={`px-4 py-2 rounded flex items-center space-x-2 ${
                activeTab === "upload" ? "bg-zinc-800" : "hover:bg-zinc-900"
              }`}
            >
              <Upload className="w-4 h-4" />
              <span>Upload</span>
            </button>
          </div>
        </div>

        <div className="flex-1 p-6">
          <div className="h-full flex flex-col">
            {activeTab === "editor" ? (
              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="flex-1 w-full font-mono text-sm p-4 rounded bg-zinc-900 border border-zinc-800 resize-none focus:outline-none focus:ring-1 focus:ring-zinc-700"
                placeholder="# Enter your Python code here..."
              />
            ) : (
              <label className="flex-1 flex items-center justify-center border-2 border-dashed border-zinc-800 rounded cursor-pointer hover:bg-zinc-900">
                <div className="text-center">
                  <Upload className="w-8 h-8 mx-auto mb-2 text-zinc-400" />
                  <span className="text-sm text-zinc-400">
                    Upload Python File (.py)
                  </span>
                  <input
                    type="file"
                    className="hidden"
                    accept=".py"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        file.text().then(setCode);
                      }
                    }}
                  />
                </div>
              </label>
            )}

            <div className="flex space-x-4 mt-4">
              <button
                onClick={handleRunLocally}
                disabled={isLoading || !code}
                className="px-4 py-2 rounded flex items-center space-x-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <PlayCircle className="w-4 h-4" />
                <span>Run Locally</span>
              </button>

              <button
                onClick={handleDistribute}
                disabled={isLoading || !code || nodeStatus === "offline"}
                className="px-4 py-2 rounded flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Network className="w-4 h-4" />
                <span>Distribute to Network</span>
              </button>
            </div>

            <div className="mt-4">
              <div className="flex items-center space-x-2 mb-2">
                <Terminal className="w-4 h-4" />
                <span className="font-medium">Output</span>
              </div>
              <textarea
                value={output}
                readOnly
                className="w-full font-mono text-sm p-4 rounded bg-zinc-900 border border-zinc-800 resize-none h-48 focus:outline-none focus:ring-1 focus:ring-zinc-700"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
