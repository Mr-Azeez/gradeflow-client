const LoadingScreen = () => {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 rounded-full border-2 border-surface-800" />
          <div className="absolute inset-0 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
        </div>
        <p className="text-sm text-surface-500 font-medium">Loading…</p>
      </div>
    </div>
  );
};

export default LoadingScreen;
