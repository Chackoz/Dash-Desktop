import { Alert, AlertDescription } from "@/components/ui/alert";
import { Code2, FileText } from "lucide-react";
import CodeMirror from "@uiw/react-codemirror";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { githubDark } from "@uiw/codemirror-theme-github";
import { python } from "@codemirror/lang-python";
interface CodeEditorProps {
    code: string;
    setCode: (code: string) => void;
    requirements: string;
    setRequirements: (requirements: string) => void;
    currentEditor: "code" | "requirements";
    setCurrentEditor: (editor: "code" | "requirements") => void;
    handleRunLocally: () => void;
    handleDistribute: () => void;
    isLoading: boolean;
    nodeStatus: string;
  }
  
 export  const CodeEditor: React.FC<CodeEditorProps> = ({
    code,
    setCode,
    requirements,
    setRequirements,
    currentEditor,
    setCurrentEditor,
  }) => {
    return (
      <>
        <Tabs value={currentEditor} onValueChange={(v) => setCurrentEditor(v as "code" | "requirements")}>
          <TabsList>
            <TabsTrigger value="code" className="space-x-2">
              <Code2 className="h-4 w-4" />
              <span>Code</span>
            </TabsTrigger>
            <TabsTrigger value="requirements" className="space-x-2">
              <FileText className="h-4 w-4" />
              <span>Requirements</span>
            </TabsTrigger>
          </TabsList>
          <TabsContent value="code" className="mt-4 flex-1">
            <CodeMirror
              value={code}
              theme={githubDark}
              extensions={[python()]}
              onChange={setCode}
              className="flex-1 overflow-hidden rounded-md"
              height="400px"
            />
          </TabsContent>
          <TabsContent value="requirements" className="mt-4 flex-1">
            <textarea
              value={requirements}
              onChange={(e) => setRequirements(e.target.value)}
              className="h-[400px] w-full resize-none rounded bg-secondary/50 p-4 font-mono text-sm focus:outline-none focus:ring-1"
              placeholder="# Enter your requirements comma separated&#10;numpy==1.21.0&#10;pandas>=1.3.0&#10;requests"
            />
          </TabsContent>
        </Tabs>
  
    
    
  
        {requirements && (
          <Alert className="mt-4">
            <AlertDescription className="text-sm">
              Requirements will be installed in an isolated environment before running the code.
            </AlertDescription>
          </Alert>
        )}
      </>
    );
  };
  