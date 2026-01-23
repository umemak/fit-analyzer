export function AppFooter() {
  const gitHash = import.meta.env.VITE_GIT_HASH || 'dev';
  
  // Debug: log environment variables
  if (import.meta.env.DEV) {
    console.log('[AppFooter] VITE_GIT_HASH:', import.meta.env.VITE_GIT_HASH);
    console.log('[AppFooter] All env:', import.meta.env);
  }
  
  return (
    <footer className="border-t py-8 mt-12">
      <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
        <p>COROS、Garmin、Polar、Suuntoなど主要なスポーツウォッチのFITファイルに対応</p>
        <p className="mt-2 text-xs opacity-60">
          Version: {gitHash}
        </p>
      </div>
    </footer>
  );
}
