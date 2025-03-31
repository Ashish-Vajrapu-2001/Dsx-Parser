
import React, { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { saveAs } from 'file-saver';
import FileUploader from '@/components/FileUploader';
import FileExplorer from '@/components/FileExplorer';
import FileViewer from '@/components/FileViewer';
import Header from '@/components/Header';
import { 
  processDSXFiles, 
  createFileTree, 
  saveAsZip,
  extractDSXFilesFromZip
} from '@/lib/dsxParser';
import { DSXJobInfo } from '@/lib/types/dsxTypes';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';
import { FileText, X } from "lucide-react";

interface FileItem {
  name: string;
  type: 'file' | 'folder';
  path: string;
  content?: string;
  jsonContent?: any;
  children?: FileItem[];
}

const Index = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [selectedFile, setSelectedFile] = useState<FileItem | undefined>(undefined);
  const [processingResults, setProcessingResults] = useState<any[]>([]);
  
  const handleFilesUploaded = useCallback(async (uploadedFiles: File[]) => {
    if (!uploadedFiles.length) return;
    
    setIsProcessing(true);
    toast.info("Processing files...", { duration: 2000 });
    
    try {
      // Check if any of the files is a ZIP file
      const zipFiles = uploadedFiles.filter(file => file.name.toLowerCase().endsWith('.zip'));
      let filesToProcess = [...uploadedFiles.filter(file => !file.name.toLowerCase().endsWith('.zip'))];
      
      // Extract DSX files from ZIP files if any
      if (zipFiles.length > 0) {
        for (const zipFile of zipFiles) {
          try {
            const extractedFiles = await extractDSXFilesFromZip(zipFile);
            filesToProcess = [...filesToProcess, ...extractedFiles];
          } catch (error) {
            console.error("Error extracting files from ZIP:", error);
            toast.error(`Failed to extract files from ${zipFile.name}`);
          }
        }
      }
      
      // Process all DSX files (both directly uploaded and extracted from ZIPs)
      const results = await processDSXFiles(filesToProcess);
      setProcessingResults(results);
      
      // Create file tree from processing results
      const newFiles = createFileTree(results).map(file => ({
        ...file,
        path: `/${file.name}`,
        type: 'file' as const,
        content: JSON.stringify(results.find(r => r.data.name === file.name)?.data, null, 2),
        jsonContent: results.find(r => r.data.name === file.name)?.data
      }));
      
      setFiles(prevFiles => [...prevFiles, ...newFiles]);
      toast.success(`Successfully processed ${results.length} file(s)`);
    } catch (error) {
      console.error("Error processing files:", error);
      toast.error("Error processing files. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const handleDownloadAll = useCallback(async () => {
    if (!processingResults.length) {
      toast.error("No processed files to download");
      return;
    }
    
    toast.info("Preparing download...");
    
    try {
      const zipBlob = await saveAsZip(processingResults);
      saveAs(zipBlob, "dsx_converted_files.zip");
      toast.success("Files downloaded successfully");
    } catch (error) {
      console.error("Error downloading files:", error);
      toast.error("Failed to download files");
    }
  }, [processingResults]);

  const handleFileSelect = useCallback((file: FileItem) => {
    if (file.type === 'file') {
      setSelectedFile(file);
    }
  }, []);

  const handleClearFiles = useCallback(() => {
    setFiles([]);
    setSelectedFile(undefined);
    setProcessingResults([]);
    toast.info("All files cleared");
  }, []);

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <Header 
        onDownloadAll={handleDownloadAll} 
        hasFiles={files.length > 0} 
      />
      
      <main className="flex flex-1 overflow-hidden">
        <div className="flex flex-col w-80 border-r border-purple-200 bg-gradient-to-b from-fuchsia-100 via-violet-100 to-cyan-100">
          <div className="p-4 bg-white/50 backdrop-blur-sm">
            <FileUploader onFilesUploaded={handleFilesUploaded} />
          </div>
          
          <div className="flex-1 overflow-hidden p-4 pt-0">
            {files.length > 0 && (
              <div className="flex justify-end mb-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-fuchsia-600 hover:text-white hover:bg-gradient-to-r hover:from-fuchsia-500 hover:to-purple-500 flex items-center gap-1 transition-all duration-300 border-fuchsia-300"
                  onClick={handleClearFiles}
                >
                  <Trash2 className="h-4 w-4" />
                  Clear All
                </Button>
              </div>
            )}
            <FileExplorer 
              files={files} 
              onFileSelect={handleFileSelect} 
              selectedFile={selectedFile}
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-hidden border-l border-purple-200 bg-white/70 backdrop-blur-sm">
          <FileViewer file={selectedFile} />
        </div>
      </main>
      
      {isProcessing && (
        <div className="fixed inset-0 bg-purple-900/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg border-2 border-purple-300">
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 border-4 border-t-purple-500 border-r-pink-500 border-b-blue-400 border-l-indigo-500 rounded-full animate-spin"></div>
              <p className="text-lg text-purple-700 font-medium">Processing files...</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Index;
