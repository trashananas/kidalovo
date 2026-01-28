'use client';

import { useState, useRef } from 'react';
import { usePaths } from '@/hooks/use-paths';
import type { Point } from '@/types';
import { useUser, useFirestore } from '@/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/lib/utils';

type DrawingCanvasProps = {
  roomId: string;
  isDrawing: boolean;
  color: string;
  strokeWidth: number;
  panOffset: { x: number; y: number };
};

/**
 * Converts an array of points into an SVG path string.
 */
function getSvgPathFromPoints(points: Point[]): string {
  if (!points || points.length === 0) return '';

  // If there's only one point, create a tiny circle path to make a dot
  if (points.length === 1) {
    const p = points[0];
    return `M ${p.x - 0.5} ${p.y} a 0.5 0.5 0 1 0 1 0 a 0.5 0.5 0 1 0 -1 0`;
  }

  // Create a line connecting all the points
  const d = points.reduce(
    (acc, point, i) =>
      i === 0
        ? `M ${point.x},${point.y}`
        : `${acc} L ${point.x},${point.y}`,
    ''
  );
  return d;
}

export function DrawingCanvas({
  roomId,
  isDrawing,
  color,
  strokeWidth,
  panOffset,
}: DrawingCanvasProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const { paths } = usePaths(roomId);
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);

  const svgRef = useRef<SVGSVGElement>(null);

  /**
   * Converts pointer event screen coordinates to SVG coordinates,
   * adjusting for the current pan offset to get "world" coordinates.
   */
  const getPointInWorld = (e: React.PointerEvent<SVGSVGElement>): Point => {
    const svg = svgRef.current!;
    const point = svg.createSVGPoint();
    point.x = e.clientX;
    point.y = e.clientY;
    
    const invertedMatrix = svg.getScreenCTM()?.inverse();
    if (!invertedMatrix) return { x: 0, y: 0 }; // Should not happen

    const svgPoint = point.matrixTransform(invertedMatrix);
    
    return {
      x: svgPoint.x - panOffset.x,
      y: svgPoint.y - panOffset.y,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!isDrawing || !svgRef.current) return;
    // Capture the pointer to ensure we get all events for this stroke
    e.currentTarget.setPointerCapture(e.pointerId);

    const point = getPointInWorld(e);
    setCurrentPoints([point]);
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    // Only draw if the primary button is held down
    if (e.buttons !== 1 || !isDrawing) return;
    
    const point = getPointInWorld(e);
    setCurrentPoints((prev) => [...prev, point]);
  };

  const handlePointerUp = async () => {
    if (!isDrawing || !firestore || !user || currentPoints.length === 0) {
      setCurrentPoints([]);
      return;
    }

    const pathsColRef = collection(firestore, 'rooms', roomId, 'paths');
    try {
      await addDoc(pathsColRef, {
        userId: user.uid,
        points: currentPoints,
        color: color,
        strokeWidth: strokeWidth,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: `Не удалось сохранить рисунок: ${getErrorMessage(error)}`,
        variant: 'destructive',
      });
    }

    setCurrentPoints([]);
  };

  return (
    <svg
      ref={svgRef}
      data-drawing-canvas="true"
      className={cn(
        'absolute inset-0 w-full h-full',
        isDrawing ? 'cursor-crosshair' : 'pointer-events-none'
      )}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp} // End drawing if the pointer leaves the canvas
    >
      <g transform={`translate(${panOffset.x}, ${panOffset.y})`}>
        {/* Render all saved paths from other users */}
        {paths.map((path) => (
          <path
            key={path.id}
            d={getSvgPathFromPoints(path.points)}
            stroke={path.color}
            strokeWidth={path.strokeWidth}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}

        {/* Render the path currently being drawn by the user */}
        {currentPoints.length > 0 && (
          <path
            d={getSvgPathFromPoints(currentPoints)}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
      </g>
    </svg>
  );
}
