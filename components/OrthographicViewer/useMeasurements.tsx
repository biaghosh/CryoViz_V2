import { Dispatch, SetStateAction } from "react";

type Point = { x: number; y: number };
type MeasureData = {
  points: Point[];
  lines: { p1: Point; p2: Point; dist: number }[];
};

type CanvasRefs = {
  XY: React.RefObject<HTMLCanvasElement>;
  XZ: React.RefObject<HTMLCanvasElement>;
  YZ: React.RefObject<HTMLCanvasElement>;
};

type PanState = {
  XY: { x: number; y: number };
  XZ: { x: number; y: number };
  YZ: { x: number; y: number };
};

type ZoomState = {
  XY: number;
  XZ: number;
  YZ: number;
};

export default function useMeasurements(
  canvasRefs: CanvasRefs,
  pan: PanState,
  zoom: ZoomState,
  drawAll: () => void,
  measureData: {
    XY: MeasureData;
    XZ: MeasureData;
    YZ: MeasureData;
  },
  setMeasureData: Dispatch<
    SetStateAction<{
      XY: MeasureData;
      XZ: MeasureData;
      YZ: MeasureData;
    }>
  >
) {
  const micronsPerPixel = 0.5;

  const handleMeasureClick = (
    e: React.MouseEvent<HTMLCanvasElement>,
    view: "XY" | "XZ" | "YZ"
  ) => {
    const canvas = canvasRefs[view].current!;
    const rect = canvas.getBoundingClientRect();
    const panView = pan[view];
    const zoomView = zoom[view];

    const x = (e.clientX - rect.left - panView.x) / zoomView;
    const y = (e.clientY - rect.top - panView.y) / zoomView;
    const newPoint = { x, y };

    setMeasureData((prev) => {
      const viewData = prev[view];
      const updatedPoints = [...viewData.points, newPoint];

      if (updatedPoints.length % 2 === 0) {
        const p1 = updatedPoints[updatedPoints.length - 2];
        const p2 = newPoint;
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const dist = Math.sqrt(dx * dx + dy * dy) * micronsPerPixel;

        return {
          ...prev,
          [view]: {
            points: updatedPoints,
            lines: [...viewData.lines, { p1, p2, dist }],
          },
        };
      }

      return {
        ...prev,
        [view]: {
          ...viewData,
          points: updatedPoints,
        },
      };
    });

    drawAll();
  };

  const handleToggleMeasure = (isMeasuring: boolean) => {
    if (!isMeasuring) {
      setMeasureData({
        XY: { points: [], lines: [] },
        XZ: { points: [], lines: [] },
        YZ: { points: [], lines: [] },
      });
      setTimeout(() => {
        drawAll();
      }, 0);
    }
  };

  return {
    micronsPerPixel,
    handleMeasureClick,
    handleToggleMeasure,
  };
}
