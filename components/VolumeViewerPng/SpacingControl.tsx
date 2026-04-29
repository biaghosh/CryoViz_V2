import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RefreshCw, Check, AlertCircle } from "lucide-react";

interface SpacingControlProps {
  spacing: number;
  onSpacingChange: (spacing: number) => void;
  onReset: () => void;
  datasetId: string;
  isLoading?: boolean;
}

const SpacingControl: React.FC<SpacingControlProps> = ({
  spacing,
  onSpacingChange,
  onReset,
  datasetId,
  isLoading = false,
}) => {
  const [localSpacing, setLocalSpacing] = useState(spacing);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value) && value > 0) {
      setLocalSpacing(value);
      setSaveStatus("idle");
    }
  };

  const handleSave = async () => {
    if (localSpacing === spacing) return;
    
    setIsSaving(true);
    setSaveStatus("idle");
    
    try {
      const response = await fetch("/api/dataset-spacing", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          datasetId,
          spacing: localSpacing,
        }),
      });

      if (response.ok) {
        onSpacingChange(localSpacing);
        setSaveStatus("success");
        setTimeout(() => setSaveStatus("idle"), 2000);
      } else {
        throw new Error("Failed to save spacing");
      }
    } catch (error) {
      console.error("Error saving spacing:", error);
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setLocalSpacing(spacing);
    onReset();
    setSaveStatus("idle");
  };

  const hasChanges = localSpacing !== spacing;

  return (
    <div className="flex flex-col gap-3 mt-1">
      <div className="flex items-center justify-between">
        <Label className="text-white text-sm font-medium">Z-Axis Spacing</Label>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleReset}
          disabled={isLoading || isSaving}
          className="h-6 w-6 p-0 text-white hover:bg-white/20"
        >
          <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>
      
      <div className="flex items-center gap-2">
        <Input
          type="number"
          value={localSpacing}
          onChange={handleInputChange}
          min="0.1"
          step="0.1"
          className="h-8 w-20 text-center text-white bg-white/10 border-white/20 focus:border-white/40"
          placeholder="3.0"
        />
        <span className="text-white text-xs opacity-70">units</span>
      </div>
      
      <div className="text-xs text-white/60">
        Current: [1, 1, {localSpacing}]
      </div>

   

      {/* Save Button */}
      {hasChanges && (
        <Button
          onClick={handleSave}
          disabled={isSaving}
          size="sm"
          className="h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white"
        >
          {isSaving ? "Saving..." : "Save Changes"}
        </Button>
      )}

      {/* Status Indicators */}
      {saveStatus === "success" && (
        <div className="flex items-center gap-2 text-xs text-green-400">
          <Check className="h-3 w-3" />
          Spacing saved successfully
        </div>
      )}
      
      {saveStatus === "error" && (
        <div className="flex items-center gap-2 text-xs text-red-400">
          <AlertCircle className="h-3 w-3" />
          <span>Failed to save spacing</span>
        </div>
      )}
    </div>
  );
};

export default SpacingControl;
