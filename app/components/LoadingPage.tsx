"use client";
import React, { useEffect, useState } from "react";
import { Loader2, Moon, Sun } from "lucide-react";
import { useTheme } from "./ThemeProvider";
import { Button } from "@/components/ui/button";
import { invoke } from "@tauri-apps/api/core";
import { auth, database } from "@/app/utils/firebaseConfig";
import { ref, update } from "firebase/database";

interface SystemSpecs {
  os: string;
  cpu: string;
  ram: string;
  gpu?: string;
  gpuVram?: string;
  docker: boolean;
  python?: string;
  node?: string;
  rust?: string;
  email?: string;
  displayName?: string;
}

interface LoadingPageProps {
  onLoadingComplete: () => void;
}

export const LoadingPage: React.FC<LoadingPageProps> = ({
  onLoadingComplete,
}) => {
  const { isDarkMode, toggleTheme } = useTheme();
  const [error, setError] = useState<string | null>(null);
  const [loadingStage, setLoadingStage] = useState(0);

  useEffect(() => {
    if (!isDarkMode) {
      toggleTheme();
    }

    const getAndUpdateSpecs = async () => {
      try {
        setLoadingStage(1);
        await new Promise((resolve) => setTimeout(resolve, 1800)); // Delay for animation
        const user = auth.currentUser;

        // Get system specs
        const systemSpecs = await invoke<SystemSpecs>("get_system_specs");
        systemSpecs.email = user?.email?user.email:"";
        setLoadingStage(2);

        // Get clientId from localStorage
        const clientId = localStorage.getItem("clientId");

        if (clientId) {
          const specsRef = ref(
            database,
            `users/${clientId}/metadata/system`
          );
          await update(specsRef, {
            ...systemSpecs,
         
            lastUpdated: new Date().toISOString(),
          });
          setLoadingStage(3);
        } else {
        
      
     
          if (user) {
            const specsRef = ref(database, `users/${user.uid}/metadata/system`);
            localStorage.setItem("clientId", user?.uid);
            await update(specsRef, {
              ...systemSpecs,
              lastUpdated: new Date().toISOString()
            });
            setLoadingStage(3);
          }
        
          setLoadingStage(3);
        }

        // Add small delay before completing loading
        await new Promise((resolve) => setTimeout(resolve, 500));
        onLoadingComplete();
      } catch (err) {
        setError((err as Error).message);
        console.error("Error getting system specs:", err);
       
      }
    };

    getAndUpdateSpecs();
  }, [isDarkMode, toggleTheme, onLoadingComplete]);

  const getLoadingText = () => {
    switch (loadingStage) {
      case 0:
        return "Initializing...";
      case 1:
        return "Checking system compatibility...";
      case 2:
        return "Preparing your environment...";
      case 3:
        return "Almost ready...";
      default:
        return "Loading...";
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-background overflow-hidden">
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleTheme}
        className="rounded-full absolute top-4 right-4"
      >
        {isDarkMode ? (
          <Sun className="w-4 h-4" />
        ) : (
          <Moon className="w-4 h-4" />
        )}
      </Button>

      <div className="relative">
        <div className="absolute -inset-4 opacity-50">
          <div className="w-24 h-24 rounded-full bg-primary/10 animate-ping" />
        </div>
        <div className="absolute -inset-8 opacity-30">
          <div className="w-32 h-32 rounded-full bg-primary/10 animate-ping animation-delay-150" />
        </div>
        <div className="absolute -inset-12 opacity-20">
          <div className="w-40 h-40 rounded-full bg-primary/10 animate-ping animation-delay-300" />
        </div>

        <div className="relative z-10 bg-background/80 backdrop-blur-sm rounded-full p-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
        </div>
      </div>

      <div className="mt-8 text-center space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-primary animate-pulse">
            DASH
          </h2>
          <p className="text-sm text-muted-foreground animate-fade-in-up">
            {getLoadingText()}
          </p>
        </div>

        {error && (
          <p className="text-sm text-destructive bg-destructive/10 px-4 py-2 rounded-lg">
            Error: {error}
          </p>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 h-0.5 bg-primary/20">
        <div
          className="h-full bg-primary/50 transition-all duration-1000 ease-in-out"
          style={{ width: `${(loadingStage / 3) * 100}%` }}
        />
      </div>
    </div>
  );
};

export default LoadingPage;
