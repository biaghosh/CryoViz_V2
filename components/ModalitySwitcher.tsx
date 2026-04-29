"use client";


import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

export type Modality = "brightfield" | "fluorescent";

interface ModalitySwitcherProps {
  hasBrightfield: boolean;
  hasFluorescent: boolean;
  currentModality: Modality;
  onModalityChange: (modality: Modality) => void;
  className?: string;
}

export function ModalitySwitcher({
  hasBrightfield,
  hasFluorescent,
  currentModality,
  onModalityChange,
  className = "",
}: ModalitySwitcherProps) {
  // Don't show switcher if only one modality is available
//   if (!hasBrightfield || !hasFluorescent) {
//     return null;
//   }

  return (
    <div className={`bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-lg p-3 shadow-lg ${className}`}>
      <div className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
        Modality
      </div>
      <RadioGroup
        value={currentModality}
        onValueChange={(value) => onModalityChange(value as Modality)}
        className="flex gap-4"
      >
        {hasBrightfield && (
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="brightfield" id="brightfield" />
            <Label htmlFor="brightfield" className="text-sm cursor-pointer">
              Brightfield
            </Label>
          </div>
        )}
        {hasFluorescent && (
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="fluorescent" id="fluorescent" />
            <Label htmlFor="fluorescent" className="text-sm cursor-pointer">
              Fluorescent
            </Label>
          </div>
        )}
      </RadioGroup>
    </div>
  );
}
