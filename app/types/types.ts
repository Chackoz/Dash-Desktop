import { User } from "firebase/auth";

// Auth & User Related Types
export interface UserInfoProps {
  user: User;
  isDarkMode: boolean;
  toggleTheme: () => void;
  handleLogout: () => void;
  clientId: string;
  hasUpdate: boolean;
  latestVersion?: GithubRelease | null;
}

// System & Configuration Types
export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId: string;
}

export interface SystemMetadata {
  os: string;
  cpu: string;
  ram: string;
  gpu?: string;
  gpuVram?: string;
  docker?: boolean;
  python?: string;
  node?: string;
  rust?: string;
}

export interface SystemSpecs extends SystemMetadata {
  email?: string;
  displayName?: string;
}

export interface SystemError {
  type:
    | "docker"
    | "python"
    | "hardware"
    | "general"
    | "warning"
    | "destructive"
    | "update";
  message: string;
  details?: string;
  severity: "critical" | "warning" | "destructive";
  action?: React.ReactNode;
}

// Docker Related Types
export interface DockerConfig {
  image: string;
  command?: string[];
  memoryLimit?: string;
  cpuLimit?: string;
  timeLimit?: string;
}

// Task Related Types
export type TaskStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "assigned";

export interface UserPoints {
  totalPoints: number;
  lastUpdated: string;
}

export interface Task {
  id?: string;
  clientId: string;
  code?: string;
  status: TaskStatus;
  output?: string | null;
  createdAt: string;
  updatedAt?: string;
  workerId?: string;
  doneUserId?: string;
  error?: string;
  requirements?: string;
  dockerConfig?: DockerConfig;
  taskType: "code" | "docker";
  assignedTo?: string;
  timeLimit?: string;
  userId?: string;
  completedAt?: string;
}

// Network & Node Related Types
export type NodeStatus = "idle" | "online" | "offline" | "busy";
export type NodeType = "client" | "worker";

export interface NetworkNode {
  id?: string;
  status?: NodeStatus;
  lastSeen?: string;
  type?: NodeType;
  connections?: string[];
  metadata?: {
    cpu?: number;
    memory?: number;
    tasks?: number;
  };
}

export interface PresenceData {
  status: NodeStatus;
  lastSeen: string;
  type: NodeType;
  email: string;
  userId?: string;
  systemMetadata?: SystemMetadata;
}

// Chat Related Types
export interface ChatMessage {
  id?: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: string;
  type: "message" | "status";
}

// UI Component Props
export interface DashNetworkProps {
  user: User;
}

export interface LoadingPageProps {
  onLoadingComplete: () => void;
  currentVersion: string;
}

// GitHub Related Types
export interface GithubRelease {
  tag_name: string;
  html_url: string;
  body: string;
}



// Network Stats Related Types
export interface NetworkChatProps {
  userId: string;
  userName: string;
}

export interface MessagesData {
  [key: string]: Omit<ChatMessage, "id">;
}

export interface NetworkStats {
  activeUsers: number;
  totalTasksToday: number;
  averageLatency: number;
  tasksLastHour: number;
  timestamp: number;
}

export interface PresenceNode {
  type: "client" | "server";
  lastSeen: string;
  status: string;
  userId?: string;
}

export interface MessageData {
  timestamp: string;
  senderId: string;
  senderName: string;
  content: string;
}