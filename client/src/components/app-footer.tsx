export function AppFooter() {
  const gitHash = import.meta.env.VITE_GIT_HASH || 'dev';
  
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
