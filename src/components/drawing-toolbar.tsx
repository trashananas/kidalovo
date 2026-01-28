'use client';

import { useState } from 'react';
import { Button } from './ui/button';
import { Slider } from './ui/slider';
import { Eraser, Hand } from 'lucide-react';
import { cn } from '@/lib/utils';

type DrawingToolbarProps = {
  color: string;
  setColor: (color: string) => void;
  strokeWidth: number;
  setStrokeWidth: (width: number) => void;
  drawingTool: string;
  setDrawingTool: (tool: string) => void;
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

  const handleColorClick = (c: string) => {
    setColor(c);
    setDrawingTool('pen');
  };

  return (
    <div className="absolute top-20 left-4 z-20 bg-card p-2 rounded-lg border shadow-lg flex flex-col gap-4 w-48">
      <div>
        <span className="text-xs font-medium text-muted-foreground">
          Инструмент
        </span>
        <div className="grid grid-cols-3 gap-1 mt-1">
          <Button
            variant={drawingTool === 'pan' ? 'secondary' : 'ghost'}
            size="icon"
            onClick={() => setDrawingTool('pan')}
            title="Перемещение (H)"
          >
            <Hand />
          </Button>
          <Button
            variant={drawingTool === 'eraser' ? 'secondary' : 'ghost'}
            size="icon"
            onClick={() => setDrawingTool('eraser')}
            title="Ластик (E)"
          >
            <Eraser />
          </Button>
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
                drawingTool === 'pen' && color === c
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
