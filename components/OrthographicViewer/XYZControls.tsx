"use client";
import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { Card } from "@/components/ui/card";

type Axis = "x" | "y" | "z";

interface XYZControlsProps {
  coords: { x: number; y: number; z: number };
  onChange: (axis: Axis, value: number) => void;
  limits: { x: number; y: number; z: number };
  onReset?: () => void;
}

const XYZControls: React.FC<XYZControlsProps> = ({
  coords,
  onChange,
  limits,
  onReset,
}) => {
  const [showPanel, setShowPanel] = useState(false);

  const axisLabels: Record<Axis, string> = {
    x: "X (Left–Right)",
    y: "Y (Front–Back)",
    z: "Z (Bottom–Top)",
  };

  return (
    <div style={{ position: "absolute", bottom: 10, left: 10, zIndex: 10 }}>
      <button
        onClick={() => setShowPanel((prev) => !prev)}
        className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 dark:hover:bg-red-400 dark:hover:text-white hover:bg-blue-600 hover:text-white transition-colors group"
        title="Toggle Slice Controls"
      >
        <div className="relative">
          <SlidersHorizontal size={20} className="transition-transform duration-200 transform group-hover:scale-110 group-hover:-rotate-x-10 group-hover:-rotate-y-10" />
        </div>
      </button>
      {showPanel && (
        <Card
          className="mt-2 p-3 flex flex-col gap-3 w-64 bg-white dark:bg-gray-800 shadow-lg transition-all duration-200"
          style={{
            position: "absolute",
            bottom: 40,
            left: 40,
            fontSize: "0.85rem",
          }}
        >
          <div className="flex justify-end">
            <button
              onClick={() => setShowPanel(false)}
              className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              title="Close"
            >
              ×
            </button>
          </div>
          {(["x", "y", "z"] as const).map((axis) => (
            <div key={axis} title={axisLabels[axis]} className="flex flex-col gap-1">
              <label className="text-sm font-medium">{axis.toUpperCase()}</label>
              <div className="flex gap-2 items-center">
                <input
                  type="range"
                  min={0}
                  max={limits[axis]}
                  value={coords[axis]}
                  onChange={(e) => onChange(axis, Number(e.target.value))}
                  className="flex-1"
                />
                <input
                  type="number"
                  min={0}
                  max={limits[axis]}
                  value={coords[axis]}
                  onChange={(e) =>
                    onChange(axis, Math.min(Math.max(Number(e.target.value), 0), limits[axis]))
                  }
                  className="w-12 p-1 text-sm border rounded-md bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
                />
              </div>
            </div>
          ))}
          <div className="flex justify-end">
            <button
              onClick={onReset}
              className="px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
            >
              Reset View
            </button>
          </div>
        </Card>
      )}
    </div>
  );
};

export default XYZControls;
