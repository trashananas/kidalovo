'use client';

import { useState, useRef, useMemo } from 'react';
import type { Point, DrawingObject, DrawingShape } from '@/types';
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
  drawings: DrawingObject[];
  drawingTool: DrawingShape | 'pan' | 'eraser';
  setDrawingTool: (tool: DrawingShape | 'pan' | 'eraser') => void;
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

const RenderedObject = ({
  drawing,
  drawingTool,
  onDelete,
}: {
  drawing: DrawingObject;
  drawingTool: DrawingCanvasProps['drawingTool'];
  onDelete: (id: string) => void;
}) => {
  const commonProps = {
    stroke: drawing.color,
    strokeWidth: drawing.strokeWidth,
    fill: 'none',
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };

  const interactionProps = {
    className: cn(
      'transition-all',
      drawingTool === 'eraser' &&
        'cursor-pointer stroke-destructive/50 hover:stroke-destructive'
    ),
    style:
      drawingTool === 'eraser'
        ? { strokeWidth: commonProps.strokeWidth + 10 }
        : {},
    onPointerDown: (e: React.PointerEvent) => {
      if (drawingTool === 'eraser') {
        e.stopPropagation();
        onDelete(drawing.id);
      }
    },
  };

  switch (drawing.type) {
    case 'path':
      return (
        <path
          d={getSvgPathFromPoints(drawing.points)}
          {...commonProps}
          {...interactionProps}
        />
      );
    case 'arrow':
      return (
        <path
          d={getSvgPathFromPoints(drawing.points)}
          markerEnd={`url(#arrowhead-${drawing.color.replace('#', '')})`}
          {...commonProps}
          {...interactionProps}
        />
      );
    case 'rectangle': {
      if (drawing.points.length < 2) return null;
      const [p1, p2] = drawing.points;
      const x = Math.min(p1.x, p2.x);
      const y = Math.min(p1.y, p2.y);
      const width = Math.abs(p1.x - p2.x);
      const height = Math.abs(p1.y - p2.y);
      return (
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          {...commonProps}
          {...interactionProps}
        />
      );
    }
    case 'ellipse': {
      if (drawing.points.length < 2) return null;
      const [p1, p2] = drawing.points;
      const cx = (p1.x + p2.x) / 2;
      const cy = (p1.y + p2.y) / 2;
      const rx = Math.abs(p1.x - p2.x) / 2;
      const ry = Math.abs(p1.y - p2.y) / 2;
      return (
        <ellipse
          cx={cx}
          cy={cy}
          rx={rx}
          ry={ry}
          {...commonProps}
          {...interactionProps}
        />
      );
    }
    case 'triangle': {
      if (drawing.points.length < 3) return null;
      const pointsStr = drawing.points.map((p) => `${p.x},${p.y}`).join(' ');
      return (
        <polygon points={pointsStr} {...commonProps} {...interactionProps} />
      );
    }
    default:
      return null;
  }
};

