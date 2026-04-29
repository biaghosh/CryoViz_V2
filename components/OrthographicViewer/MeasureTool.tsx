"use client";
import { useState } from "react";
import { Ruler } from "lucide-react";
import { Card } from "@/components/ui/card";

interface MeasureToggleButtonProps {
  isMeasuring: boolean;
  onToggle: () => void;
}

const MeasureToggleButton: React.FC<MeasureToggleButtonProps> = ({
  isMeasuring,
  onToggle,
}) => {
  const [showPanel, setShowPanel] = useState(false);
  const tooltipText = isMeasuring ? "Clear Measurements" : "Start Measurement";

  return (
    <div style={{ position: "absolute", bottom: 60, left: 10, zIndex: 10 }}>
      <button
        onClick={() => setShowPanel((prev) => !prev)}
        className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-blue-600 dark:hover:bg-red-400 dark:hover:text-white hover:text-white transition-colors group"
        title="Toggle Measurement Panel"
      >
        <div className="relative">
          <Ruler size={20} className="transition-transform duration-200 transform group-hover:scale-110 group-hover:-rotate-x-10 group-hover:-rotate-y-10" />
        </div>
      </button>
      {showPanel && (
        <Card
          className="mt-2 p-3 flex flex-col gap-4 w-48 bg-white dark:bg-gray-800 shadow-lg transition-all duration-200"
          style={{
            position: "absolute",
            bottom: 40,
            left: 40,
            fontSize: "0.85rem",
          }}
        >
          <button
            onClick={onToggle}
            className={`w-full py-2 text-center rounded-md transition-colors ${
              isMeasuring
                ? "bg-red-500 hover:bg-red-600 text-white"
                : "bg-blue-500 hover:bg-blue-600 text-white"
            }`}
          >
            {tooltipText}
          </button>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Click twice in any plane (XY, XZ, YZ) to measure distance in µm.
          </p>
        </Card>
      )}
    </div>
  );
};

export default MeasureToggleButton;
