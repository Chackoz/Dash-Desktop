import { ref, push, set } from 'firebase/database';
import { firebaseService } from './firebase';
import { ChatMessage } from '../types/types';


export class ChatService {
  static async sendMessage(
    senderId: string,
    senderName: string,
    content: string,
  ): Promise<string> {
    const database = firebaseService.database;
    const messagesRef = ref(database, 'messages');
    const newMessageRef = push(messagesRef);

    const message: ChatMessage = {
      senderId,
      senderName,
      content,
      timestamp: new Date().toISOString(),
      type: 'message',
    };

    try {
      await set(newMessageRef, message);
      return newMessageRef.key!;
    } catch (error) {
      console.error('Error sending message:', error);
      throw new Error('Failed to send message');
    }
  }
}