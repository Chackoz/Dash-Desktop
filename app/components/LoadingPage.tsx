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
  ArrowUpCircle,
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
    | "destructive"
    | "update";
  message: string;
  details?: string;
  severity: "critical" | "warning" | "destructive";
  action?: React.ReactNode;
}

interface GithubRelease {
  tag_name: string;
  html_url: string;
  body: string;
}

interface LoadingPageProps {
  onLoadingComplete: () => void;
  currentVersion: string; 
}

export const LoadingPage: React.FC<LoadingPageProps> = ({
  onLoadingComplete,
  currentVersion,
}) => {
  const { isDarkMode, toggleTheme } = useTheme();
  const [systemErrors, setSystemErrors] = useState<SystemError[]>([]);
  const [loadingStage, setLoadingStage] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const [specs, setSpecs] = useState<SystemSpecs | null>(null);
  const [latestVersion, setLatestVersion] = useState<GithubRelease | null>(
    null,
  );

  const checkForUpdates = async () => {
    try {
      const response = await fetch(
        "https://api.github.com/repos/Chackoz/Dash-Desktop/releases/latest",
      );
      if (!response.ok) throw new Error("Failed to fetch latest release");

      const release: GithubRelease = await response.json();
      setLatestVersion(release);
      console.log("Latest release:", latestVersion);

      // Compare versions (assuming semantic versioning)
      const current = currentVersion.replace(/[^0-9.]/g, "");
      const latest = release.tag_name.replace(/[^0-9.]/g, "");

      if (current < latest) {
        setSystemErrors((prev) => [
          ...prev,
          {
            type: "update",
            severity: "warning",
            message: "Update Available",
            details: `A new version (${release.tag_name}) is available. You're currently running version ${currentVersion}.`,
            action: (
              <div className="space-y-2">
                <Button
                  variant="default"
                  size="sm"
                  className="w-full"
                  onClick={() => window.open(release.html_url, "_blank")}
                >
                  <ArrowUpCircle className="mr-2 h-4 w-4" />
                  Download Update
                </Button>
                <p className="text-xs text-muted-foreground">
                  View changelog and download the latest version
                </p>
              </div>
            ),
          },
        ]);
      }
    } catch (error) {
      console.error("Failed to check for updates:", error);
    }
  };

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
                  "_blank",
                )
              }
            >
              <Download className="mr-2 h-4 w-4" />
              Download Docker Desktop
            </Button>
            <p className="text-xs text-muted-foreground">
              After installation, restart your system and try again
            </p>
          </div>
        ),
      });
    } else {
      // try {
      //   await invoke("run_docker_hub_image", {
      //     image: "hello-world",
      //     memory_limit: "128m",
      //   });
      // } catch (error) {
      //   console.log("Docker Desktop error:", error);
      //   errors.push({
      //     type: "docker",
      //     severity: "critical",
      //     message: "Docker Desktop is not running",
      //     details:
      //       "Docker Desktop is installed but not running. Please start Docker Desktop and try again.",
      //     action: (
      //       <p className="text-sm text-muted-foreground">
      //         Start Docker Desktop from your applications menu
      //       </p>
      //     ),
      //   });
      // }
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
          return;
        }
        setLoadingStage(1);
        await checkForUpdates(); // Check for updates during initialization
        await new Promise((resolve) => setTimeout(resolve, 1800));
        const user = auth.currentUser;

        const systemSpecs = await invoke<SystemSpecs>("get_system_specs");
        setSpecs(systemSpecs);
        const errors = await checkSystemRequirements(systemSpecs);
        setSystemErrors((prev) => [...prev, ...errors]);

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
            appVersion: currentVersion,
          });
        } else if (user) {
          const specsRef = ref(database, `users/${user.uid}/metadata/system`);
          localStorage.setItem("clientId", user.uid);
          await update(specsRef, {
            ...systemSpecs,
            lastUpdated: new Date().toISOString(),
            appVersion: currentVersion,
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
  }, [isDarkMode, toggleTheme, onLoadingComplete, currentVersion]);

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
    <div className="flex h-screen w-screen flex-col items-center justify-center overflow-hidden bg-background">
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleTheme}
        className="absolute right-4 top-4 rounded-full"
      >
        {isDarkMode ? (
          <Sun className="h-4 w-4" />
        ) : (
          <Moon className="h-4 w-4" />
        )}
      </Button>

      <div className="relative">
        <div className="absolute -inset-4 opacity-50">
          <div className="h-24 w-24 animate-ping rounded-full bg-primary/10" />
        </div>
        <div className="absolute -inset-8 opacity-30">
          <div className="animation-delay-150 h-32 w-32 animate-ping rounded-full bg-primary/10" />
        </div>
        <div className="absolute -inset-12 opacity-20">
          <div className="animation-delay-300 h-40 w-40 animate-ping rounded-full bg-primary/10" />
        </div>

        <div className="relative z-10 rounded-full bg-background/80 p-4 backdrop-blur-sm">
          {isRetrying ? (
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          ) : systemErrors.some((e) => e.severity === "critical") ? (
            <XCircle className="h-12 w-12 text-destructive" />
          ) : (
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          )}
        </div>
      </div>

      <div className="mt-8 max-w-md space-y-6 px-4 text-center">
        <div className="space-y-2">
          <h2 className="animate-pulse text-2xl font-bold text-primary">
            DASH
          </h2>
          <p className="animate-fade-in-up text-sm text-muted-foreground">
            {systemErrors.some((e) => e.severity === "critical")
              ? "System Requirements Check"
              : getLoadingText()}
          </p>
          <p className="text-xs text-muted-foreground">
            Version {currentVersion}
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
                    {error.type === "update" ? (
                      <ArrowUpCircle className="h-4 w-4" />
                    ) : (
                      <AlertCircle className="h-4 w-4" />
                    )}
                    {error.message}
                  </AlertTitle>
                  <AlertDescription className="mt-2 space-y-2">
                    <p className="text-sm">{error.details}</p>
                    {error.action}
                  </AlertDescription>
                </Alert>
              ))}

              {systemErrors.some(
                (e) => e.type === "docker" || e.type === "python",
              ) && (
                <Button
                  variant="outline"
                  className="mt-4 w-full"
                  onClick={retrySystemChecks}
                  disabled={isRetrying}
                >
                  <RefreshCcw
                    className={`mr-2 h-4 w-4 ${
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
