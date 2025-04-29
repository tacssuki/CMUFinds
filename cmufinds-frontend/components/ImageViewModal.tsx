import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, ZoomIn, ZoomOut, Download, RotateCcw, Move } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogOverlay,
  DialogClose
} from "@/components/ui/dialog";

interface ImageViewModalProps {
  imageUrl: string;
  isOpen: boolean;
  onClose: () => void;
  filename?: string;
}

const ImageViewModal: React.FC<ImageViewModalProps> = ({ imageUrl, isOpen, onClose, filename }) => {
  const [zoom, setZoom] = useState<number>(1);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [startDragPos, setStartDragPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (isOpen) {
      setZoom(1);
      setPosition({ x: 0, y: 0 });
      setLoading(true);
      setError(false);
      setIsDragging(false);
    }
  }, [imageUrl, isOpen]);

  const handleZoomIn = useCallback(() => {
    setZoom(prev => Math.min(prev * 1.2, 5));
  }, []);

  const handleZoomOut = useCallback(() => {
    const newZoom = Math.max(zoom / 1.2, 0.5);
    const zoomRatio = newZoom / zoom;
    setPosition(prev => ({
      x: prev.x * zoomRatio,
      y: prev.y * zoomRatio
    }));
    setZoom(newZoom);
  }, [zoom]);

  const handleReset = useCallback(() => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  const handleDownload = useCallback(() => {
    const link = document.createElement('a');
    link.href = imageUrl;
    const downloadFilename = filename || `image-${Date.now()}.jpg`;
    link.download = downloadFilename.replace(/\\s+/g, '_');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [imageUrl, filename]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLImageElement>) => {
    if (zoom <= 1) return;
    e.preventDefault();
    setIsDragging(true);
    setStartDragPos({ 
      x: e.clientX - position.x, 
      y: e.clientY - position.y 
    });
    if (imageRef.current) {
       imageRef.current.style.cursor = 'grabbing';
    }
  }, [position.x, position.y, zoom]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !imageRef.current) return;
    const newX = e.clientX - startDragPos.x;
    const newY = e.clientY - startDragPos.y;
    setPosition({ x: newX, y: newY });
  }, [isDragging, startDragPos.x, startDragPos.y]);

  const handleMouseUp = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);
     if (imageRef.current) {
       imageRef.current.style.cursor = 'grab';
    }
  }, [isDragging]);
  
   const handleMouseLeave = useCallback(() => {
     if (isDragging) {
       handleMouseUp();
     }
   }, [isDragging, handleMouseUp]);
   
   useEffect(() => {
     if (!isOpen) return;
     
     const handleKeyDown = (e: KeyboardEvent) => {
       if (e.key === 'Escape') {
         onClose();
       } else if (e.key === '+' || e.key === '=') {
         handleZoomIn();
       } else if (e.key === '-') {
         handleZoomOut();
       } else if (e.key === '0') {
         handleReset();
       }
     };
     
     window.addEventListener('keydown', handleKeyDown);
     return () => {
       window.removeEventListener('keydown', handleKeyDown);
     };
   }, [isOpen, onClose, handleZoomIn, handleZoomOut, handleReset]);

  return (
    <Dialog open={isOpen} onOpenChange={(open: boolean) => !open && onClose()}>
      <DialogOverlay className="bg-black/80 backdrop-blur-sm" /> 
      <DialogContent 
        className="p-0 border-0 max-w-[95vw] max-h-[95vh] w-auto h-auto flex items-center justify-center bg-transparent shadow-none overflow-hidden"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      >
         <DialogHeader className="sr-only">
           <DialogTitle>Image View</DialogTitle>
         </DialogHeader>

        <div className="relative w-full h-full flex items-center justify-center overflow-hidden"> 
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          )}
          
          {error && !loading && (
             <div className="absolute inset-0 flex items-center justify-center z-10">
                <div className="text-destructive-foreground bg-destructive/80 backdrop-blur-sm p-4 rounded-md">
                  Failed to load image
                </div>
              </div>
          )}

          {!error && (
             <img 
              ref={imageRef}
              src={imageUrl} 
              alt={filename || "Full size view"}
              className={`object-contain transition-transform duration-100 ease-linear ${isDragging ? '' : 'cursor-grab'}`}
              style={{ 
                 transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
                 maxWidth: '100%',
                 maxHeight: '100%',
                 visibility: loading ? 'hidden' : 'visible',
                 cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default'
              }}
              onLoad={() => setLoading(false)}
              onError={() => {
                setLoading(false);
                setError(true);
              }}
              onMouseDown={handleMouseDown}
            />
          )}
        </div>

        <div className="absolute top-3 right-3 flex gap-2 z-20">
          <Button 
            variant="secondary" 
            size="icon" 
            onClick={handleZoomIn}
            className="bg-background/70 hover:bg-background backdrop-blur-sm"
            aria-label="Zoom In"
          >
            <ZoomIn className="h-5 w-5" />
          </Button>
          <Button 
            variant="secondary" 
            size="icon" 
            onClick={handleZoomOut}
            className="bg-background/70 hover:bg-background backdrop-blur-sm"
             aria-label="Zoom Out"
          >
            <ZoomOut className="h-5 w-5" />
          </Button>
           <Button 
            variant="secondary" 
            size="icon" 
            onClick={handleReset}
            className="bg-background/70 hover:bg-background backdrop-blur-sm"
             aria-label="Reset Zoom"
             disabled={zoom === 1 && position.x === 0 && position.y === 0}
          >
            <RotateCcw className="h-5 w-5" /> 
          </Button>
          <Button 
            variant="secondary" 
            size="icon" 
            onClick={handleDownload}
            className="bg-background/70 hover:bg-background backdrop-blur-sm"
             aria-label="Download Image"
          >
            <Download className="h-5 w-5" />
          </Button>
           <Button 
             variant="destructive" 
             size="icon" 
             onClick={onClose}
             className="bg-destructive/70 hover:bg-destructive backdrop-blur-sm"
             aria-label="Close"
           >
             <X className="h-5 w-5" />
           </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ImageViewModal; 