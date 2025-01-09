"use client";
import React, { useEffect, useState } from "react";
import {
  AlertCircle,
  Download,
  Loader2,
  Moon,
  RefreshCcw,
  Sun,
  XCircle,
} from "lucide-react";
import { useTheme } from "./ThemeProvider";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

interface SystemError {
  type:
    | "docker"
    | "python"
    | "hardware"
    | "general"
    | "warning"
    | "destructive";
  message: string;
  details?: string;
  severity: "critical" | "warning" | "destructive";
  action?: React.ReactNode;
}

interface LoadingPageProps {
  onLoadingComplete: () => void;
}

export const LoadingPage: React.FC<LoadingPageProps> = ({
  onLoadingComplete,
}) => {
  const { isDarkMode, toggleTheme } = useTheme();
  const [systemErrors, setSystemErrors] = useState<SystemError[]>([]);
  const [loadingStage, setLoadingStage] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const [specs, setSpecs] = useState<SystemSpecs | null>(null);

  const checkSystemRequirements = async (specs: SystemSpecs) => {
    const errors: SystemError[] = [];

    // Check Docker
    if (!specs.docker) {
      errors.push({
        type: "docker",
        severity: "critical",
        message: "Docker Desktop is not installed",
        details:
          "Docker Desktop is required to run containerized applications. Please install it and restart your system.",
        action: (
          <div className="space-y-2">
            <Button
              variant="default"
              size="sm"
              className="w-full"
              onClick={() =>
                window.open(
                  "https://www.docker.com/products/docker-desktop",
                  "_blank"
                )
              }
            >
              <Download className="w-4 h-4 mr-2" />
              Download Docker Desktop
            </Button>
            <p className="text-xs text-muted-foreground">
              After installation, restart your system and try again
            </p>
          </div>
        ),
      });
    } else {
      try {
        await invoke("run_docker_hub_image", {
          image: "hello-world",
          memory_limit: "128m",
        });
      } catch (error) {
        console.log("Docker Desktop error:", error);
        errors.push({
          type: "docker",
          severity: "critical",
          message: "Docker Desktop is not running",
          details:
            "Docker Desktop is installed but not running. Please start Docker Desktop and try again.",
          action: (
            <p className="text-sm text-muted-foreground">
              Start Docker Desktop from your applications menu
            </p>
          ),
        });
      }
    }

    return errors;
  };

  const retrySystemChecks = async () => {
    setIsRetrying(true);
    try {
      const specs = await invoke<SystemSpecs>("get_system_specs");
      setSpecs(specs);
      const errors = await checkSystemRequirements(specs);
      setSystemErrors(errors);
      if (errors.filter((e) => e.severity === "critical").length === 0) {
        onLoadingComplete();
      }
    } catch (err) {
      console.log(specs);
      setSystemErrors([
        {
          type: "general",
          severity: "critical",
          message: "System Check Failed",
          details: (err as Error).message,
        },
      ]);
    } finally {
      setIsRetrying(false);
    }
  };

  useEffect(() => {
    if (!isDarkMode) {
      toggleTheme();
    }

    const getAndUpdateSpecs = async () => {
      try {
        if (!auth) {
          throw new Error("Firebase auth not initialized");
        }
        setLoadingStage(1);
        await new Promise((resolve) => setTimeout(resolve, 1800));
        const user = auth.currentUser;

        const systemSpecs = await invoke<SystemSpecs>("get_system_specs");
        setSpecs(systemSpecs);
        const errors = await checkSystemRequirements(systemSpecs);
        setSystemErrors(errors);

        if (errors.filter((e) => e.severity === "critical").length > 0) {
          return;
        }

        systemSpecs.email = user?.email ? user.email : "";
        setLoadingStage(2);

        const clientId = localStorage.getItem("clientId");
        if (!database) {
          return;
        }

        if (clientId) {
          const specsRef = ref(database, `users/${clientId}/metadata/system`);
          await update(specsRef, {
            ...systemSpecs,
            lastUpdated: new Date().toISOString(),
          });
        } else if (user) {
          const specsRef = ref(database, `users/${user.uid}/metadata/system`);
          localStorage.setItem("clientId", user.uid);
          await update(specsRef, {
            ...systemSpecs,
            lastUpdated: new Date().toISOString(),
          });
        }

        setLoadingStage(3);
        await new Promise((resolve) => setTimeout(resolve, 500));
        onLoadingComplete();
      } catch (err) {
        setSystemErrors([
          {
            type: "general",
            severity: "critical",
            message: "System Check Failed",
            details: (err as Error).message,
          },
        ]);
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
          {isRetrying ? (
            <Loader2 className="w-12 h-12 animate-spin text-primary" />
          ) : systemErrors.length > 0 ? (
            <XCircle className="w-12 h-12 text-destructive" />
          ) : (
            <Loader2 className="w-12 h-12 text-primary animate-spin" />
          )}
        </div>
      </div>

      <div className="mt-8 text-center space-y-6 max-w-md px-4">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-primary animate-pulse">
            DASH
          </h2>
          <p className="text-sm text-muted-foreground animate-fade-in-up">
            {systemErrors.length > 0
              ? "System Requirements Check"
              : getLoadingText()}
          </p>
        </div>

        {systemErrors.length > 0 && (
          <Card className="bg-background/50 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">System Requirements</CardTitle>
                <Badge
                  variant={
                    systemErrors.some((e) => e.severity === "critical")
                      ? "destructive"
                      : "default"
                  }
                >
                  {systemErrors.some((e) => e.severity === "critical")
                    ? "Action Required"
                    : "Warning"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {systemErrors.map((error, index) => (
                <Alert
                  key={index}
                  variant={
                    error.severity === "critical" ? "destructive" : "default"
                  }
                  className="text-left"
                >
                  <AlertTitle className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    {error.message}
                  </AlertTitle>
                  <AlertDescription className="mt-2 space-y-2">
                    <p className="text-sm">{error.details}</p>
                    {error.action}
                  </AlertDescription>
                </Alert>
              ))}

              {systemErrors.some(
                (e) => e.type === "docker" || e.type === "python"
              ) && (
                <Button
                  variant="outline"
                  className="w-full mt-4"
                  onClick={retrySystemChecks}
                  disabled={isRetrying}
                >
                  <RefreshCcw
                    className={`w-4 h-4 mr-2 ${
                      isRetrying ? "animate-spin" : ""
                    }`}
                  />
                  Check Requirements Again
                </Button>
              )}
            </CardContent>
          </Card>
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
