"use client";

import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider"; // Assuming you have shadcn slider, otherwise use <input type="range">

interface MaskOpacityControlProps {
  opacity: number;
  onOpacityChange: (value: number) => void;
  className?: string;
}

export function MaskOpacityControl({
  opacity,
  onOpacityChange,
  className = "",
}: MaskOpacityControlProps) {
  return (
    <div className={`bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-lg p-3 shadow-lg w-48 ${className}`}>
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Mask Appearance</span>
        <span className="text-[10px] text-muted-foreground">{Math.round(opacity * 100)}%</span>
      </div>
      
      <input
        type="range"
        min="0.05"
        max="1"
        step="0.01"
        value={opacity}
        onChange={(e) => onOpacityChange(parseFloat(e.target.value))}
        className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
      />
      
      <div className="flex justify-between mt-1 px-0.5">
        <span className="text-[10px] text-gray-500">Outline</span>
        <span className="text-[10px] text-gray-500">Fill</span>
      </div>
    </div>
  );
}
