import { useState, useCallback } from "react";
import { Upload, FileType, Activity, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  isUploading: boolean;
  uploadProgress: number;
  error?: string;
}

export function FileUpload({ onFileSelect, isUploading, uploadProgress, error }: FileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].name.endsWith(".fit")) {
      onFileSelect(files[0]);
    }
  }, [onFileSelect]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onFileSelect(files[0]);
    }
  }, [onFileSelect]);

  return (
    <Card className="p-8">
      <div
        className={`
          relative min-h-64 flex flex-col items-center justify-center
          border-2 border-dashed rounded-lg transition-all duration-200
          ${isDragOver 
            ? "border-primary bg-primary/5" 
            : "border-muted-foreground/25 hover:border-muted-foreground/50"
          }
          ${isUploading ? "pointer-events-none opacity-60" : "cursor-pointer"}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isUploading && document.getElementById("file-input")?.click()}
        data-testid="dropzone-file-upload"
      >
        <input
          id="file-input"
          type="file"
          accept=".fit"
          className="hidden"
          onChange={handleFileInput}
          disabled={isUploading}
          data-testid="input-file"
        />

        {isUploading ? (
          <div className="flex flex-col items-center gap-4 px-8 w-full max-w-sm">
            <Activity className="h-12 w-12 text-primary animate-pulse" />
            <p className="text-lg font-medium">ファイルを解析中...</p>
            <Progress value={uploadProgress} className="w-full" />
            <p className="text-sm text-muted-foreground">{uploadProgress}%</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 p-8">
            <div className="p-4 rounded-full bg-primary/10">
              <Upload className="h-10 w-10 text-primary" />
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold">FITファイルをドラッグ＆ドロップ</p>
              <p className="text-sm text-muted-foreground mt-1">
                または、クリックしてファイルを選択
              </p>
            </div>
            <Button variant="outline" className="mt-2" data-testid="button-select-file">
              <FileType className="h-4 w-4 mr-2" />
              ファイルを選択
            </Button>
            <div className="flex items-center gap-2 mt-4 text-xs text-muted-foreground">
              <span className="px-2 py-1 bg-muted rounded">COROS</span>
              <span className="px-2 py-1 bg-muted rounded">Garmin</span>
              <span className="px-2 py-1 bg-muted rounded">Polar</span>
              <span className="px-2 py-1 bg-muted rounded">Suunto</span>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-2 text-destructive">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}
    </Card>
  );
}
