
import React from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

interface HeaderProps {
  onDownloadAll: () => Promise<void>;
  hasFiles: boolean;
}

const Header: React.FC<HeaderProps> = ({ onDownloadAll, hasFiles }) => {
  return (
    <header className="border-b bg-white shadow-sm">
      <div className="container flex items-center justify-between h-16 px-4">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-dsx-primary rounded-md flex items-center justify-center">
            <span className="text-white font-bold">DSX</span>
          </div>
          <h1 className="text-xl font-bold">DSX-JSON Converter</h1>
        </div>
        
        <div>
          <Button 
            variant="outline" 
            className="gap-2"
            onClick={onDownloadAll}
            disabled={!hasFiles}
          >
            <Download className="h-4 w-4" />
            Download All
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Header;
