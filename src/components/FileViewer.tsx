
import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Download, Copy, CheckCircle2 } from 'lucide-react';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { vs2015 } from 'react-syntax-highlighter/dist/esm/styles/hljs';
import { saveAs } from 'file-saver';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';
import DocumentationGenerator from '@/components/DocumentationGenerator';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell
} from '@/components/ui/table';

interface ViewerFileItem {
  name: string;
  type: 'file' | 'folder';
  path: string;
  content?: string;
  jsonContent?: any;
  children?: ViewerFileItem[];
}

interface FileViewerProps {
  file: ViewerFileItem;
}

const FileViewer: React.FC<FileViewerProps> = ({ file }) => {
  const [activeTab, setActiveTab] = useState<'raw' | 'json' | 'preview'>('raw');
  const [previewTab, setPreviewTab] = useState<'general' | 'parameters' | 'sources' | 'targets' | 'transforms' | 'specialized'>('general');
  const [formattedJson, setFormattedJson] = useState('');
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    if (file?.jsonContent) {
      try {
        setFormattedJson(JSON.stringify(file.jsonContent, null, 2));
        setActiveTab('json');
      } catch (error) {
        console.error("Error formatting JSON:", error);
        setFormattedJson('Error parsing JSON content');
      }
    } else {
      setActiveTab('raw');
    }
  }, [file]);

  if (!file) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500 bg-gray-50">
        <div className="p-8 rounded-lg border border-dashed border-gray-300 text-center max-w-md">
          <h3 className="text-lg font-medium mb-2">No File Selected</h3>
          <p className="text-gray-500">Select a file from the explorer to view its contents</p>
        </div>
      </div>
    );
  }

  const handleDownload = () => {
    try {
      const content = activeTab === 'json' && file.jsonContent 
        ? JSON.stringify(file.jsonContent, null, 2) 
        : file.content || '';
      
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      saveAs(blob, file.name);
      toast.success(`Downloaded ${file.name}`);
    } catch (error) {
      console.error("Error downloading file:", error);
      toast.error("Error downloading file");
    }
  };

  const handleCopyJson = () => {
    try {
      if (file.jsonContent) {
        const jsonContent = JSON.stringify(file.jsonContent, null, 2);
        navigator.clipboard.writeText(jsonContent);
        setIsCopied(true);
        toast.success("JSON copied to clipboard");
        
        setTimeout(() => {
          setIsCopied(false);
        }, 2000);
      }
    } catch (error) {
      console.error("Error copying JSON:", error);
      toast.error("Failed to copy JSON");
    }
  };

  // Check if the file has valid JSON content for preview
  const hasJsonContent = !!file.jsonContent;
  
  // Determine which preview tabs to show based on content
  const hasParameters = hasJsonContent && Array.isArray(file.jsonContent.parameters) && file.jsonContent.parameters.length > 0;
  const hasSources = hasJsonContent && Array.isArray(file.jsonContent.sources) && file.jsonContent.sources.length > 0;
  const hasTargets = hasJsonContent && Array.isArray(file.jsonContent.targets) && file.jsonContent.targets.length > 0;
  const hasTransforms = hasJsonContent && Array.isArray(file.jsonContent.transforms) && file.jsonContent.transforms.length > 0;
  const hasSpecializedStages = hasJsonContent && Array.isArray(file.jsonContent.specialized_stages) && file.jsonContent.specialized_stages.length > 0;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-3 border-b bg-white">
        <h2 className="font-semibold truncate text-gray-800 max-w-[60%]">
          {file.name}
        </h2>
        <div className="flex gap-2">
          {hasJsonContent && (
            <>
              <DocumentationGenerator selectedFile={file} />
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleCopyJson}
                className="flex items-center gap-1"
              >
                {isCopied ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                <span>Copy JSON</span>
              </Button>
            </>
          )}
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleDownload}
            className="flex items-center gap-1"
          >
            <Download className="h-4 w-4" />
            <span>Download</span>
          </Button>
        </div>
      </div>

      <Tabs 
        value={activeTab} 
        onValueChange={(v) => setActiveTab(v as 'raw' | 'json' | 'preview')}
        className="flex-1 flex flex-col overflow-hidden"
      >
        <div className="bg-gray-50 border-b px-4">
          <TabsList className="h-10">
            <TabsTrigger value="raw">Raw</TabsTrigger>
            {hasJsonContent && <TabsTrigger value="json">JSON</TabsTrigger>}
            {hasJsonContent && <TabsTrigger value="preview">Preview</TabsTrigger>}
          </TabsList>
        </div>
        
        <div className="flex-1 overflow-auto">
          <TabsContent value="raw" className="h-full m-0 p-0">
            <ScrollArea className="h-full w-full">
              {file.content ? (
                <SyntaxHighlighter 
                  language={file.name.endsWith('.dsx') ? 'xml' : file.name.endsWith('.json') ? 'json' : 'plaintext'}
                  style={vs2015}
                  className="h-full overflow-auto"
                >
                  {file.content}
                </SyntaxHighlighter>
              ) : (
                <div className="p-4 text-gray-500">No content available</div>
              )}
            </ScrollArea>
          </TabsContent>
          
          {hasJsonContent && (
            <>
              <TabsContent value="json" className="h-full m-0 p-0">
                <ScrollArea className="h-full w-full">
                  <SyntaxHighlighter language="json" style={vs2015} className="h-full overflow-auto">
                    {formattedJson}
                  </SyntaxHighlighter>
                </ScrollArea>
              </TabsContent>
              
              <TabsContent value="preview" className="h-full m-0 p-0">
                <Tabs 
                  value={previewTab}
                  onValueChange={(value) => setPreviewTab(value as any)}
                  className="h-full flex flex-col bg-white"
                >
                  <div className="border-b">
                    <TabsList className="mx-4 my-2">
                      <TabsTrigger value="general">General</TabsTrigger>
                      {hasParameters && <TabsTrigger value="parameters">Parameters</TabsTrigger>}
                      {hasSources && <TabsTrigger value="sources">Sources</TabsTrigger>}
                      {hasTargets && <TabsTrigger value="targets">Targets</TabsTrigger>}
                      {hasTransforms && <TabsTrigger value="transforms">Transforms</TabsTrigger>}
                      {hasSpecializedStages && <TabsTrigger value="specialized">Specialized Stages</TabsTrigger>}
                    </TabsList>
                  </div>
                  
                  <div className="flex-1 p-4 overflow-auto">
                    <TabsContent value="general" className="m-0 h-full">
                      <GeneralPreview data={file.jsonContent} />
                    </TabsContent>
                    
                    <TabsContent value="parameters" className="m-0 h-full">
                      <ParametersPreview parameters={file.jsonContent?.parameters} />
                    </TabsContent>
                    
                    <TabsContent value="sources" className="m-0 h-full">
                      <SourcesPreview sources={file.jsonContent?.sources} />
                    </TabsContent>
                    
                    <TabsContent value="targets" className="m-0 h-full">
                      <TargetsPreview targets={file.jsonContent?.targets} />
                    </TabsContent>
                    
                    <TabsContent value="transforms" className="m-0 h-full">
                      <TransformsPreview transforms={file.jsonContent?.transforms} />
                    </TabsContent>
                    
                    <TabsContent value="specialized" className="m-0 h-full">
                      <SpecializedStagesPreview stages={file.jsonContent?.specialized_stages} />
                    </TabsContent>
                  </div>
                </Tabs>
              </TabsContent>
            </>
          )}
        </div>
      </Tabs>
    </div>
  );
};

