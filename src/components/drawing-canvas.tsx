'use client';

import { useState, useRef, useMemo, useEffect } from 'react';
import type { Point, DrawingObject, DrawingShape } from '@/types';
import { useUser, useFirestore, useMemoFirebase } from '@/firebase';
import {
  collection,
  addDoc,
  serverTimestamp,
  doc,
  deleteDoc,
  updateDoc,
} from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/lib/utils';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

type DrawingCanvasProps = {
  roomId: string;
  isDrawing: boolean;
  color: string;
  strokeWidth: number;
  panOffset: { x: number; y: number };
  drawings: DrawingObject[];
  drawingTool: DrawingShape | 'pan' | 'eraser' | 'select';
  setDrawingTool: (tool: DrawingShape | 'pan' | 'eraser' | 'select') => void;
};

function getBoundingBox(object: DrawingObject): {
  x: number;
  y: number;
  width: number;
  height: number;
} {
  if (!object.points || object.points.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  if (object.type === 'rectangle' || object.type === 'ellipse') {
    if (object.points.length < 2) return { x: 0, y: 0, width: 0, height: 0 };
    const [p1, p2] = object.points;
    const x = Math.min(p1.x, p2.x);
    const y = Math.min(p1.y, p2.y);
    const width = Math.abs(p1.x - p2.x);
    const height = Math.abs(p1.y - p2.y);
    return { x, y, width, height };
  }

  const xCoords = object.points.map((p) => p.x);
  const yCoords = object.points.map((p) => p.y);
  const minX = Math.min(...xCoords);
  const minY = Math.min(...yCoords);
  const maxX = Math.max(...xCoords);
  const maxY = Math.max(...yCoords);

  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

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
  onPointerDown,
  isSelected,
  drawingTool,
}: {
  drawing: DrawingObject;
  onPointerDown: (e: React.PointerEvent) => void;
  isSelected: boolean;
  drawingTool: DrawingCanvasProps['drawingTool'];
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
      (drawingTool === 'select') && 'cursor-move',
      drawingTool === 'eraser' &&
        'cursor-pointer stroke-destructive/50 hover:stroke-destructive'
    ),
    style:
      drawingTool === 'eraser'
        ? { strokeWidth: commonProps.strokeWidth + 10 }
        : {},
    onPointerDown,
  };

  switch (drawing.type) {
    case 'path':
      return <path d={getSvgPathFromPoints(drawing.points)} {...commonProps} {...interactionProps} />;
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
      const { x, y, width, height } = getBoundingBox(drawing);
      return <rect x={x} y={y} width={width} height={height} {...commonProps} {...interactionProps} />;
    }
    case 'ellipse': {
      if (drawing.points.length < 2) return null;
      const { x, y, width, height } = getBoundingBox(drawing);
      const cx = x + width / 2;
      const cy = y + height / 2;
      const rx = width / 2;
      const ry = height / 2;
      return <ellipse cx={cx} cy={cy} rx={rx} ry={ry} {...commonProps} {...interactionProps} />;
    }
    case 'triangle': {
      if (drawing.points.length < 3) return null;
      const pointsStr = drawing.points.map((p) => `${p.x},${p.y}`).join(' ');
      return <polygon points={pointsStr} {...commonProps} {...interactionProps} />;
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

  const [wipDrawing, setWipDrawing] = useState<Partial<DrawingObject> | null>(null);
  const [isInteracting, setIsInteracting] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [isMoving, setIsMoving] = useState(false);
  const moveStartRef = useRef<{ x: number; y: number, object: DrawingObject } | null>(null);

  const selectedObject = useMemo(() => {
    if (!selectedObjectId) return null;
    return drawings.find((d) => d.id === selectedObjectId) || null;
  }, [selectedObjectId, drawings]);
  
  useEffect(() => {
    if (drawingTool !== 'select') {
      setSelectedObjectId(null);
    }
  }, [drawingTool]);

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

  const saveDrawing = (drawing: Omit<DrawingObject, 'id' | 'createdAt'>) => {
    if (!firestore || !user) return;
    const drawingsColRef = collection(firestore, 'rooms', roomId, 'drawings');
    addDoc(drawingsColRef, {
      ...drawing,
      createdAt: serverTimestamp(),
    }).catch(error => {
       errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: drawingsColRef.path,
            operation: 'create',
            requestResourceData: drawing,
        }));
        toast({
            title: 'Ошибка',
            description: `Не удалось сохранить рисунок: ${getErrorMessage(error)}`,
            variant: 'destructive',
        });
    });
  };

  const deleteDrawing = (drawingId: string) => {
    if (!firestore || !roomId) return;
    const drawingRef = doc(firestore, 'rooms', roomId, 'drawings', drawingId);
    deleteDoc(drawingRef).catch(error => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: drawingRef.path,
            operation: 'delete',
        }));
        toast({
            title: 'Ошибка',
            description: `Не удалось удалить рисунок: ${getErrorMessage(error)}`,
            variant: 'destructive',
        });
    });
  };

  const handleObjectPointerDown = (e: React.PointerEvent, drawing: DrawingObject) => {
      e.stopPropagation();

      if (drawingTool === 'select') {
          setSelectedObjectId(drawing.id);
          setIsMoving(true);
          setWipDrawing(drawing);
          moveStartRef.current = {
              x: e.clientX,
              y: e.clientY,
              object: drawing,
          };
          (e.target as HTMLElement).setPointerCapture(e.pointerId);
      } else if (drawingTool === 'eraser') {
          deleteDrawing(drawing.id);
      }
  }

  const handleCanvasPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.target === svgRef.current) {
        setSelectedObjectId(null);
    }
    if (!isDrawing || e.target !== svgRef.current || drawingTool === 'select' || drawingTool === 'pan' || drawingTool === 'eraser') return;

    e.currentTarget.setPointerCapture(e.pointerId);
    setIsInteracting(true);
    const point = getPointInWorld(e);

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

  const handleCanvasPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (isMoving && moveStartRef.current && selectedObject) {
        const dx = e.clientX - moveStartRef.current.x;
        const dy = e.clientY - moveStartRef.current.y;

        const newPoints = moveStartRef.current.object.points.map(p => ({
            x: p.x + dx,
            y: p.y + dy,
        }));
        
        setWipDrawing({ ...selectedObject, points: newPoints });
        return;
    }

    if (!isDrawing || !isInteracting || drawingTool === 'pan' || drawingTool === 'select' || drawingTool === 'eraser') return;
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

  const handleCanvasPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    if (isMoving && selectedObject && wipDrawing) {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
        setIsMoving(false);

        const objectRef = doc(firestore, 'rooms', roomId, 'drawings', selectedObject.id);
        updateDoc(objectRef, { points: wipDrawing.points })
            .catch(error => {
                errorEmitter.emit('permission-error', new FirestorePermissionError({
                    path: objectRef.path,
                    operation: 'update',
                    requestResourceData: { points: wipDrawing.points },
                }));
                toast({
                    title: 'Ошибка',
                    description: `Не удалось переместить объект: ${getErrorMessage(error)}`,
                    variant: 'destructive',
                });
            });
        
        setWipDrawing(null);
        moveStartRef.current = null;
        return;
    }

    if (!isDrawing || !isInteracting || drawingTool === 'pan' || drawingTool === 'select' || drawingTool === 'eraser') {
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
  
  const cursorClass = () => {
    if (!isDrawing) return 'pointer-events-none';
    
    switch(drawingTool) {
      case 'pan': return isInteracting ? 'cursor-grabbing' : 'cursor-grab';
      case 'select': return 'cursor-default';
      case 'eraser': return 'cursor-cell';
      case 'pen':
      case 'arrow':
      case 'rectangle':
      case 'ellipse':
      case 'triangle':
        return 'cursor-crosshair';
      default:
        return 'pointer-events-none';
    }
  }


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
        isDrawing && cursorClass()
      )}
      onPointerDown={handleCanvasPointerDown}
      onPointerMove={handleCanvasPointerMove}
      onPointerUp={handleCanvasPointerUp}
      onPointerLeave={handleCanvasPointerUp}
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
          // Hide the original object while it is being moved
          isMoving && drawing.id === selectedObjectId ? null : (
            <RenderedObject
              key={drawing.id}
              drawing={drawing}
              drawingTool={drawingTool}
              isSelected={drawing.id === selectedObjectId}
              onPointerDown={(e) => handleObjectPointerDown(e, drawing)}
            />
          )
        ))}

        {wipDrawing && wipDrawing.points && (
          <RenderedObject
            drawing={wipDrawing as DrawingObject}
            drawingTool={wipDrawing.type as DrawingShape}
            isSelected={false}
            onPointerDown={() => {}}
          />
        )}

        {selectedObject && !isMoving && (() => {
          const bbox = getBoundingBox(selectedObject);
          return (
            <rect
              x={bbox.x}
              y={bbox.y}
              width={bbox.width}
              height={bbox.height}
              fill="none"
              stroke="#3B82F6"
              strokeWidth={1}
              strokeDasharray="4 2"
              className="pointer-events-none"
            />
          );
        })()}
      </g>
    </svg>
  );
}