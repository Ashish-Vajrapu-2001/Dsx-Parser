
import React, { useState, useCallback } from 'react';
import { Dropzone, FileWithPath } from '@mantine/dropzone';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Upload, File, X } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface FileUploaderProps {
  onFilesUploaded: (files: File[]) => void;
}

const FileUploader: React.FC<FileUploaderProps> = ({ onFilesUploaded }) => {
  const [isDragging, setIsDragging] = useState(false);
  const { toast } = useToast();

  const handleDrop = useCallback((files: FileWithPath[]) => {
    const validFiles: File[] = [];
    const invalidFiles: string[] = [];

    files.forEach(file => {
      if (file.name.endsWith('.dsx') || file.name.endsWith('.zip')) {
        validFiles.push(file);
      } else {
        invalidFiles.push(file.name);
      }
    });

    if (validFiles.length > 0) {
      onFilesUploaded(validFiles);
      toast({
        title: "Files uploaded",
        description: `Successfully uploaded ${validFiles.length} file(s)`,
      });
    }

    if (invalidFiles.length > 0) {
      toast({
        title: "Invalid files",
        description: `${invalidFiles.join(', ')} are not valid DSX or ZIP files`,
        variant: "destructive",
      });
    }
  }, [onFilesUploaded, toast]);

  return (
    <div className="w-full p-4">
      <Dropzone
        onDragEnter={() => setIsDragging(true)}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onReject={(files) => {
          toast({
            title: "Error uploading files",
            description: "Some files could not be uploaded",
            variant: "destructive",
          });
        }}
        maxSize={100 * 1024 * 1024}
        accept={['.dsx', '.zip']}
        className={`border-2 border-dashed rounded-lg p-8 text-center ${
          isDragging 
            ? 'border-dsx-primary bg-blue-50' 
            : 'border-gray-300 hover:border-dsx-primary hover:bg-gray-50'
        } transition-all duration-200 cursor-pointer`}
      >
        <div className="flex flex-col items-center justify-center gap-4">
          <Upload 
            className={`h-10 w-10 ${isDragging ? 'text-dsx-primary' : 'text-gray-400'}`} 
            strokeWidth={1.5} 
          />
          <div className="text-center">
            <p className="text-lg font-medium">
              Drag & drop DSX or ZIP files here
            </p>
            <p className="text-sm text-gray-500">
              Or click to browse your files
            </p>
          </div>
          <Button variant="outline" className="mt-2">
            Select Files
          </Button>
        </div>
      </Dropzone>
    </div>
  );
};

export default FileUploader;
