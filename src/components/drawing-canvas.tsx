'use client';

import { useState, useRef } from 'react';
import type { Point, Path } from '@/types';
import { useUser, useFirestore } from '@/firebase';
import {
  collection,
  addDoc,
  serverTimestamp,
  doc,
  deleteDoc,
} from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/lib/utils';

type DrawingCanvasProps = {
  roomId: string;
  isDrawing: boolean;
  color: string;
  strokeWidth: number;
  panOffset: { x: number; y: number };
  setPanOffset: (offset: { x: number; y: number }) => void;
  paths: Path[];
  drawingTool: string;
};

/**
 * Converts an array of points into an SVG path string.
 */
function getSvgPathFromPoints(points: Point[]): string {
  if (!points || points.length === 0) return '';

  if (points.length === 1) {
    const p = points[0];
    return `M ${p.x - 0.5} ${p.y} a 0.5 0.5 0 1 0 1 0 a 0.5 0.5 0 1 0 -1 0`;
  }

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
  setPanOffset,
  paths,
  drawingTool,
}: DrawingCanvasProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const [isInteracting, setIsInteracting] = useState(false);
  const interactionStartRef = useRef({ x: 0, y: 0 });

  const svgRef = useRef<SVGSVGElement>(null);

  const getPointInWorld = (e: React.PointerEvent<SVGSVGElement>): Point => {
    const svg = svgRef.current!;
    const point = svg.createSVGPoint();
    point.x = e.clientX;
    point.y = e.clientY;

    const invertedMatrix = svg.getScreenCTM()?.inverse();
    if (!invertedMatrix) return { x: 0, y: 0 };

    const svgPoint = point.matrixTransform(invertedMatrix);

    return {
      x: svgPoint.x - panOffset.x,
      y: svgPoint.y - panOffset.y,
    };
  };

  const deletePath = async (pathId: string) => {
    if (!firestore || !roomId) return;
    const pathRef = doc(firestore, 'rooms', roomId, 'paths', pathId);
    try {
      await deleteDoc(pathRef);
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: `Не удалось удалить рисунок: ${getErrorMessage(error)}`,
        variant: 'destructive',
      });
    }
  };

  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!isDrawing || e.target !== svgRef.current) return;

    e.currentTarget.setPointerCapture(e.pointerId);
    setIsInteracting(true);

    switch (drawingTool) {
      case 'pen':
        const point = getPointInWorld(e);
        setCurrentPoints([point]);
        break;
      case 'pan':
        interactionStartRef.current = {
          x: e.clientX - panOffset.x,
          y: e.clientY - panOffset.y,
        };
        break;
    }
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!isDrawing || !isInteracting) return;

    switch (drawingTool) {
      case 'pen':
        if (e.buttons !== 1) return;
        const point = getPointInWorld(e);
        setCurrentPoints((prev) => [...prev, point]);
        break;
      case 'pan':
        const newX = e.clientX - interactionStartRef.current.x;
        const newY = e.clientY - interactionStartRef.current.y;
        setPanOffset({ x: newX, y: newY });
        break;
    }
  };

  const handlePointerUp = async (e: React.PointerEvent<SVGSVGElement>) => {
    if (!isDrawing || !isInteracting) return;
    
    e.currentTarget.releasePointerCapture(e.pointerId);
    setIsInteracting(false);

    switch (drawingTool) {
      case 'pen':
        if (!firestore || !user || currentPoints.length === 0) {
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
            description: `Не удалось сохранить рисунок: ${getErrorMessage(
              error
            )}`,
            variant: 'destructive',
          });
        }
        setCurrentPoints([]);
        break;
      case 'pan':
        // Panning is finished, nothing to save.
        break;
    }
  };

  const cursorClass =
    {
      pen: 'cursor-crosshair',
      eraser: 'cursor-cell',
      pan: isInteracting ? 'cursor-grabbing' : 'cursor-grab',
    }[drawingTool] || 'cursor-default';

  return (
    <svg
      ref={svgRef}
      data-drawing-canvas="true"
      className={cn(
        'absolute inset-0 w-full h-full',
        isDrawing ? cursorClass : 'pointer-events-none'
      )}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      <g transform={`translate(${panOffset.x}, ${panOffset.y})`}>
        {paths.map((path) => (
          <path
            key={path.id}
            d={getSvgPathFromPoints(path.points)}
            stroke={path.color}
            strokeWidth={path.strokeWidth + (drawingTool === 'eraser' ? 10 : 0)}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={cn(
              'transition-all',
              drawingTool === 'eraser' &&
                'cursor-pointer stroke-destructive/50 hover:stroke-destructive'
            )}
            onPointerDown={(e) => {
              if (drawingTool === 'eraser') {
                e.stopPropagation();
                deletePath(path.id);
              }
            }}
          />
        ))}

        {currentPoints.length > 0 && drawingTool === 'pen' && (
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
