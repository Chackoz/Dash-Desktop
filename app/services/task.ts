import { ref, push, set, update, get, query, orderByChild, equalTo } from 'firebase/database';
import { firebaseService } from './firebase';
import { DockerConfig, Task} from '../types/types';

export class TaskService {
  static async createTask(
    clientId: string,
    code: string | null,
    requirements?: string,
    dockerConfig?: DockerConfig,
  ): Promise<string> {
    const database = firebaseService.database;
    const auth = firebaseService.auth;
    const tasksRef = ref(database, 'tasks');
    const newTaskRef = push(tasksRef);
    const userId = auth.currentUser?.uid;

    const task: Task = {
      clientId,
      status: 'pending',
      output: null,
      createdAt: new Date().toISOString(),
      taskType: dockerConfig ? 'docker' : 'code',
      userId,
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
      return newTaskRef.key!;
    } catch (error) {
      console.error('Error creating task:', error);
      throw new Error('Failed to create task');
    }
  }

  static async updateTaskStatus(
    taskId: string,
    status: Task['status'],
    output?: string,
    error?: string
  ): Promise<void> {
    const database = firebaseService.database;
    const taskRef = ref(database, `tasks/${taskId}`);

    const updates: Partial<Task> = {
      status,
      updatedAt: new Date().toISOString(),
    };

    if (output !== undefined) {
      updates.output = output;
    }

    if (error !== undefined) {
      updates.error = error;
    }

    try {
      await update(taskRef, updates);
    } catch (error) {
      console.error('Error updating task status:', error);
      throw new Error('Failed to update task status');
    }
  }

  static async assignTask(
    taskId: string,
    workerId: string
  ): Promise<void> {
    const database = firebaseService.database;
    const taskRef = ref(database, `tasks/${taskId}`);

    try {
      await update(taskRef, {
        status: 'assigned',
        workerId,
        assignedTo: workerId,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error assigning task:', error);
      throw new Error('Failed to assign task');
    }
  }

  static async getTasksByUserId(userId: string): Promise<Task[]> {
    const database = firebaseService.database;
    const tasksRef = ref(database, 'tasks');
    
    try {
      const tasksQuery = query(
        tasksRef,
        orderByChild('userId'),
        equalTo(userId)
      );
      
      const snapshot = await get(tasksQuery);
      const tasks: Task[] = [];
      
      snapshot.forEach((childSnapshot) => {
        tasks.push({
          id: childSnapshot.key!,
          ...childSnapshot.val()
        });
      });
      
      return tasks;
    } catch (error) {
      console.error('Error fetching tasks:', error);
      throw new Error('Failed to fetch tasks');
    }
  }

  static async getTaskById(taskId: string): Promise<Task | null> {
    const database = firebaseService.database;
    const taskRef = ref(database, `tasks/${taskId}`);

    try {
      const snapshot = await get(taskRef);
      if (snapshot.exists()) {
        return {
          id: snapshot.key!,
          ...snapshot.val()
        };
      }
      return null;
    } catch (error) {
      console.error('Error fetching task:', error);
      throw new Error('Failed to fetch task');
    }
  }

  static async getPendingTasks(): Promise<Task[]> {
    const database = firebaseService.database;
    const tasksRef = ref(database, 'tasks');
    
    try {
      const tasksQuery = query(
        tasksRef,
        orderByChild('status'),
        equalTo('pending')
      );
      
      const snapshot = await get(tasksQuery);
      const tasks: Task[] = [];
      
      snapshot.forEach((childSnapshot) => {
        tasks.push({
          id: childSnapshot.key!,
          ...childSnapshot.val()
        });
      });
      
      return tasks;
    } catch (error) {
      console.error('Error fetching pending tasks:', error);
      throw new Error('Failed to fetch pending tasks');
    }
  }

  static async deleteTask(taskId: string): Promise<void> {
    const database = firebaseService.database;
    const taskRef = ref(database, `tasks/${taskId}`);

    try {
      await set(taskRef, null);
    } catch (error) {
      console.error('Error deleting task:', error);
      throw new Error('Failed to delete task');
    }
  }
}