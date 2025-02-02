
import { Task } from '@/app/types/types';
import { CheckCircle, Clock, Loader, Timer, XCircle } from 'lucide-react';
import React from 'react'


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
      <Icon className={`h-4 w-4 ${config.animate ? "animate-spin" : ""}`} />
    </div>
  );
});

TaskStatus.displayName = "TaskStatus";

export default TaskStatus