export function DrawingCanvas({
  roomId,
  isDrawing,
  color,
  strokeWidth,
  panOffset,
  drawings,
  drawingTool,
  setDrawingTool,
}: DrawingCanvasProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [wipDrawing, setWipDrawing] = useState<Partial<DrawingObject> | null>(
    null
  );
  const [isInteracting, setIsInteracting] = useState(false);
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
      x: svgPoint.x,
      y: svgPoint.y,
    };
  };

  const saveDrawing = async (drawing: Omit<DrawingObject, 'id' | 'createdAt'>) => {
    if (!firestore || !user) return;
    const drawingsColRef = collection(firestore, 'rooms', roomId, 'drawings');
    try {
      await addDoc(drawingsColRef, {
        ...drawing,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: `Не удалось сохранить рисунок: ${getErrorMessage(error)}`,
        variant: 'destructive',
      });
    }
  };

  const deleteDrawing = async (drawingId: string) => {
    if (!firestore || !roomId) return;
    const drawingRef = doc(firestore, 'rooms', roomId, 'drawings', drawingId);
    try {
      await deleteDoc(drawingRef);
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
    const point = getPointInWorld(e);

    if (drawingTool === 'pan') return;

    if (drawingTool === 'triangle') {
      const currentPoints = wipDrawing?.points || [];
      const newPoints = [...currentPoints, point];
      setWipDrawing({
        type: 'triangle',
        points: newPoints,
        color,
        strokeWidth,
      });

      if (newPoints.length === 3) {
        if (user) {
          saveDrawing({
            userId: user.uid,
            type: 'triangle',
            points: newPoints,
            color,
            strokeWidth,
          });
        }
        setWipDrawing(null);
        setIsInteracting(false);
      }
    } else {
      setWipDrawing({ type: drawingTool, points: [point], color, strokeWidth });
    }
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!isDrawing || !isInteracting || drawingTool === 'pan') return;
    if (drawingTool === 'triangle' || !wipDrawing) return;

    if (e.buttons !== 1) return;
    const point = getPointInWorld(e);

    if (drawingTool === 'path' || drawingTool === 'arrow') {
      setWipDrawing((prev) => ({
        ...prev,
        points: [...(prev?.points || []), point],
      }));
    } else if (
      drawingTool === 'rectangle' ||
      drawingTool === 'ellipse'
    ) {
      setWipDrawing((prev) => ({
        ...prev,
        points: [prev?.points?.[0] || point, point],
      }));
    }
  };

  const handlePointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!isDrawing || !isInteracting || drawingTool === 'pan') {
       if (isInteracting) setIsInteracting(false);
       return;
    }

    e.currentTarget.releasePointerCapture(e.pointerId);
    setIsInteracting(false);

    if (
      wipDrawing &&
      wipDrawing.points &&
      wipDrawing.points.length > 0 &&
      wipDrawing.type &&
      wipDrawing.type !== 'triangle'
    ) {
      if (user) {
        saveDrawing({
            userId: user.uid,
            type: wipDrawing.type,
            points: wipDrawing.points,
            color: wipDrawing.color || color,
            strokeWidth: wipDrawing.strokeWidth || strokeWidth,
        });
      }
    }
    setWipDrawing(null);
  };
  
   const handleBoardPan = (e: React.PointerEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
     if (
      isDrawing &&
      drawingTool !== 'pan' &&
      !target.closest('[data-pan-initiator]')
    ) {
      return;
    }
    // The rest of your pan logic goes here
  };


  const cursorClass =
    {
      pen: 'cursor-crosshair',
      arrow: 'cursor-crosshair',
      rectangle: 'cursor-crosshair',
      ellipse: 'cursor-crosshair',
      triangle: 'cursor-crosshair',
      eraser: 'cursor-cell',
      pan: isInteracting ? 'cursor-grabbing' : 'cursor-grab',
    }[drawingTool] || 'cursor-default';

  const uniqueColors = useMemo(() => {
    const colors = new Set<string>();
    drawings.forEach(d => colors.add(d.color));
    if (wipDrawing?.color) colors.add(wipDrawing.color);
    return Array.from(colors);
  }, [drawings, wipDrawing]);


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
      style={{ transform: `translate(${panOffset.x}px, ${panOffset.y}px)` }}
    >
      <defs>
        {uniqueColors.map(c => (
            <marker
                key={c}
                id={`arrowhead-${c.replace('#', '')}`}
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerUnits="strokeWidth"
                markerWidth="8"
                markerHeight="6"
                orient="auto"
            >
                <path d="M 0 0 L 10 5 L 0 10 z" fill={c} />
            </marker>
        ))}
      </defs>
      <g>
        {drawings.map((drawing) => (
          <RenderedObject
            key={drawing.id}
            drawing={drawing}
            drawingTool={drawingTool}
            onDelete={deleteDrawing}
          />
        ))}

        {wipDrawing && wipDrawing.points && (
          <RenderedObject
            drawing={wipDrawing as DrawingObject}
            drawingTool={drawingTool}
            onDelete={() => {}}
          />
        )}
      </g>
    </svg>
  );
}
