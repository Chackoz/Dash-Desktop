import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Network, PlayCircle } from "lucide-react";

interface DockerFormProps {
    dockerImage: string;
    setDockerImage: (image: string) => void;
    dockerCommand: string;
    setDockerCommand: (command: string) => void;
    memoryLimit: string;
    setMemoryLimit: (limit: string) => void;
    cpuLimit: string;
    setCpuLimit: (limit: string) => void;
    handleRunDocker: () => void;
    handleDistribute: () => void;
    isLoading: boolean;
    nodeStatus: string;
  }
  
  export const DockerForm: React.FC<DockerFormProps> = ({
    dockerImage,
    setDockerImage,
    dockerCommand,
    setDockerCommand,
    memoryLimit,
    setMemoryLimit,
    cpuLimit,
    setCpuLimit,
    handleRunDocker,
    handleDistribute,
    isLoading,
    nodeStatus,
  }) => {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Docker Image</label>
            <input
              className="w-full rounded bg-secondary/50 px-3 py-2"
              placeholder="e.g., python:3.9-slim"
              value={dockerImage}
              onChange={(e) => setDockerImage(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Command (optional)</label>
            <input
              className="w-full rounded bg-secondary/50 px-3 py-2"
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
              className="w-full rounded bg-secondary/50 px-3 py-2"
              placeholder="e.g., 512m"
              value={memoryLimit}
              onChange={(e) => setMemoryLimit(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">CPU Limit</label>
            <input
              className="w-full rounded bg-secondary/50 px-3 py-2"
              placeholder="e.g., 1"
              value={cpuLimit}
              onChange={(e) => setCpuLimit(e.target.value)}
            />
          </div>
        </div>
  
        <Alert>
          <AlertDescription className="text-sm">
            Docker containers run with network disabled and limited privileges for security.
          </AlertDescription>
        </Alert>
        
        <div className="flex space-x-4">
          <Button
            onClick={handleRunDocker}
            disabled={isLoading || !dockerImage}
            variant="secondary"
            className="space-x-2"
          >
            <PlayCircle className="h-4 w-4" />
            <span>Run Docker Locally</span>
          </Button>
          <Button
            onClick={handleDistribute}
            disabled={isLoading || !dockerImage || nodeStatus === "offline"}
            className="space-x-2"
          >
            <Network className="h-4 w-4" />
            <span>Distribute Docker</span>
          </Button>
        </div>
      </div>
    );
  };
  