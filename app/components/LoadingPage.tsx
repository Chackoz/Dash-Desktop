import React from 'react';
import { Loader2, Moon, Sun } from 'lucide-react';
import { useTheme } from './ThemeProvider';
import { Button } from '@/components/ui/button';


export const LoadingPage = () => {
  const { isDarkMode,toggleTheme } = useTheme();
  if(!isDarkMode){
    toggleTheme();
  }

  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-background overflow-hidden">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className="rounded-full "
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
      
      <div className="mt-8 text-center space-y-2">
        <h2 className="text-2xl font-bold text-primary animate-pulse">
          DASH
        </h2>
        <p className="text-sm text-muted-foreground animate-fade-in-up">
          Initializing your workspace...
        </p>
      </div>
      
      <div className="fixed bottom-0 left-0 right-0 h-0.5 bg-primary/20">
        <div className="h-full bg-primary/50 animate-progress-bar" />
      </div>
    </div>
  );
};

export default LoadingPage;