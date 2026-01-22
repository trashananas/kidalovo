import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="w-full h-screen p-4 overflow-hidden">
      <div className="w-full h-full rounded-lg border bg-card shadow-sm relative">
        <Skeleton className="absolute top-4 left-4 h-10 w-24 rounded-lg" />
        {[...Array(5)].map((_, i) => (
          <Skeleton
            key={i}
            className="absolute w-64 h-32 rounded-lg"
            style={{
              top: `${Math.random() * 60 + 10}%`,
              left: `${Math.random() * 70 + 5}%`,
              transform: `rotate(${Math.random() * 10 - 5}deg)`,
            }}
          />
        ))}
         <Skeleton className="absolute bottom-4 left-1/2 -translate-x-1/2 h-24 w-[90%] max-w-2xl rounded-lg" />
      </div>
    </div>
  );
}
