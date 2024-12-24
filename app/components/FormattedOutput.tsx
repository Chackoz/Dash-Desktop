import React from 'react';
import { Terminal, Copy, CheckCircle, Timer, AlertCircle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";

const OutputStep = ({ type, content, timestamp }) => {
  const getStepStyle = () => {
    switch (type) {
      case 'env_setup':
        return 'text-blue-500 border-l-blue-500';
      case 'requirements':
        return 'text-green-500 border-l-green-500';
      case 'execution':
        return 'text-purple-500 border-l-purple-500';
      case 'error':
        return 'text-red-500 border-l-red-500';
      default:
        return 'text-foreground border-l-gray-500';
    }
  };

  return (
    <div className={`pl-4 py-2 border-l-2 ${getStepStyle()}`}>
      <div className="flex items-center gap-2">
        {type === 'env_setup' && <Timer className="w-4 h-4" />}
        {type === 'requirements' && <CheckCircle className="w-4 h-4" />}
        {type === 'execution' && <Terminal className="w-4 h-4" />}
        {type === 'error' && <AlertCircle className="w-4 h-4" />}
        <span className="text-xs text-muted-foreground">{timestamp}</span>
      </div>
      <pre className="mt-1 text-sm whitespace-pre-wrap font-mono">{content}</pre>
    </div>
  );
};

const EnhancedOutput = ({ output }) => {
  const [copied, setCopied] = React.useState(false);
  const [expanded, setExpanded] = React.useState(false);

  const parseOutput = (rawOutput) => {
    if (!rawOutput) return [];

    const lines = rawOutput.split('\n');
    const steps = [];
    let currentStep = null;

    lines.forEach((line) => {
      if (line.includes('Running code locally')) {
        currentStep = {
          type: 'env_setup',
          content: 'Setting up virtual environment...',
          timestamp: new Date().toLocaleTimeString()
        };
        steps.push(currentStep);
      } else if (line.includes('Requirements:')) {
        currentStep = {
          type: 'requirements',
          content: line.replace('Requirements:', '').trim(),
          timestamp: new Date().toLocaleTimeString()
        };
        steps.push(currentStep);
      } else if (line.includes('Error:')) {
        currentStep = {
          type: 'error',
          content: line,
          timestamp: new Date().toLocaleTimeString()
        };
        steps.push(currentStep);
      } else if (line.includes('Output:')) {
        currentStep = {
          type: 'execution',
          content: line.replace('Output:', '').trim(),
          timestamp: new Date().toLocaleTimeString()
        };
        steps.push(currentStep);
      } else if (currentStep && line.trim()) {
        currentStep.content += '\n' + line;
      }
    });

    return steps;
  };

  const steps = parseOutput(output);

  const handleCopy = () => {
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mt-4 w-full">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <Terminal className="w-4 h-4" />
          <span className="font-medium">Output</span>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="text-xs"
          >
            {copied ? (
              <CheckCircle className="w-4 h-4 mr-1" />
            ) : (
              <Copy className="w-4 h-4 mr-1" />
            )}
            {copied ? 'Copied!' : 'Copy'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="text-xs"
          >
            {expanded ? 'Collapse' : 'Expand'}
          </Button>
        </div>
      </div>

      <ScrollArea className={`rounded-md border ${expanded ? 'h-96' : 'h-48'}`}>
        <div className="p-4 space-y-2 bg-secondary/50">
          {steps.length === 0 ? (
            <Alert variant="default" className="bg-secondary">
              <Terminal className="w-4 h-4 mr-2" />
              No output to display
            </Alert>
          ) : (
            steps.map((step, index) => (
              <OutputStep
                key={index}
                type={step.type}
                content={step.content}
                timestamp={step.timestamp}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default EnhancedOutput;