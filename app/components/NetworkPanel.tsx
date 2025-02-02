"use client";
import React, { useState, useEffect, useRef } from "react";
import { ref, onValue, off, DataSnapshot } from "firebase/database";
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
import { ChatService } from "../services/chat";
import {
  ChatMessage,
  MessageData,
  MessagesData,
  NetworkChatProps,
  NetworkStats,
  PresenceNode,
} from "../types/types";
import { firebaseService } from "../services/firebase";

const database = firebaseService.database;
const sendChatMessage = ChatService.sendMessage;

const NetworkTopology: React.FC = () => {
  const [currentStats, setCurrentStats] = useState<NetworkStats>({
    activeUsers: 0,
    totalTasksToday: 0,
    averageLatency: 0,
    tasksLastHour: 0,
    timestamp: Date.now(),
  });

  useEffect(() => {
    if (!database) return;
    const presenceRef = ref(database, "presence");
    const messagesRef = ref(database, "messages");

    const handlePresence = (snapshot: DataSnapshot) => {
      const data = snapshot.val() as Record<string, PresenceNode> | null;
      if (data) {
        const activeUsers = Object.values(data).filter(
          (node) => node.type === "client",
        ).length;

        setCurrentStats((prev) => ({
          ...prev,
          activeUsers,
          timestamp: Date.now(),
        }));
      }
    };

    const handleMessages = (snapshot: DataSnapshot) => {
      const data = snapshot.val() as Record<string, MessageData> | null;
      if (data) {
        const messages = Object.values(data);
        const now = new Date();
        const startOfDay = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
        );
        const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);

        const todayTasks = messages.filter(
          (msg) => new Date(msg.timestamp) >= startOfDay,
        ).length;

        const recentTasks = messages.filter(
          (msg) => new Date(msg.timestamp) >= hourAgo,
        ).length;

        const latencies = calculateLatencies(messages);

        setCurrentStats((prev) => ({
          ...prev,
          totalTasksToday: todayTasks,
          tasksLastHour: recentTasks,
          averageLatency: latencies,
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
      const timeDiff =
        new Date(messages[i].timestamp).getTime() -
        new Date(messages[i - 1].timestamp).getTime();
      if (timeDiff < 300000) {
        // Only count if less than 5 minutes
        totalTime += timeDiff;
        count++;
      }
    }

    return count > 0 ? Math.round(totalTime / count / 1000) : 0;
  };

  return (
    <div className="h-full w-full">
      <div className="grid grid-cols-2 gap-4 p-4">
        <Card className="flex items-center justify-center transition-shadow hover:shadow-lg">
          <CardContent className="flex items-center justify-center pt-6">
            <div className="flex items-center justify-center">
              <div className="flex flex-col items-center justify-center space-y-2">
                <div className="flex items-center justify-center space-x-2">
                  <Users className="h-5 w-5 text-primary" />
                  <h3 className="text-sm font-medium">Active Users</h3>
                </div>
                <p className="text-center text-2xl font-bold">
                  {currentStats.activeUsers}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="transition-shadow hover:shadow-lg">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-primary" />
              <h3 className="text-sm font-medium">Average Latency</h3>
            </div>
            <div className="mt-2 flex flex-col items-center justify-center">
              <p className="text-center text-2xl font-bold">
                {currentStats.averageLatency}s
              </p>
              <p className="text-center text-sm text-muted-foreground">
                Response Time
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="transition-shadow hover:shadow-lg">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <CheckSquare className="h-5 w-5 text-primary" />
              <h3 className="text-sm font-medium">Tasks Today</h3>
            </div>
            <div className="mt-2 flex-col items-center justify-center">
              <p className="text-center text-2xl font-bold">
                {currentStats.totalTasksToday}
              </p>
              <p className="text-center text-sm text-muted-foreground">
                Total Processed
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="transition-shadow hover:shadow-lg">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Zap className="h-5 w-5 text-primary" />
              <h3 className="text-sm font-medium">Recent Tasks</h3>
            </div>
            <div className="mt-2 flex-col items-center justify-center">
              <p className="text-center text-2xl font-bold">
                {currentStats.tasksLastHour}
              </p>
              <p className="text-center text-sm text-muted-foreground">
                Last Hour
              </p>
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
    if (!database) return;
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
              new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
          ),
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

  return (
    <div className="my-auto flex h-full max-h-[88vh] min-h-[88vh] w-full flex-col items-center justify-between overflow-y-auto">
      <ScrollArea
        className="w-full flex-1 overflow-y-auto p-4"
        ref={scrollAreaRef}
      >
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.senderId === userId ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  message.senderId === userId
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                <div className="mb-1 w-fit text-xs opacity-70">
                  {message.senderName.replaceAll("-", "@ ")}
                </div>
                <div>{message.content}</div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
      <div className="flex gap-2 border-t p-4">
        <Input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          onKeyPress={handleKeyPress}
        />
        <Button onClick={handleSendMessage} size="icon">
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

const NetworkPanel: React.FC<NetworkChatProps> = ({ userId, userName }) => {
  return (
    <Card className="h-full max-h-screen w-[20vw] overflow-hidden">
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
              <NetworkIcon className="mr-2 h-4 w-4" />
              Stats
            </TabsTrigger>
            <TabsTrigger
              value="chat"
              className="data-[state=active]:bg-background"
            >
              <User className="mr-2 h-4 w-4" />
              Chat
            </TabsTrigger>
          </TabsList>
          <TabsContent value="topology" className="mt-0 h-full overflow-auto">
            <NetworkTopology />
          </TabsContent>
          <TabsContent value="chat" className="mt-0 h-full overflow-auto">
            <NetworkChat userId={userId} userName={userName} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default NetworkPanel;
