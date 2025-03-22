import { Task } from "@/app/types/types";
import { Button } from "@/components/ui/button";
import React from "react";
import CodeMirror from "@uiw/react-codemirror";
import { python } from "@codemirror/lang-python";
import { githubDark } from "@uiw/codemirror-theme-github";
import TaskStatus from "./TaskStatus";

interface TaskDetails {
  task: Task;
  onClose: () => void;
}

// Task Details Component
export const TaskDetails: React.FC<TaskDetails> = ({ task, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-3xl h-[80vh] rounded-lg bg-background flex flex-col">
        {/* Header - Fixed at top */}
        <div className="p-6 border-b flex items-center justify-between">
          <h2 className="text-xl font-semibold">Task Details</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
        
        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="flex items-center justify-start gap-2">
            <div>
              <h3 className="font-medium">Status</h3>
              <p className="text-sm text-muted-foreground">{task.status}</p>
            </div>
            <TaskStatus status={task.status} />
          </div>
          
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <h3 className="font-medium">Created At</h3>
                <p className="text-sm text-muted-foreground">
                  {new Date(task.createdAt).toLocaleString()}
                </p>
              </div>
              <div>
                <h3 className="font-medium">Client ID</h3>
                <p className="text-sm text-muted-foreground">
                  {task.clientId || "Hidden"}
                </p>
              </div>
              <div>
                <h3 className="font-medium">Worker ID</h3>
                <p className="text-sm text-muted-foreground">{task.assignedTo}</p>
              </div>
            </div>

            {task.code && (
              <div>
                <h3 className="font-medium">Code</h3>
                <CodeMirror
                  value={task.code}
                  theme={githubDark}
                  extensions={[python()]}
                  editable={false}
                  className="mt-2 rounded-md"
                />
              </div>
            )}
            {task.output && (
              <div>
                <h3 className="font-medium">Output</h3>
                <pre className="mt-2 max-h-60 overflow-auto rounded bg-secondary p-4">
                  <code className="text-sm">{task.output}</code>
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};