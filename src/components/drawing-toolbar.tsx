'use client';

import {
  Eraser,
  Hand,
  Pen,
  ArrowUpRight,
  RectangleHorizontal,
  Circle,
  Triangle,
} from 'lucide-react';
import { Button } from './ui/button';
import { Slider } from './ui/slider';
import { cn } from '@/lib/utils';
import type { DrawingShape } from '@/types';

type DrawingToolbarProps = {
  color: string;
  setColor: (color: string) => void;
  strokeWidth: number;
  setStrokeWidth: (width: number) => void;
  drawingTool: DrawingShape | 'pan' | 'eraser';
  setDrawingTool: (tool: DrawingShape | 'pan' | 'eraser') => void;
};

export function DrawingToolbar({
  color,
  setColor,
  strokeWidth,
  setStrokeWidth,
  drawingTool,
  setDrawingTool,
}: DrawingToolbarProps) {
  const colors = [
    '#000000',
    '#EF4444',
    '#3B82F6',
    '#22C55E',
    '#FACC15',
    '#FFFFFF',
  ];

  const tools: {
    id: DrawingShape | 'pan' | 'eraser';
    icon: React.ElementType;
    title: string;
  }[] = [
    { id: 'pan', icon: Hand, title: 'Перемещение' },
    { id: 'pen', icon: Pen, title: 'Ручка' },
    { id: 'arrow', icon: ArrowUpRight, title: 'Стрелка' },
    { id: 'rectangle', icon: RectangleHorizontal, title: 'Прямоугольник' },
    { id: 'ellipse', icon: Circle, title: 'Эллипс' },
    { id: 'triangle', icon: Triangle, title: 'Треугольник' },
    { id: 'eraser', icon: Eraser, title: 'Ластик' },
  ];

  const handleColorClick = (c: string) => {
    setColor(c);
    if (drawingTool === 'pan' || drawingTool === 'eraser') {
      setDrawingTool('pen');
    }
  };

  return (
    <div className="absolute top-20 left-4 z-20 bg-card p-2 rounded-lg border shadow-lg flex flex-col gap-4 w-48">
      <div>
        <span className="text-xs font-medium text-muted-foreground">
          Инструменты
        </span>
        <div className="grid grid-cols-4 gap-1 mt-1">
          {tools.map((tool) => (
            <Button
              key={tool.id}
              variant={drawingTool === tool.id ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => setDrawingTool(tool.id)}
              title={tool.title}
            >
              <tool.icon />
            </Button>
          ))}
        </div>
      </div>
      <div>
        <span className="text-xs font-medium text-muted-foreground">Цвет</span>
        <div className="grid grid-cols-3 gap-2 mt-1">
          {colors.map((c) => (
            <button
              key={c}
              title={c}
              onClick={() => handleColorClick(c)}
              style={{ backgroundColor: c }}
              className={cn(
                'w-8 h-8 rounded-md border-2 transition-all',
                drawingTool !== 'pan' && drawingTool !== 'eraser' && color === c
                  ? 'ring-2 ring-ring ring-offset-2 ring-offset-background'
                  : 'border-card',
                c === '#FFFFFF' && 'border-muted'
              )}
            />
          ))}
        </div>
      </div>
      <div>
        <span className="text-xs font-medium text-muted-foreground">
          Толщина: {strokeWidth}px
        </span>
        <Slider
          min={1}
          max={20}
          step={1}
          value={[strokeWidth]}
          onValueChange={(value) => setStrokeWidth(value[0])}
          className="mt-2"
        />
      </div>
    </div>
  );
}
