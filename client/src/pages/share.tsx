import { useEffect, useState } from "react";
import { useLocation } from "wouter";

export default function SharePage() {
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<string>("処理中...");

  useEffect(() => {
    const handleSharedFile = async () => {
      try {
        // Check if the page was loaded with POST data
        if (window.location.search) {
          setStatus("ファイルを受信しました。解析ページに移動しています...");
          
          // Redirect to home page where the file upload component will handle it
          // The actual file will be processed via the standard upload flow
          setTimeout(() => {
            setLocation("/");
          }, 1000);
        } else {
          // If no data, just redirect to home
          setLocation("/");
        }
      } catch (error) {
        console.error("Share handling error:", error);
        setStatus("エラーが発生しました。ホームに移動します...");
        setTimeout(() => {
          setLocation("/");
        }, 2000);
      }
    };

    handleSharedFile();
  }, [setLocation]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
        <p className="text-lg text-gray-700 dark:text-gray-300">{status}</p>
      </div>
    </div>
  );
}
