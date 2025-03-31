import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronLeft, Download, Copy, CheckCircle2 } from 'lucide-react';
import { saveAs } from 'file-saver';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import html2pdf from 'html2pdf.js';

const MarkdownPreview = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [markdown, setMarkdown] = useState<string>('');
  const [fileName, setFileName] = useState<string>('documentation.md');
  const [copied, setCopied] = useState(false);
  
  useEffect(() => {
    if (location.state?.markdown) {
      setMarkdown(location.state.markdown);
      console.log("Markdown content loaded:", location.state.markdown.substring(0, 100) + "...");
    } else {
      toast.error("No markdown content found");
      navigate('/');
    }
    
    if (location.state?.fileName) {
      setFileName(location.state.fileName);
      console.log("Filename set:", location.state.fileName);
    }
  }, [location, navigate]);
  
  const handleDownload = () => {
    try {
      const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
      saveAs(blob, fileName);
      toast.success(`Downloaded ${fileName}`);
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Failed to download file");
    }
  };
  
  const handleCopy = () => {
    navigator.clipboard.writeText(markdown);
    setCopied(true);
    toast.success("Markdown copied to clipboard");
    
    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };
  
  const goBack = () => {
    navigate('/');
  };

  const handlePdfDownload = () => {
    const content = document.querySelector('.prose');
    if (!content) {
      toast.error("Failed to generate PDF");
      return;
    }
  
    const opt = {
      margin: 0.75,
      filename: fileName.replace('.md', '.pdf'),
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: 2,
        useCORS: true,
        scrollY: 0,
        windowWidth: 1920,
        letterRendering: true
      },
      jsPDF: { 
        unit: 'in', 
        format: 'a4', 
        orientation: 'portrait',
        compress: true,
        lineHeight: 1.5
      }
    };
  
    html2pdf().set(opt).from(content).save()
      .then(() => {
        toast.success(`Downloaded ${fileName.replace('.md', '.pdf')}`);
      })
      .catch((error) => {
        console.error("PDF generation error:", error);
        toast.error("Failed to generate PDF");
      });
  };

  return (
    <div className="flex flex-col h-screen bg-[conic-gradient(at_top_right,_var(--tw-gradient-stops))] from-purple-400 via-pink-300 to-orange-300">
      <div className="flex items-center justify-between p-6 bg-white/80 backdrop-blur-md shadow-lg border-b border-white/20">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={goBack} 
            className="flex items-center gap-2 hover:scale-105 transition-all duration-300 bg-gradient-to-r from-purple-400 to-pink-400 text-white border-none hover:from-pink-400 hover:to-purple-400"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Back</span>
          </Button>
          <div className="flex flex-col">
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 via-pink-500 to-orange-500">
              {fileName}
            </h1>
            <p className="text-sm text-purple-600">Markdown Preview</p>
          </div>
        </div>
        
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleCopy}
            className={`flex items-center gap-2 transition-all duration-300 hover:scale-105 ${
              copied ? 'bg-green-400 text-white border-none' : 'bg-gradient-to-r from-purple-400 to-pink-400 text-white border-none hover:from-pink-400 hover:to-purple-400'
            }`}
          >
            {copied ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-green-500 animate-pulse" />
                <span className="text-green-500">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                <span>Copy</span>
              </>
            )}
          </Button>
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={handlePdfDownload}
            className="flex items-center gap-2 hover:scale-105 transition-all duration-300 bg-gradient-to-r from-orange-400 to-pink-400 text-white border-none hover:from-pink-400 hover:to-orange-400"
          >
            <Download className="h-4 w-4" />
            <span>PDF</span>
          </Button>

          <Button 
            variant="outline" 
            size="sm"
            onClick={handleDownload}
            className="flex items-center gap-2 hover:scale-105 transition-all duration-300 bg-gradient-to-r from-pink-400 to-purple-400 text-white border-none hover:from-purple-400 hover:to-pink-400"
          >
            <Download className="h-4 w-4" />
            <span>Download</span>
          </Button>
        </div>
      </div>
      
      <div className="flex flex-col flex-1 overflow-hidden p-6">
        <div className="bg-gradient-to-br from-white/90 to-white/70 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 p-8 h-full overflow-hidden flex flex-col hover:shadow-pink-100/50 transition-all duration-500">
          <ScrollArea className="flex-1 overflow-auto px-4">
            <article className="prose prose-slate max-w-none dark:prose-invert prose-headings:scroll-mt-28">
              {markdown ? (
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeRaw, rehypeSanitize]}
                  components={{
                    h1: ({node, ...props}) => (
                      <h1 
                        className="text-3xl font-bold mb-6 text-blue-600 pb-2 border-b border-gray-200" 
                        {...props} 
                      />
                    ),
                    h2: ({node, ...props}) => (
                      <h2 
                        className="text-2xl font-bold mb-4 text-blue-600 mt-8 border-l-4 border-blue-500 pl-3" 
                        {...props} 
                      />
                    ),
                    h3: ({node, ...props}) => (
                      <h3 
                        className="text-xl font-bold mb-3 text-blue-600 mt-6" 
                        {...props} 
                      />
                    ),
                    p: ({node, ...props}) => (
                      <p 
                        className="mb-4 text-gray-600 leading-relaxed whitespace-normal overflow-hidden" 
                        style={{ 
                          wordBreak: 'keep-all',
                          overflowWrap: 'break-word',
                          hyphens: 'none'
                        }}
                        {...props} 
                      />
                    ),
                    code: ({node, inline, className, children, ...props}) => (
                      <code 
                        className={`${className} ${
                          inline 
                            ? 'bg-blue-50 rounded px-1.5 py-0.5 text-sm font-mono text-blue-600 border border-blue-100' 
                            : 'block'
                        } text-black font-mono`}
                        style={{ 
                          wordBreak: 'keep-all',
                          overflowWrap: 'break-word',
                          whiteSpace: 'pre-wrap'
                        }}
                        {...props}
                      >
                        {children}
                      </code>
                    ),
                    table: ({node, ...props}) => (
                      <div className="overflow-x-auto my-4">
                        <table className="min-w-full border-collapse border border-gray-200" {...props} />
                      </div>
                    ),
                    th: ({node, ...props}) => (
                      <th 
                        className="border border-gray-200 bg-gray-50 p-2 text-left font-semibold" 
                        style={{ minWidth: '120px' }}
                        {...props} 
                      />
                    ),
                    td: ({node, ...props}) => (
                      <td 
                        className="border border-gray-200 p-2" 
                        style={{ 
                          wordBreak: 'break-word',
                          whiteSpace: 'pre-wrap'
                        }}
                        {...props} 
                      />
                    ),
                    pre: ({node, children, ...props}) => (
                      <pre 
                        className="bg-gray-50 rounded-xl p-4 mb-4 border border-gray-100 shadow-sm"
                        style={{ 
                          pageBreakInside: 'avoid',
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word'
                        }}
                        {...props}
                      >
                        {children}
                      </pre>
                    ),
                  }}
                >
                  {markdown}
                </ReactMarkdown>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-gray-400 text-lg animate-pulse">No content to display</p>
                </div>
              )}
            </article>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
};

export default MarkdownPreview;