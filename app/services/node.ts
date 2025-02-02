import { ref, update } from 'firebase/database';
import { NetworkNode, NodeStatus } from '../types/types';
import { firebaseService } from './firebase';


export class NodeService {
  static async updateNodeStatus(clientId: string, status: NodeStatus): Promise<void> {
    if (!clientId) throw new Error('Client ID is required');

    const database = firebaseService.database;
    const presenceRef = ref(database, `presence/${clientId}`);

    try {
      await update(presenceRef, {
        status,
        lastSeen: new Date().toISOString(),
        type: 'client',
      });
    } catch (error) {
      console.error('Error updating node status:', error);
      throw new Error(`Failed to update status: ${(error as Error).message}`);
    }
  }

  static async updateNodeMetadata(
    nodeId: string,
    metadata: Partial<NetworkNode['metadata']>,
  ): Promise<void> {
    const database = firebaseService.database;
    const nodeRef = ref(database, `presence/${nodeId}`);

    try {
      await update(nodeRef, {
        metadata,
        lastSeen: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error updating node metadata:', error);
      throw error;
    }
  }
}