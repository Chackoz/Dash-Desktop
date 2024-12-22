import { initializeApp } from "firebase/app";
//import { getAnalytics } from "firebase/analytics";
import { getDatabase, push, ref, set } from "firebase/database";
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
//export const analytics = getAnalytics(app);
export const database = getDatabase(app);
export const auth = getAuth(app);

export interface Task {
    id?: string;
    clientId: string;
    code: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    output?: string | null;
    createdAt: string;
    updatedAt?: string;
    workerId?: string;
    error?: string;
    requirements?: string;
}

export async function createTask(clientId: string, code: string, requirements?: string): Promise<string | null> {
    const tasksRef = ref(database, 'tasks');
    const newTaskRef = push(tasksRef);
    const task: Task = {
        clientId,
        code,
        requirements,
        status: 'pending',
        output: null,
        createdAt: new Date().toISOString(),
    };
    
    try {
        await set(newTaskRef, task);
        return newTaskRef.key;
    } catch (error) {
        console.error('Error creating task:', error);
        return null;
    }
}