// General preview component
const GeneralPreview = ({ data }: { data: any }) => {
  if (!data) return <div>No data available</div>;
  
  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="p-6 bg-white rounded-lg border shadow-sm">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">{data.name || 'Untitled Job'}</h2>
        
        <div className="grid grid-cols-2 gap-4 mt-4">
          {data.description && (
            <div className="col-span-2">
              <h3 className="text-sm font-medium text-gray-500 uppercase">Description</h3>
              <p className="text-gray-700 mt-1">{data.description}</p>
            </div>
          )}
          
          {data.type && (
            <div>
              <h3 className="text-sm font-medium text-gray-500 uppercase">Job Type</h3>
              <p className="text-gray-700 mt-1">{data.type}</p>
            </div>
          )}
          
          {data.schedule && (
            <div>
              <h3 className="text-sm font-medium text-gray-500 uppercase">Schedule</h3>
              <p className="text-gray-700 mt-1">{data.schedule}</p>
            </div>
          )}
        </div>
        
        <div className="mt-6">
          <h3 className="text-sm font-medium text-gray-500 uppercase mb-2">Summary</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
              <p className="text-blue-600 font-medium">{data.parameters?.length || 0}</p>
              <p className="text-sm text-gray-600">Parameters</p>
            </div>
            <div className="bg-green-50 p-3 rounded-lg border border-green-100">
              <p className="text-green-600 font-medium">{data.sources?.length || 0}</p>
              <p className="text-sm text-gray-600">Sources</p>
            </div>
            <div className="bg-purple-50 p-3 rounded-lg border border-purple-100">
              <p className="text-purple-600 font-medium">{data.targets?.length || 0}</p>
              <p className="text-sm text-gray-600">Targets</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Parameters preview component
const ParametersPreview = ({ parameters }: { parameters: any[] }) => {
  if (!parameters || parameters.length === 0) {
    return <div className="text-gray-500 text-center py-6">No parameters available</div>;
  }
  
  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      <h3 className="text-xl font-semibold text-gray-800">Parameters</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {parameters.map((param, idx) => (
          <div key={idx} className="bg-white p-4 rounded-lg border shadow-sm">
            <div className="font-medium text-blue-600">{param.name}</div>
            <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="font-medium text-gray-700">Type:</span> 
                <span className="ml-1 text-gray-600">{param.type}</span>
              </div>
              {param.default && (
                <div>
                  <span className="font-medium text-gray-700">Default:</span> 
                  <span className="ml-1 text-gray-600">{param.default}</span>
                </div>
              )}
              {param.description && (
                <div className="col-span-2 mt-1">
                  <span className="font-medium text-gray-700">Description:</span> 
                  <p className="mt-1 text-gray-600">{param.description}</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Sources preview component
const SourcesPreview = ({ sources }: { sources: any[] }) => {
  if (!sources || sources.length === 0) {
    return <div className="text-gray-500 text-center py-6">No sources available</div>;
  }
  
  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      <h3 className="text-xl font-semibold text-gray-800">Sources</h3>
      {sources.map((source, idx) => (
        <div key={idx} className="bg-white p-4 rounded-lg border shadow-sm">
          <div className="font-medium text-green-600 mb-2">{source.name}</div>
          <Table className="text-sm">
            <TableBody>
              <TableRow className="border-0">
                <TableCell className="font-medium p-2 pl-0">Type</TableCell>
                <TableCell className="p-2">{source.type || 'N/A'}</TableCell>
              </TableRow>
              {source.table && (
                <TableRow className="border-0">
                  <TableCell className="font-medium p-2 pl-0">Table</TableCell>
                  <TableCell className="p-2">
                    <div className="max-w-[300px] break-words">{source.table}</div>
                  </TableCell>
                </TableRow>
              )}
              {source.connection && (
                <TableRow className="border-0">
                  <TableCell className="font-medium p-2 pl-0">Connection</TableCell>
                  <TableCell className="p-2">{source.connection}</TableCell>
                </TableRow>
              )}
              {source.database && (
                <TableRow className="border-0">
                  <TableCell className="font-medium p-2 pl-0">Database</TableCell>
                  <TableCell className="p-2">{source.database}</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          
          {source.sql && (
            <div className="mt-3">
              <span className="font-medium text-gray-700">SQL:</span>
              <div className="mt-2 p-3 bg-gray-50 rounded border text-xs font-mono overflow-x-auto max-h-[200px]">
                {source.sql}
              </div>
            </div>
          )}
          
          {source.where_clauses && source.where_clauses.length > 0 && (
            <div className="mt-3">
              <span className="font-medium text-gray-700">Filters:</span>
              <div className="mt-2">
                {source.where_clauses.map((clause: string, i: number) => (
                  <div key={i} className="p-2 bg-yellow-50 border border-yellow-100 rounded mb-2 text-xs font-mono">
                    {clause.startsWith('HAVING') ? (
                      <span className="text-orange-600">{clause}</span>
                    ) : (
                      <span className="text-blue-600">{clause}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {source.columns && source.columns.length > 0 && (
            <div className="mt-3">
              <span className="font-medium text-gray-700">Columns:</span>
              <div className="mt-2 overflow-x-auto">
                <Table className="text-xs w-full">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Nullable</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {source.columns.map((col: any, colIdx: number) => (
                      <TableRow key={colIdx}>
                        <TableCell>{col.name}</TableCell>
                        <TableCell>{col.type}</TableCell>
                        <TableCell>{col.nullable ? 'Yes' : 'No'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

// Similarly update the TargetsPreview component to display column information
const TargetsPreview = ({ targets }: { targets: any[] }) => {
  if (!targets || targets.length === 0) {
    return <div className="text-gray-500 text-center py-6">No targets available</div>;
  }
  
  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      <h3 className="text-xl font-semibold text-gray-800">Targets</h3>
      {targets.map((target, idx) => (
        <div key={idx} className="bg-white p-4 rounded-lg border shadow-sm">
          <div className="font-medium text-purple-600 mb-2">{target.name}</div>
          <Table className="text-sm">
            <TableBody>
              {target.table && (
                <TableRow className="border-0">
                  <TableCell className="font-medium p-2 pl-0">Table</TableCell>
                  <TableCell className="p-2">
                    <div className="max-w-[300px] break-words">{target.table}</div>
                  </TableCell>
                </TableRow>
              )}
              {target.mode && (
                <TableRow className="border-0">
                  <TableCell className="font-medium p-2 pl-0">Write Mode</TableCell>
                  <TableCell className="p-2">{target.mode}</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          
          {target.description && (
            <div className="mt-2">
              <span className="font-medium text-gray-700">Description:</span>
              <p className="mt-1 text-sm text-gray-600">{target.description}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

// Transforms preview component
const TransformsPreview = ({ transforms }: { transforms: any[] }) => {
  if (!transforms || transforms.length === 0) {
    return <div className="text-gray-500 text-center py-6">No transforms available</div>;
  }
  
  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      <h3 className="text-xl font-semibold text-gray-800">Transforms</h3>
      {transforms.map((transform, idx) => (
        <div key={idx} className="bg-white p-4 rounded-lg border shadow-sm">
          <div className="font-medium text-amber-600">{transform.name}</div>
          {transform.rules && transform.rules.length > 0 && (
            <div className="mt-3">
              <span className="font-medium text-gray-700">Rules:</span>
              <div className="mt-2 p-3 bg-gray-50 rounded border text-xs font-mono overflow-x-auto max-h-[200px]">
                {transform.rules.join('\n')}
              </div>
            </div>
          )}
          {transform.description && (
            <div className="mt-2">
              <span className="font-medium text-gray-700">Description:</span>
              <p className="mt-1 text-sm text-gray-600">{transform.description}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default FileViewer;

// SpecializedStagesPreview component
const SpecializedStagesPreview = ({ stages }: { stages: any[] }) => {
  if (!stages || stages.length === 0) {
    return <div className="text-gray-500 text-center py-6">No specialized stages available</div>;
  }
  
  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      <h3 className="text-xl font-semibold text-gray-800">Specialized Stages</h3>
      {stages.map((stage, idx) => (
        <div key={idx} className="bg-white p-4 rounded-lg border shadow-sm">
          <div className="font-medium text-indigo-600 mb-2">{stage.name}</div>
          <div className="text-sm text-gray-700 mb-2">Type: {stage.type}</div>
          
          {stage.type === "Sort" && (
            <div className="mt-3">
              <span className="font-medium text-gray-700">Sort Keys:</span>
              <div className="mt-2 overflow-x-auto">
                <Table className="text-xs w-full">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Column</TableHead>
                      <TableHead>Direction</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stage.sort_keys.map((key: any, keyIdx: number) => (
                      <TableRow key={keyIdx}>
                        <TableCell>{key.column}</TableCell>
                        <TableCell>{key.direction}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {stage.options && Object.keys(stage.options).length > 0 && (
                <div className="mt-2">
                  <span className="font-medium text-gray-700">Options:</span>
                  <div className="mt-1 text-xs">
                    {Object.entries(stage.options).map(([key, value]: [string, any]) => (
                      <div key={key} className="mb-1">
                        <span className="font-medium">{key.replace(/_/g, ' ')}:</span> {String(value)}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          
          {stage.type === "Join" && (
            <div className="mt-3">
              <div className="mb-2">
                <span className="font-medium text-gray-700">Join Type:</span> {stage.join_type}
              </div>
              <span className="font-medium text-gray-700">Join Keys:</span>
              <div className="mt-2 overflow-x-auto">
                <Table className="text-xs w-full">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Left</TableHead>
                      <TableHead>Right</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stage.join_keys.map((key: any, keyIdx: number) => (
                      <TableRow key={keyIdx}>
                        <TableCell>{key.left}</TableCell>
                        <TableCell>{key.right}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
          
          {stage.type === "Aggregate" && (
            <div className="mt-3">
              {stage.group_by.length > 0 && (
                <div className="mb-2">
                  <span className="font-medium text-gray-700">Group By:</span>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {stage.group_by.map((col: string, colIdx: number) => (
                      <span key={colIdx} className="px-2 py-1 bg-gray-100 rounded text-xs">{col}</span>
                    ))}
                  </div>
                </div>
              )}
              <span className="font-medium text-gray-700">Aggregations:</span>
              <div className="mt-2 overflow-x-auto">
                <Table className="text-xs w-full">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Output</TableHead>
                      <TableHead>Function</TableHead>
                      <TableHead>Input</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stage.aggregations.map((agg: any, aggIdx: number) => (
                      <TableRow key={aggIdx}>
                        <TableCell>{agg.output}</TableCell>
                        <TableCell>{agg.function}</TableCell>
                        <TableCell>{agg.input}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
          
          {stage.type === "Surrogate Key Generator" && (
            <div className="mt-3">
              <div className="mb-2">
                <span className="font-medium text-gray-700">Key Column:</span> {stage.key_column}
              </div>
              {stage.options && Object.keys(stage.options).length > 0 && (
                <div>
                  <span className="font-medium text-gray-700">Options:</span>
                  <div className="mt-1 text-xs">
                    {Object.entries(stage.options).map(([key, value]: [string, any]) => (
                      <div key={key} className="mb-1">
                        <span className="font-medium">{key.replace(/_/g, ' ')}:</span> {String(value)}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* For other stage types, show a generic message */}
          {!["Sort", "Join", "Aggregate", "Surrogate Key Generator"].includes(stage.type) && (
            <div className="mt-2 text-sm text-gray-500">
              Detailed configuration for this stage type is not fully supported yet.
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

// Remove this loose JSX element that's causing the error
// <TabsContent value="specialized" className="m-0 h-full">
//   <SpecializedStagesPreview stages={file.jsonContent?.specialized_stages} />
// </TabsContent>
