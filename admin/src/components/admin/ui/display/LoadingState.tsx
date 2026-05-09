'use client';

export function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((item) => (
        <div key={item} className="loading-block h-16 rounded-[22px]" />
      ))}
    </div>
  );
}

export const LoadingState = LoadingSkeleton;
