
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { FileText, Check, Loader2, ExternalLink, AlertTriangle, Server, Eye } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveAs } from 'file-saver';
import { toast } from 'sonner';

interface DocumentationGeneratorProps {
  selectedFile?: {
    name: string;
    jsonContent?: any;
  };
}

const DocumentationGenerator: React.FC<DocumentationGeneratorProps> = ({ selectedFile }) => {
  const navigate = useNavigate();
  const [isGenerating, setIsGenerating] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [serverUrl, setServerUrl] = useState('http://localhost:5000');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [documentation, setDocumentation] = useState('');
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [serverStatus, setServerStatus] = useState<'unknown' | 'online' | 'offline'>('unknown');
  const [serverStatusChecked, setServerStatusChecked] = useState(false);

  // Check the server status when the component mounts or when serverUrl changes
  React.useEffect(() => {
    const checkServerStatus = async () => {
      try {
        const response = await fetch(`${serverUrl}`, { 
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          // Add timeout to avoid long waits
          signal: AbortSignal.timeout(3000)
        });
        
        if (response.ok) {
          setServerStatus('online');
        } else {
          setServerStatus('offline');
        }
      } catch (error) {
        console.error('Error checking server status:', error);
        setServerStatus('offline');
      } finally {
        setServerStatusChecked(true);
      }
    };
    
    if (serverUrl) {
      checkServerStatus();
    }
  }, [serverUrl]);
  
  const downloadExampleDocumentation = () => {
    const exampleName = selectedFile?.name || "example";
    const docFilename = `${exampleName.replace(/\.(dsx|json)$/, '')}_documentation.md`;
    
    const exampleDoc = `# ${exampleName} Documentation

## 1. Job Overview

### 1.1 Purpose
This job is responsible for loading data into the DS_X_RPT_ACTIVATION table by integrating all relative datasets via lookups. It also creates and assigns the surrogate key (ds_act_id).

### 1.2 Parameters
| Parameter | Type | Default Value | Description |
|-----------|------|---------------|-------------|
| StartDt | Date | 1900-01-01 | Start date for data processing |
| EndDt | Date | 1900-01-01 | End date for data processing |
| BIParameterDSActivation | EnvironmentVar | (As pre-defined) | All Variables for BI -Development Environment |

## 2. Source Systems
This job extracts data from multiple sources:
- PCPV
- table_x_employee_discount
- SMOB_USERS_V_DSACT (multiple views)

## 3. Data Flow
1. Source data is extracted based on date parameters
2. Lookups are performed to integrate related data
3. Business rules and transformations are applied
4. Surrogate keys are generated
5. Data is loaded into target tables

## 4. Target Tables
- DS_X_RPT_ACTIVATION
- DS_X_RPT_ACTIVATION_REJECT
- DS_X_RPT_WFM_MIGRATED_ESN
- DS_X_RPT_ACTIVATION_REJECT_ERROR
- DS_X_RPT_act_sim_swap

## 5. Transformations
Various transformations are applied including:
- TranCpy: String manipulation for service IDs
- Xfm_Carrier_NullHandling: Handling null values for carrier data
- x_action_type_trfm_ln: Processing action types
- data_trfm: Data transformations for reactivation/activation logic

This documentation was generated as an example only. For full documentation, please use a backend service to make the Claude API call.`;

    // Navigate to the preview page instead of downloading
    navigate('/markdown-preview', {
      state: {
        markdown: exampleDoc,
        fileName: docFilename
      }
    });
    
    toast.success("Example documentation preview loaded");
    setIsDialogOpen(false);
  };

  const generateDocumentation = async () => {
    if (!selectedFile?.jsonContent) {
      toast.error("No file selected or file doesn't contain valid JSON content");
      return;
    }

    if (!apiKey) {
      toast.error("API key is required");
      return;
    }

    setIsGenerating(true);
    setErrorDetails(null);
    
    try {
      // Use the updated server.js endpoint
      const response = await fetch(`${serverUrl}/generate-docs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apiKey,
          selectedFile
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error ${response.status}`);
      }

      const responseData = await response.json();
      
      // Extract the markdown content
      const generatedDoc = responseData.documentation || "No documentation generated";
      setDocumentation(generatedDoc);
      
      // Navigate to preview page instead of downloading
      const docFilename = `${selectedFile.name.replace(/\.(dsx|json)$/, '')}_documentation.md`;
      
      navigate('/markdown-preview', {
        state: {
          markdown: generatedDoc,
          fileName: docFilename
        }
      });
      
      toast.success("Documentation generated successfully!");
      setIsDialogOpen(false);
    } catch (error) {
      console.error("Error generating documentation:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      setErrorDetails(errorMessage);
      toast.error(`Failed to generate documentation: ${errorMessage}`);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm"
          disabled={!selectedFile?.jsonContent}
          className="flex items-center gap-1"
        >
          <FileText className="h-4 w-4" />
          <span>Generate Docs</span>
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Generate Documentation</DialogTitle>
          <DialogDescription>
            Enter your API key to generate technical documentation for the selected file.
          </DialogDescription>
        </DialogHeader>
        
        <div className="bg-amber-50 border border-amber-200 p-3 rounded-md mb-4">
          <div className="flex gap-2">
            <Server className={`h-5 w-5 ${serverStatus === 'online' ? 'text-green-600' : 'text-amber-600'} mt-0.5`} />
            <div>
              <h4 className="text-sm font-medium text-amber-800">Local Server Status: {serverStatus === 'online' ? 'Online' : 'Offline'}</h4>
              <p className="text-xs text-amber-700 mt-1">
                {serverStatus === 'online'
                  ? "Local proxy server is running and ready to handle requests."
                  : "Local proxy server is offline. Start it by running 'node server.js' in your terminal."}
              </p>
              <div className="mt-2">
                <Button 
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setServerStatusChecked(false);
                    setTimeout(() => {
                      // Re-trigger the server status check
                      setServerUrl(prev => prev);
                    }, 100);
                  }}
                  className="text-xs h-7"
                >
                  Check Server Status
                </Button>
              </div>
            </div>
          </div>
        </div>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="serverUrl" className="col-span-4">
              Server URL
            </Label>
            <Input
              id="serverUrl"
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              placeholder="http://localhost:5000"
              className="col-span-4"
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="apiKey" className="col-span-4">
              Claude API Key
            </Label>
            <Input
              id="apiKey"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your Claude API key"
              className="col-span-4"
              type="password"
            />
            <div className="col-span-4 text-xs text-gray-500">
              <a 
                href="https://console.anthropic.com/keys" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-1 underline hover:text-blue-600"
              >
                Get an API key <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>

          {errorDetails && (
            <div className="bg-red-50 p-3 rounded border border-red-200 text-sm text-red-800">
              <p className="font-medium mb-1">Error Details:</p>
              <p className="break-words whitespace-pre-line">{errorDetails}</p>
            </div>
          )}
        </div>
        
        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <div className="flex flex-col sm:flex-row gap-2 sm:mr-auto">
            <Button
              onClick={downloadExampleDocumentation}
              variant="outline"
              size="sm"
              disabled={isGenerating}
              className="flex items-center gap-1"
            >
              <Eye className="h-4 w-4" />
              <span>Preview Example</span>
            </Button>
          </div>
          
          <Button 
            onClick={generateDocumentation} 
            disabled={isGenerating || !apiKey || serverStatus === 'offline'}
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Eye className="mr-2 h-4 w-4" />
                Generate & Preview
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DocumentationGenerator;
