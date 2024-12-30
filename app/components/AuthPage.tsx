import React, { useState } from 'react';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { auth, database } from '@/app/utils/firebaseConfig';
import { ref, set } from 'firebase/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Loader, Terminal, Sun, Moon } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useTheme } from './ThemeProvider';


interface SystemSpecs {
  os: string;
  cpu: string;
  ram: string;
  gpu?: string;
  gpuVram?: string;
}

export const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { isDarkMode, toggleTheme } = useTheme();

  const getSystemSpecs = async (): Promise<SystemSpecs> => {
    try {
      const specs = await invoke<SystemSpecs>('get_system_specs');
      return specs;
    } catch (error) {
      console.error('Error getting system specs:', error);
      return {
        os: 'Unknown',
        cpu: 'Unknown',
        ram: 'Unknown'
      };
    }
  };

  const saveUserSpecs = async (userId: string) => {
    const specs = await getSystemSpecs();
    const userSpecsRef = ref(database, `users/${userId}/main/system_specs`);
    await set(userSpecsRef, {
      ...specs,
      lastUpdated: new Date().toISOString()
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await saveUserSpecs(userCredential.user.uid);
      }
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-background p-4 space-y-6">
      <div className="flex items-center justify-between w-full max-w-md mb-4">
        <div className="flex items-center space-x-2">
          <Terminal className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">DASH</h1>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className="rounded-full"
        >
          {isDarkMode ? (
            <Sun className="w-4 h-4" />
          ) : (
            <Moon className="w-4 h-4" />
          )}
        </Button>
      </div>
      
      <Card className="w-full max-w-md bg-card border border-border">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl">
            {isLogin ? 'Welcome back' : 'Create account'}
          </CardTitle>
          <CardDescription>
            {isLogin 
              ? 'Enter your credentials to access your workspace'
              : 'Enter your details to create your DASH account'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-secondary/50 border-border"
              />
            </div>
            <div className="space-y-2">
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-secondary/50 border-border"
              />
            </div>
            
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading && <Loader className="w-4 h-4 animate-spin mr-2" />}
                {isLogin ? 'Sign In' : 'Create Account'}
              </Button>
              
              <Button
                type="button"
                variant="ghost"
                className="w-full text-muted-foreground hover:text-primary"
                onClick={() => setIsLogin(!isLogin)}
              >
                {isLogin 
                  ? 'New to DASH? Create an account' 
                  : 'Already have an account? Sign in'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthPage;