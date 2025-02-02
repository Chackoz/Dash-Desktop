import { Task } from "@/app/types/types";
import TaskStatus from "./TaskStatus";
import React from "react";

interface TaskListItemProps {
  task: Task;
  onClick: () => void;
}

export const TaskListItem: React.FC<TaskListItemProps> = React.memo(
  ({ task, onClick }) => {
    return (
      <button
        onClick={onClick}
        className="w-full rounded bg-secondary/50 p-3 text-left transition-colors hover:bg-secondary"
      >
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <TaskStatus status={task.status} output={task.output} />
            <div className="text-md truncate font-mono text-muted-foreground">
              {`Status: ${task.status}`}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <span className="text-xs text-muted-foreground">
            {new Date(task.createdAt).toLocaleTimeString()}
          </span>
          <span className="text-xs text-muted-foreground">
            {new Date(task.createdAt).toLocaleDateString()}
          </span>
        </div>
      </button>
    );
  },
);

TaskListItem.displayName = "TaskListItem";
