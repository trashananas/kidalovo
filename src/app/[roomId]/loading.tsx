import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  const skeletonPositions = [
    { top: '15%', left: '10%', rotate: '-3deg' },
    { top: '30%', left: '60%', rotate: '2deg' },
    { top: '55%', left: '20%', rotate: '5deg' },
    { top: '70%', left: '75%', rotate: '-2deg' },
    { top: '40%', left: '35%', rotate: '-4deg' },
  ];

  return (
    <div className="w-full h-screen p-4 overflow-hidden">
      <div className="w-full h-full rounded-lg border bg-card shadow-sm relative">
        <Skeleton className="absolute top-4 left-4 h-10 w-24 rounded-lg" />
        {skeletonPositions.map((pos, i) => (
          <Skeleton
            key={i}
            className="absolute w-64 h-32 rounded-lg"
            style={{
              top: pos.top,
              left: pos.left,
              transform: `rotate(${pos.rotate})`,
            }}
          />
        ))}
         <Skeleton className="absolute bottom-4 left-1/2 -translate-x-1/2 h-24 w-[90%] max-w-2xl rounded-lg" />
      </div>
    </div>
  );
}
