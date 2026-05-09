'use client';

export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-[32px] border border-[rgb(var(--surface-border))]/75 bg-[rgb(var(--surface-2))]/88 p-3 shadow-[var(--shadow-panel)] backdrop-blur-xl">
      <div className="mb-3 flex items-center justify-between rounded-[24px] border border-[rgb(var(--surface-border))]/60 bg-[rgb(var(--surface-3))]/45 px-4 py-3">
        <div className="loading-block h-4 w-40 rounded-full" />
        <div className="loading-block h-8 w-28 rounded-full" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="grid grid-cols-12 gap-3 rounded-[22px] border border-[rgb(var(--surface-border))]/45 bg-[rgb(var(--surface-3))]/35 px-4 py-4">
            <div className="loading-block col-span-3 h-4 rounded-full" />
            <div className="loading-block col-span-2 h-4 rounded-full" />
            <div className="loading-block col-span-2 h-4 rounded-full" />
            <div className="loading-block col-span-3 h-4 rounded-full" />
            <div className="loading-block col-span-2 h-4 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
