// components/LeftSidebar.tsx
import React from "react";
import { Sun, Moon, LogOut, ArrowUpCircle, Wallet } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";

import { User } from "firebase/auth";
import { GithubRelease, Task, UserPoints } from "@/app/types/types";
import { TaskListItem } from "./TaskListItem";
import { DashCoinTransfer } from "./DashCoinTransfer";

interface LeftSidebarProps {
  user: User;
  isDarkMode: boolean;
  toggleTheme: () => void;
  handleLogout: () => void;
  hasUpdate: boolean;
  latestVersion: GithubRelease | null;
  clientId: string;
  nodeStatus: string;
  networkNodes: number;
  showAllTasks: boolean;
  setShowAllTasks: (show: boolean) => void;
  filteredTasks: Task[];
  setSelectedTask: (task: Task | null) => void;
  walletAddress: string;
  isConnecting: boolean;
  connectWallet: () => void;
  userPoints: UserPoints;
}

export const LeftSidebar: React.FC<LeftSidebarProps> = ({
  user,
  isDarkMode,
  toggleTheme,
  handleLogout,
  hasUpdate,
  latestVersion,
  clientId,
  nodeStatus,
  networkNodes,
  showAllTasks,
  setShowAllTasks,
  filteredTasks,
  setSelectedTask,
  walletAddress,
  isConnecting,
  connectWallet,
  userPoints
}) => {
  return (
    <div className="flex w-80 flex-col border-r">
      <Card className="rounded-none border-0 border-b">
        <CardHeader className="p-4">
          {/* Header content */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CardTitle className="text-lg">DASH</CardTitle>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="icon" onClick={toggleTheme}>
                {isDarkMode ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                className="text-red-500 hover:text-red-600"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Update button */}
          {hasUpdate && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(latestVersion?.html_url, "_blank")}
              className="text-primary hover:text-primary-foreground"
            >
              <ArrowUpCircle className="mr-2 h-4 w-4" />
              Update Available
            </Button>
          )}

          {/* User info */}
          <div className="mt-2 text-sm text-muted-foreground">{"Email : " +user.email}</div>
          <div className="mt-2 text-sm text-muted-foreground">
            {"Client ID : " + clientId?.replaceAll("-", "")}
          </div>
          <div className="mt-2 text-sm text-muted-foreground">
            {"User ID : " + user.uid}
          </div>
          <div className="mt-2 text-sm text-muted-foreground">
            {"Wallet : " + userPoints.totalPoints + " DASH Coins"}
          </div>

          {/* Dash Coin Transfer Button */}
          <div className="mt-4">
            <DashCoinTransfer 
              userPoints={userPoints} 
              userId={user.uid} 
            />
          </div>

          {/* Wallet connection */}
          <div className="mt-4 hidden">
            <Button
              variant="outline"
              size="sm"
              onClick={connectWallet}
              disabled={isConnecting}
              className="w-full"
            >
              <Wallet className="mr-2 h-4 w-4" />
              {isConnecting
                ? "Connecting..."
                : walletAddress
                  ? "Connected"
                  : "Connect Wallet"}
            </Button>
            {walletAddress && (
              <div className="mt-2 truncate text-xs text-muted-foreground">
                {`Wallet: ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`}
              </div>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Status section */}
      <div className="border-b p-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Status</span>
            <div className="flex items-center space-x-2">
              <div
                className={`h-2 w-2 rounded-full ${
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
            <span className="text-sm text-muted-foreground">Active Nodes</span>
            <span className="text-sm">{networkNodes}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Show All Tasks
            </span>
            <Switch checked={showAllTasks} onCheckedChange={setShowAllTasks} />
          </div>
        </div>
      </div>

      {/* Tasks list */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          <h3 className="mb-3 text-sm font-medium">Recent Tasks</h3>
          <div className="space-y-2">
            {filteredTasks.map((task) => (
              <div  key={`${task.id}-${task.status}-${task.createdAt}`}>
              
              <TaskListItem
               
                task={task}
                onClick={() => setSelectedTask(task)}
              />
              </div>
            ))}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};
