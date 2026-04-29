"use client";
import { useState, useRef, useEffect } from "react";

type Annotation = {
  _id: string;
  id: string;
  view: "XY" | "XZ" | "YZ";
  slice: number;
  x: number;
  y: number;
  text: string;
  instance: number;
  datetime: number;
  user: string | null;
  groupName?: string; // Add group name field
};

type Props = {
  annotation: Annotation;
  onUpdate: (id: string, newText: string, newPos?: { x: number; y: number }, save?: boolean) => void;
  zoomXY: number;
  panXY: { x: number; y: number };
  canvasRef: React.RefObject<HTMLCanvasElement>;
  currentGroupName?: string; // Add current group context
};

export default function AnnotationTextBox({ 
  annotation, 
  onUpdate, 
  zoomXY, 
  panXY, 
  canvasRef,
  currentGroupName = "Default Group"
}: Props) {
  const [editing, setEditing] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  // Get canvas and parent position in viewport
  const canvasRect = canvasRef.current?.getBoundingClientRect();
  const parentRect = canvasRef.current?.parentElement?.getBoundingClientRect();
  // Adjust for padding or centering offset
  const offsetX = parentRect && canvasRect ? canvasRect.left - parentRect.left : 0;
  // Convert image coordinates to screen coordinates
  const screenX = canvasRect ? (annotation.x * zoomXY + panXY.x + offsetX) : 0;
  const screenY = canvasRect ? (annotation.y * zoomXY + panXY.y + (canvasRect.top - (parentRect?.top || 0))) : 0;

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editing]);

  // Debug log for positioning
  useEffect(() => {
    console.log("Annotation position:", {
      _id: annotation._id,
      screenX,
      screenY,
      annotationX: annotation.x,
      annotationY: annotation.y,
      zoomXY,
      panXY,
      canvasLeft: canvasRect?.left,
      canvasTop: canvasRect?.top,
      parentLeft: parentRect?.left,
      parentTop: parentRect?.top,
      offsetX,
      groupName: annotation.groupName || currentGroupName,
    });
  }, [screenX, screenY, annotation.x, annotation.y, zoomXY, panXY, canvasRect, parentRect, offsetX, annotation._id, annotation.groupName, currentGroupName]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      setEditing(false);
      // Ensure the annotation has the current group name
      const updatedAnnotation = { ...annotation, groupName: annotation.groupName || currentGroupName };
      onUpdate(updatedAnnotation._id || updatedAnnotation.id, updatedAnnotation.text, undefined, true);
    }
  };

  return (
    <div
      style={{
        position: "absolute",
        left: screenX,
        top: screenY,
        cursor: "move",
        padding: "2px 4px",
        borderRadius: "4px",
        zIndex: 1000,
        pointerEvents: "auto",
        background: "rgba(0, 0, 0, 0.7)",
        color: "white",
      }}
      draggable
      onDragEnd={(e) => {
        const canvasRect = canvasRef.current?.getBoundingClientRect();
        if (!canvasRect) return;

        // Convert screen coordinates back to image coordinates
        const canvasX = (e.clientX - canvasRect.left - panXY.x) / zoomXY;
        const canvasY = (e.clientY - canvasRect.top - panXY.y) / zoomXY;

        // Clamp coordinates to canvas bounds
        const canvas = canvasRef.current;
        const maxX = canvas ? canvas.width / zoomXY : Infinity;
        const maxY = canvas ? canvas.height / zoomXY : Infinity;
        const clampedX = Math.max(0, Math.min(canvasX, maxX));
        const clampedY = Math.max(0, Math.min(canvasY, maxY));

        console.log("Drag end:", {
          canvasX,
          canvasY,
          clientX: e.clientX,
          clientY: e.clientY,
          canvasLeft: canvasRect.left,
          canvasTop: canvasRect.top,
          clampedX,
          clampedY,
        });

        onUpdate(annotation._id || annotation.id, annotation.text, { x: clampedX, y: clampedY }, true);
      }}
      onDoubleClick={() => setEditing(true)}
    >
      {editing ? (
        <input
          ref={inputRef}
          value={annotation.text}
          onChange={(e) => onUpdate(annotation._id || annotation.id, e.target.value, undefined, false)}
          onKeyDown={handleKeyDown}
          onBlur={() => setEditing(false)}
          style={{ border: "none", background: "transparent", color: "white" }}
        />
      ) : (
        <span>{annotation.text}</span>
      )}
    </div>
  );
}