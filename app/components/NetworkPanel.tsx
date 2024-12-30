"use client";
import React, { useState, useEffect, useRef } from "react";
import { ref, onValue, off, DataSnapshot } from "firebase/database";
import {
  database,
  ChatMessage,
  sendChatMessage,
} from "@/app/utils/firebaseConfig";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Send,
  User,
  Network as NetworkIcon,
  Users,
  Zap,
  Clock,
  CheckSquare,
} from "lucide-react";


interface NetworkChatProps {
  userId: string;
  userName: string;
}

interface MessagesData {
  [key: string]: Omit<ChatMessage, "id">;
}
interface NetworkStats {
    activeUsers: number;
    totalTasksToday: number;
    averageLatency: number;
    tasksLastHour: number;
    timestamp: number;
  }
  
  interface PresenceNode {
    type: 'client' | 'server';
    lastSeen: string;
    status: string;
  }
  
  interface MessageData {
    timestamp: string;
    senderId: string;
    senderName: string;
    content: string;
  }
  
  const NetworkTopology: React.FC = () => {
    const [currentStats, setCurrentStats] = useState<NetworkStats>({
      activeUsers: 0,
      totalTasksToday: 0,
      averageLatency: 0,
      tasksLastHour: 0,
      timestamp: Date.now()
    });
  
    useEffect(() => {
      const presenceRef = ref(database, "presence");
      const messagesRef = ref(database, "messages");
  
      const handlePresence = (snapshot: DataSnapshot) => {
        const data = snapshot.val() as Record<string, PresenceNode> | null;
        if (data) {
          const activeUsers = Object.values(data).filter((node) => 
            node.type === "client"
          ).length;
  
          setCurrentStats(prev => ({
            ...prev,
            activeUsers,
            timestamp: Date.now()
          }));
        }
      };
  
      const handleMessages = (snapshot: DataSnapshot) => {
        const data = snapshot.val() as Record<string, MessageData> | null;
        if (data) {
          const messages = Object.values(data);
          const now = new Date();
          const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  
          const todayTasks = messages.filter((msg) => 
            new Date(msg.timestamp) >= startOfDay
          ).length;
  
          const recentTasks = messages.filter((msg) => 
            new Date(msg.timestamp) >= hourAgo
          ).length;
  
          const latencies = calculateLatencies(messages);
  
          setCurrentStats(prev => ({
            ...prev,
            totalTasksToday: todayTasks,
            tasksLastHour: recentTasks,
            averageLatency: latencies
          }));
        }
      };
  
      onValue(presenceRef, handlePresence);
      onValue(messagesRef, handleMessages);
  
      return () => {
        off(presenceRef);
        off(messagesRef);
      };
    }, []);
  
    const calculateLatencies = (messages: MessageData[]): number => {
      if (messages.length < 2) return 0;
      let totalTime = 0;
      let count = 0;
  
      for (let i = 1; i < messages.length; i++) {
        const timeDiff = new Date(messages[i].timestamp).getTime() - 
                        new Date(messages[i - 1].timestamp).getTime();
        if (timeDiff < 300000) { // Only count if less than 5 minutes
          totalTime += timeDiff;
          count++;
        }
      }
  
      return count > 0 ? Math.round(totalTime / count / 1000) : 0;
    };
  
    return (
      <div className="w-full h-full ">
        <div className="grid grid-cols-2 gap-4 p-4">
          {/* Active Users Card */}
          <Card className="hover:shadow-lg transition-shadow flex justify-center items-center">
            <CardContent className="pt-6 flex justify-center items-center ">
              <div className="flex items-center justify-center">
                <div className="space-y-2 justify-center flex flex-col items-center">
                  <div className="flex items-center  justify-center space-x-2">
                    <Users className="w-5 h-5 text-primary" />
                    <h3 className="text-sm font-medium">Active Users</h3>
                  </div>
                  <p className="text-2xl font-bold text-center">{currentStats.activeUsers}</p>
                </div>
              
              </div>
            </CardContent>
          </Card>
  
          {/* Average Latency Card */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2">
                <Clock className="w-5 h-5 text-primary" />
                <h3 className="text-sm font-medium">Average Latency</h3>
              </div>
              <div className="mt-2">
                <p className="text-2xl font-bold">
                  {currentStats.averageLatency}s
                </p>
                <p className="text-sm text-muted-foreground">Response Time</p>
              </div>
            </CardContent>
          </Card>
  
          {/* Tasks Today Card */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2">
                <CheckSquare className="w-5 h-5 text-primary" />
                <h3 className="text-sm font-medium">Tasks Today</h3>
              </div>
              <div className="mt-2">
                <p className="text-2xl font-bold">{currentStats.totalTasksToday}</p>
                <p className="text-sm text-muted-foreground">Total Processed</p>
              </div>
            </CardContent>
          </Card>
  
          {/* Tasks Last Hour Card */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2">
                <Zap className="w-5 h-5 text-primary" />
                <h3 className="text-sm font-medium">Recent Tasks</h3>
              </div>
              <div className="mt-2">
                <p className="text-2xl font-bold">{currentStats.tasksLastHour}</p>
                <p className="text-sm text-muted-foreground">Last Hour</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  

const NetworkChat: React.FC<NetworkChatProps> = ({ userId, userName }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const messagesRef = ref(database, "messages");
    const handleMessages = (snapshot: DataSnapshot) => {
      const data = snapshot.val() as MessagesData | null;
      if (data) {
        const messageList = Object.entries(data).map(([id, msg]) => ({
          id,
          ...msg,
        }));
        setMessages(
          messageList.sort(
            (a, b) =>
              new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          )
        );
      }
    };

    onValue(messagesRef, handleMessages);
    return () => off(messagesRef);
  }, []);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;
    await sendChatMessage(userId, userName, newMessage);
    setNewMessage("");
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSendMessage();
    }
  };

  useEffect(() => {
    // Scroll to bottom when messages change
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current;
      scrollContainer.scrollTop = scrollContainer.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="flex flex-col h-full min-h-[88vh] max-h-[88vh] justify-between  overflow-y-auto my-auto w-full items-center ">
      <ScrollArea
        className="flex-1 p-4 overflow-y-auto w-full"
        ref={scrollAreaRef}
      >
        <div className="space-y-4  ">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.senderId === userId ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[70%] p-3 rounded-lg ${
                  message.senderId === userId
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                <div className="text-xs opacity-70 mb-1">
                  {message.senderName.replaceAll("-", "@ ")}
                </div>
                <div>{message.content}</div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
      <div className="p-4 border-t flex gap-2">
        <Input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          onKeyPress={handleKeyPress}
        />
        <Button onClick={handleSendMessage} size="icon">
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};


const NetworkPanel: React.FC<NetworkChatProps> = ({ userId, userName }) => {
    return (
      <Card className="h-full max-h-screen overflow-hidden w-[20vw]">
        <CardHeader className="pb-2">
          <CardTitle>Network</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Tabs defaultValue="topology" className="h-[calc(100%-4rem)]">
            <TabsList className="w-full justify-start rounded-none border-b">
              <TabsTrigger
                value="topology"
                className="data-[state=active]:bg-background"
              >
                <NetworkIcon className="w-4 h-4 mr-2" />
                Stats
              </TabsTrigger>
              <TabsTrigger
                value="chat"
                className="data-[state=active]:bg-background"
              >
                <User className="w-4 h-4 mr-2" />
                Chat
              </TabsTrigger>
            </TabsList>
            <TabsContent value="topology"  className="h-full mt-0 overflow-auto">
              <NetworkTopology />
            </TabsContent>
            <TabsContent
              value="chat"
              className="h-full mt-0 overflow-auto"
            >
              <NetworkChat userId={userId} userName={userName} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    );
  };
  

export default NetworkPanel;
