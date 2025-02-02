"use client";
import React, { useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
} from "firebase/auth";

import { ref, set } from "firebase/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import {
  Loader,
  Terminal,
  Sun,
  Moon,
  ArrowRight,
  Mail,
  Lock,
  User,
  KeyRound,
} from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useTheme } from "./ThemeProvider";
import { firebaseService } from "../../services/firebase";
import { SystemSpecs } from "../../types/types";

const database = firebaseService.database;
const auth = firebaseService.auth;

export const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [isResetPassword, setIsResetPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { isDarkMode, toggleTheme } = useTheme();

  const getSystemSpecs = async (): Promise<SystemSpecs> => {
    try {
      const specs = await invoke<SystemSpecs>("get_system_specs");
      return specs;
    } catch (error) {
      console.error("Error getting system specs:", error);
      return {
        os: "Unknown",
        cpu: "Unknown",
        ram: "Unknown",
      };
    }
  };

  const saveUserSpecs = async (userId: string) => {
    const specs = await getSystemSpecs();
    if (!database) return;
    const userSpecsRef = ref(database, `users/${userId}/main/system_specs`);
    await set(userSpecsRef, {
      ...specs,
      lastUpdated: new Date().toISOString(),
      displayName: displayName.trim(),
    });
  };

  const validateInputs = () => {
    if (!email.trim()) {
      setError("Email is required");
      return false;
    }
    if (!isResetPassword && !password.trim()) {
      setError("Password is required");
      return false;
    }
    if (!isLogin && !isResetPassword && !displayName.trim()) {
      setError("Display name is required");
      return false;
    }
    if (!isResetPassword && password.length < 6) {
      setError("Password must be at least 6 characters");
      return false;
    }
    return true;
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("Email is required");
      return;
    }

    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      if (!auth) {
        throw new Error("Firebase auth not initialized");
      }

      await sendPasswordResetEmail(auth, email, {
        url: 'https://dash-webpage.vercel.app/reset-password', 
        handleCodeInApp: true
      });
      setSuccess("Password reset email sent. Please check your inbox.");
    } catch (error) {
      let errorMessage = (error as Error).message;
      if (errorMessage.includes("auth/user-not-found")) {
        errorMessage = "No account found with this email address.";
      } else if (errorMessage.includes("auth/invalid-email")) {
        errorMessage = "Please enter a valid email address.";
      }
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateInputs()) return;

    setIsLoading(true);
    setError("");

    try {
      if (!auth) {
        throw new Error("Firebase auth not initialized");
      }

      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          email,
          password,
        );
        await updateProfile(userCredential.user, {
          displayName: displayName.trim(),
        });
        await saveUserSpecs(userCredential.user.uid);
      }
    } catch (error) {
      let errorMessage = (error as Error).message;
      if (errorMessage.includes("auth/email-already-in-use")) {
        errorMessage = "This email is already registered. Please sign in instead.";
      } else if (errorMessage.includes("auth/invalid-email")) {
        errorMessage = "Please enter a valid email address.";
      } else if (errorMessage.includes("auth/wrong-password")) {
        errorMessage = "Incorrect password. Please try again.";
      }
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setIsResetPassword(false);
    setError("");
    setSuccess("");
    setEmail("");
    setPassword("");
    setDisplayName("");
  };

  const toggleResetPassword = () => {
    setIsResetPassword(!isResetPassword);
    setError("");
    setSuccess("");
    setPassword("");
  };

  return (
    <div className="flex min-h-screen w-screen flex-col items-center justify-center space-y-6 bg-background p-4">
      <div className="mb-4 flex w-full max-w-md items-center justify-between">
        <div className="flex items-center space-x-2">
          <Terminal className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">DASH</h1>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className="rounded-full"
        >
          {isDarkMode ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </Button>
      </div>

      <Card className="w-full max-w-md border border-border bg-card shadow-lg">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">
            {isResetPassword
              ? "Reset Password"
              : isLogin
              ? "Welcome back"
              : "Create account"}
          </CardTitle>
          <CardDescription>
            {isResetPassword
              ? "Enter your email to receive a password reset link"
              : isLogin
              ? "Enter your credentials to access your workspace"
              : "Enter your details to create your DASH account"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={isResetPassword ? handleResetPassword : handleSubmit}
            className="space-y-4"
          >
            {!isLogin && !isResetPassword && (
              <div className="space-y-2">
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Display Name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    required
                    className="border-border bg-secondary/50 pl-10"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="border-border bg-secondary/50 pl-10"
                />
              </div>
            </div>

            {!isResetPassword && (
              <div className="space-y-2">
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="border-border bg-secondary/50 pl-10"
                  />
                </div>
              </div>
            )}

            {error && (
              <Alert variant="destructive" className="animate-shake">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert variant="default" className="border-green-500 text-green-500">
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              className="w-full font-semibold"
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader className="mr-2 h-4 w-4 animate-spin" />
              ) : isResetPassword ? (
                <KeyRound className="mr-2 h-4 w-4" />
              ) : (
                <ArrowRight className="mr-2 h-4 w-4" />
              )}
              {isResetPassword
                ? "Send Reset Link"
                : isLogin
                ? "Sign In"
                : "Create Account"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="mt-2 flex flex-col space-y-4">
          {isLogin && !isResetPassword && (
            <Button
              type="button"
              variant="ghost"
              className="text-sm text-muted-foreground hover:text-primary"
              onClick={toggleResetPassword}
            >
              Forgot your password?
            </Button>
          )}

          <div className="relative w-full">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">
                {isResetPassword
                  ? "Remember your password?"
                  : isLogin
                  ? "New to DASH?"
                  : "Already have an account?"}
              </span>
            </div>
          </div>

          <Button
            type="button"
            variant="ghost"
            className="w-full text-muted-foreground hover:text-primary"
            onClick={isResetPassword ? toggleResetPassword : toggleMode}
          >
            {isResetPassword
              ? "Back to Sign In"
              : isLogin
              ? "Create an account"
              : "Sign in instead"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default AuthPage;