import { FirebaseApp, getApps, initializeApp } from "firebase/app";
//import { getAnalytics } from "firebase/analytics";
import { Database, getDatabase, push, ref, set, update } from "firebase/database";
import { Auth, getAuth } from 'firebase/auth';

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase with safety checks
let app: FirebaseApp | undefined;
let database: Database | undefined;
let auth: Auth | undefined;

if (typeof window !== 'undefined' && !getApps().length) {
    try {
        app = initializeApp(firebaseConfig);
        database = getDatabase(app);
        auth = getAuth(app);
    } catch (error) {
        console.error('Firebase initialization error:', error);
    }
}

// Type assertion to maintain compatibility with existing code
export { app, database, auth };

export interface DockerConfig {
  image: string;
  command?: string[];
  memoryLimit?: string;
  cpuLimit?: string;
  timeLimit?: string;
}


export interface Task {
  id?: string;
  clientId: string;
  code?: string;
  status: 'pending' | 'running' | 'completed' | 'failed'|'assigned';
  output?: string | null;
  createdAt: string;
  updatedAt?: string;
  workerId?: string;
  error?: string;
  requirements?: string;
  dockerConfig?: DockerConfig;
  taskType: 'code' | 'docker';
  assignedTo?: string;
  timeLimit?:string;
  userId?:string;
}

export async function createTask(
  clientId: string, 
  code: string | null, 
  requirements?: string,
  dockerConfig?: DockerConfig
): Promise<string | null> {
  if (!database) {
      console.error('Firebase database not initialized');
      return null;
  }
  
  const tasksRef = ref(database, 'tasks');
  const newTaskRef = push(tasksRef);
  const userId = auth?.currentUser?.uid;
  const task: Task = {
      clientId,
      status: 'pending',
      output: null,
      createdAt: new Date().toISOString(),
      taskType: dockerConfig ? 'docker' : 'code',
      userId: userId,
  };

  if (code) {
      task.code = code;
      task.requirements = requirements;
  }

  if (dockerConfig) {
      task.dockerConfig = dockerConfig;
  }
  
  try {
      await set(newTaskRef, task);
      return newTaskRef.key;
  } catch (error) {
      console.error('Error creating task:', error);
      return null;
  }
}

export type NodeStatus = "idle" | "online" | "offline" | "busy";

export const updateNodeStatus = async (
  clientId: string,
  status: NodeStatus
): Promise<void> => {
  if (!database) {
      throw new Error('Firebase database not initialized');
  }
  
  if (clientId === null || clientId === undefined || clientId === "") {
      throw new Error(`Client ID is required`);
  }

  const presenceRef = ref(database, `presence/${clientId}`);
  
  try {
      await update(presenceRef, {
          status,
          lastSeen: new Date().toISOString(),
          type: "client"
      });
  } catch (error) {
      console.error("Error updating node status:", error);
      throw new Error(`Failed to update status: ${(error as Error).message}`);
  }
};



  export interface ChatMessage {
    id?: string;
    senderId: string;
    senderName: string;
    content: string;
    timestamp: string;
    type: 'message' | 'status';
  }
  
  export interface NetworkNode {
    id?: string;
    status?: NodeStatus;
    lastSeen?: string;
    type?: 'client' | 'worker';
    connections?: string[];
    metadata?: {
      cpu?: number;
      memory?: number;
      tasks?: number;
    };
  }

  export async function sendChatMessage(senderId: string, senderName: string, content: string): Promise<string | null> {
    if (!database) {
        console.error('Firebase database not initialized');
        return null;
    }
  
    const messagesRef = ref(database, 'messages');
    const newMessageRef = push(messagesRef);
    const message: ChatMessage = {
        senderId,
        senderName,
        content,
        timestamp: new Date().toISOString(),
        type: 'message'
    };
    
    try {
        await set(newMessageRef, message);
        return newMessageRef.key;
    } catch (error) {
        console.error('Error sending message:', error);
        return null;
    }
  }

  export async function updateNodeMetadata(nodeId: string, metadata: Partial<NetworkNode['metadata']>): Promise<void> {
    if (!database) {
        throw new Error('Firebase database not initialized');
    }

    const nodeRef = ref(database, `presence/${nodeId}`);
    try {
        await update(nodeRef, {
            metadata: metadata,
            lastSeen: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error updating node metadata:', error);
        throw error;
    }
}