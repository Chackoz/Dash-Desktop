import { ref, push, set, update, get, query, orderByChild, equalTo } from 'firebase/database';
import { firebaseService } from './firebase';
import { DockerConfig, Task} from '../types/types';
interface UserPoints {
  totalPoints: number;
  lastUpdated: string;
}


export class TaskService {
  static async createTask(
    clientId: string,
    code: string | null,
    requirements?: string,
    dockerConfig?: DockerConfig,
  ): Promise<string> {
    const database = firebaseService.database;
    const auth = firebaseService.auth;
    if (!database) {
      console.error('Database not found');
      return "";
    }
    if (!auth) {
      console.error('Database not found');
      return "";
    }
    
    
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
    if (!database) {
      console.error('Database not found');
      return;
    }
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
      if (status === 'completed') {
        const task = await this.getTaskById(taskId);
        if (task && task.doneUserId && task.createdAt) {
          const runtime = this.calculateRuntime(task.createdAt, new Date().toISOString());
          await this.awardPoints(task.doneUserId||"", runtime);
        }else{
          console.error('Error fetching task:', taskId);
        }
      }
      else{
        console.error('Error fetching task:', taskId);
      }
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
    if (!database) {
      console.error('Database not found');
      return;
    }
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
    if (!database) {
      console.error('Database not found');
      return [];
    }
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
    if (!database) {
      console.error('Database not found');
      return null;
    }
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
    if (!database) {
      console.error('Database not found');
      return [];
    }
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
    if (!database) {
      console.error('Database not found');
      return;
    }
    const taskRef = ref(database, `tasks/${taskId}`);

    try {
      await set(taskRef, null);
    } catch (error) {
      console.error('Error deleting task:', error);
      throw new Error('Failed to delete task');
    }
  }
  private static calculateRuntime(startTime: string, endTime: string): number {
    const start = new Date(startTime).getTime();
    const end = new Date(endTime).getTime();
    return Math.floor((end - start) / 1000); 
  }

  public static async awardPoints(userId: string, seconds: number): Promise<void> {
    const database = firebaseService.database;
    if (!database) {
      console.error('Database not found');
      return;
    }

    const userPointsRef = ref(database, `userPoints/${userId}`);

    try {
      // Get current points
      const snapshot = await get(userPointsRef);
      const currentPoints: UserPoints = snapshot.exists() 
        ? snapshot.val() 
        : { totalPoints: 0, lastUpdated: new Date().toISOString() };

      const updatedPoints: UserPoints = {
        totalPoints: currentPoints.totalPoints + seconds,
        lastUpdated: new Date().toISOString()
      };


      await set(userPointsRef, updatedPoints);
    } catch (error) {
      console.error('Error awarding points:', error);
      throw new Error('Failed to award points');
    }
  }


  static async getUserPoints(userId: string): Promise<UserPoints> {
    const database = firebaseService.database;
    if (!database) {
      console.error('Database not found');
      throw new Error('Database not found');
    }

    const userPointsRef = ref(database, `userPoints/${userId}`);

    try {
      const snapshot = await get(userPointsRef);
      if (snapshot.exists()) {
        return snapshot.val();
      }
      return { totalPoints: 0, lastUpdated: new Date().toISOString() };
    } catch (error) {
      console.error('Error fetching user points:', error);
      throw new Error('Failed to fetch user points');
    }
  }
}