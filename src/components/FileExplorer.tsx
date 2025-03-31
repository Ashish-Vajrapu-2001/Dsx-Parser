
import React, { useState } from 'react';
import { Folder, File, ChevronRight, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FileItem {
  name: string;
  type: 'file' | 'folder';
  path: string;
  content?: string;
  jsonContent?: any;
  children?: FileItem[];
}

interface FileExplorerProps {
  files: FileItem[];
  onFileSelect: (file: FileItem) => void;
  selectedFile?: FileItem;
}

const FileTreeItem = ({ 
  item, 
  depth = 0, 
  onFileSelect, 
  selectedFile 
}: { 
  item: FileItem; 
  depth?: number; 
  onFileSelect: (file: FileItem) => void; 
  selectedFile?: FileItem;
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const isSelected = selectedFile?.path === item.path;
  
  return (
    <div>
      <Button
        variant="ghost"
        className={cn(
          "w-full justify-start px-2 gap-2 h-8 font-normal", 
          isSelected && "bg-muted",
          depth > 0 && `pl-${depth * 4 + 2}`
        )}
        onClick={() => {
          if (item.type === 'folder') {
            setIsOpen(!isOpen);
          } else {
            onFileSelect(item);
          }
        }}
      >
        {item.type === 'folder' ? (
          <>
            {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            <Folder className="h-4 w-4 text-dsx-primary" />
          </>
        ) : (
          <>
            <span className="w-4"></span>
            {item.name.endsWith('.dsx') ? (
              <File className="h-4 w-4 text-dsx-primary" />
            ) : item.name.endsWith('.json') ? (
              <File className="h-4 w-4 text-dsx-secondary" />
            ) : (
              <File className="h-4 w-4 text-gray-400" />
            )}
          </>
        )}
        <span className="truncate">{item.name}</span>
      </Button>
      
      {item.type === 'folder' && isOpen && item.children && (
        <div className="pl-2">
          {item.children.map((child, index) => (
            <FileTreeItem
              key={`${child.path}-${index}`}
              item={child}
              depth={depth + 1}
              onFileSelect={onFileSelect}
              selectedFile={selectedFile}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const FileExplorer: React.FC<FileExplorerProps> = ({ 
  files, 
  onFileSelect,
  selectedFile
}) => {
  return (
    <div className="border rounded-md overflow-y-auto h-full">
      <div className="p-2 font-medium border-b bg-muted">Files</div>
      <div className="p-0">
        {files.length > 0 ? (
          files.map((item, index) => (
            <FileTreeItem 
              key={`${item.path}-${index}`} 
              item={item} 
              onFileSelect={onFileSelect}
              selectedFile={selectedFile}
            />
          ))
        ) : (
          <div className="p-4 text-center text-gray-500">
            No files uploaded
          </div>
        )}
      </div>
    </div>
  );
};

export default FileExplorer;
