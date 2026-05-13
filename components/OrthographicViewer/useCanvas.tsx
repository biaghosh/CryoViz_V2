import { useCallback, useRef, useState, useEffect } from "react";
import type { Dispatch, SetStateAction } from "react";

type Point = { x: number; y: number };
type MeasureData = {
  points: Point[];
  lines: { p1: Point; p2: Point; dist: number }[];
};

type Dimensions = {
  xy: { width: number; height: number };
  xz: { width: number; height: number };
  yz: { width: number; height: number };
};

type ScaledDimensions = {
  xy: { width: number; height: number; scale: number };
  xz: { width: number; height: number; scale: number };
  yz: { width: number; height: number; scale: number };
};

export default function useCanvas(
  theme: string | undefined,
  coords: { x: number; y: number; z: number },
  measureData: { XY: MeasureData; XZ: MeasureData; YZ: MeasureData },
  setLoading: (loading: boolean) => void,
  setErrorMessage: (message: string | null) => void,
  setCoords: Dispatch<SetStateAction<{ x: number; y: number; z: number }>>,
  blobUrl: string,
  numZ: number,
  numY: number,
  numX: number
) {
  const bgColor = theme === "dark" ? "#000000" : "#ffffff";

  const [dimensions, setDimensions] = useState<Dimensions>({
    xy: { width: 512, height: 512 },
    xz: { width: 512, height: 160 },
    yz: { width: 512, height: 160 },
  });

  const [scaledDimensions, setScaledDimensions] = useState<ScaledDimensions>({
    xy: { width: 512, height: 512, scale: 1 },
    xz: { width: 512, height: 160, scale: 1 },
    yz: { width: 512, height: 160, scale: 1 },
  });

  const canvasXY = useRef<HTMLCanvasElement | null>(null);
  const canvasXZ = useRef<HTMLCanvasElement | null>(null);
  const canvasYZ = useRef<HTMLCanvasElement | null>(null);

  const slicesXY = useRef<HTMLImageElement[]>([]);
  const slicesXZ = useRef<HTMLImageElement[]>([]);
  const slicesYZ = useRef<HTMLImageElement[]>([]);

  const loaded = useRef(false);

  // States for Zoom and Pan
  const [panXY, setPanXY] = useState({ x: 0, y: 0 });
  const [panXZ, setPanXZ] = useState({ x: 0, y: 0 });
  const [panYZ, setPanYZ] = useState({ x: 0, y: 0 });
  const [zoomXY, setZoomXY] = useState(1);
  const [zoomXZ, setZoomXZ] = useState(1);
  const [zoomYZ, setZoomYZ] = useState(1);

  // Refs for Zoom/Pan (Required for immediate drawing during interaction)
  const panRefXY = useRef({ x: 0, y: 0 });
  const panRefXZ = useRef({ x: 0, y: 0 });
  const panRefYZ = useRef({ x: 0, y: 0 });
  const zoomRefXY = useRef(1);
  const zoomRefXZ = useRef(1);
  const zoomRefYZ = useRef(1);

  const isPanningRef = useRef<"XY" | "XZ" | "YZ" | null>(null);
  const lastMouse = useRef({ x: 0, y: 0 });

  const [activePixelColor, setActivePixelColor] = useState<{
    view: "XY" | "XZ" | "YZ";
    color: string;
  } | null>(null);

  const calculateOptimalScaling = useCallback((naturalDimensions: Dimensions) => {
    const targetViewportWidth = window.innerWidth - 80;
    const targetViewportHeight = window.innerHeight - 200;
    const xyHeight = targetViewportHeight * 0.6;
    const bottomHeight = targetViewportHeight * 0.4;
    
    const xyScale = Math.min((targetViewportWidth * 0.9) / naturalDimensions.xy.width, xyHeight / naturalDimensions.xy.height);
    const xzScale = Math.min((targetViewportWidth * 0.45) / naturalDimensions.xz.width, bottomHeight / naturalDimensions.xz.height);
    const yzScale = Math.min((targetViewportWidth * 0.45) / naturalDimensions.yz.width, bottomHeight / naturalDimensions.yz.height);
    
    const minScale = 0.1;
    return {
      xy: { width: Math.round(naturalDimensions.xy.width * Math.max(xyScale, minScale)), height: Math.round(naturalDimensions.xy.height * Math.max(xyScale, minScale)), scale: Math.max(xyScale, minScale) },
      xz: { width: Math.round(naturalDimensions.xz.width * Math.max(xzScale, minScale)), height: Math.round(naturalDimensions.xz.height * Math.max(xzScale, minScale)), scale: Math.max(xzScale, minScale) },
      yz: { width: Math.round(naturalDimensions.yz.width * Math.max(yzScale, minScale)), height: Math.round(naturalDimensions.yz.height * Math.max(yzScale, minScale)), scale: Math.max(yzScale, minScale) }
    };
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (loaded.current && dimensions.xy.width > 0) {
        setScaledDimensions(calculateOptimalScaling(dimensions));
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [dimensions, calculateOptimalScaling]);

  const loadSingleImage = useCallback((url: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = url;
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Failed to load: ${url}`));
    });
  }, []);

  const preloadImages = useCallback(async () => {
    setLoading(true);
    try {
      const midZ = Math.floor(numZ / 2);
      const midY = Math.floor(numY / 2);
      const midX = Math.floor(numX / 2);
      const pad = (n: number) => n.toString().padStart(3, "0");

      const [centerXY, centerXZ, centerYZ] = await Promise.all([
        loadSingleImage(`${blobUrl}/xy/${pad(midZ)}.png`),
        loadSingleImage(`${blobUrl}/xz/${pad(midY)}.png`),
        loadSingleImage(`${blobUrl}/yz/${pad(midX)}.png`),
      ]);

      const naturalDimensions = {
        xy: { width: centerXY.naturalWidth, height: centerXY.naturalHeight },
        xz: { width: centerXZ.naturalWidth, height: centerXZ.naturalHeight },
        yz: { width: centerYZ.naturalWidth, height: centerYZ.naturalHeight },
      };
      setDimensions(naturalDimensions);
      setScaledDimensions(calculateOptimalScaling(naturalDimensions));

      slicesXY.current = new Array(numZ);
      slicesXZ.current = new Array(numY);
      slicesYZ.current = new Array(numX);
      slicesXY.current[midZ] = centerXY;
      slicesXZ.current[midY] = centerXZ;
      slicesYZ.current[midX] = centerYZ;

      loaded.current = true;
      setLoading(false);

      const makeUrls = (folder: string, count: number, skip: number) =>
        Array.from({ length: count }, (_, i) => i).filter(i => i !== skip).map(i => ({ i, url: `${blobUrl}/${folder}/${pad(i)}.png` }));

      const loadAxis = async (items: { i: number; url: string }[], target: HTMLImageElement[]) => {
        const BATCH = 30;
        for (let b = 0; b < items.length; b += BATCH) {
          const batch = items.slice(b, b + BATCH);
          const imgs = await Promise.all(batch.map(item => loadSingleImage(item.url)));
          batch.forEach((item, j) => { target[item.i] = imgs[j]; });
        }
      };

      await Promise.all([
        loadAxis(makeUrls("xy", numZ, midZ), slicesXY.current),
        loadAxis(makeUrls("xz", numY, midY), slicesXZ.current),
        loadAxis(makeUrls("yz", numX, midX), slicesYZ.current),
      ]);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to load images");
      setLoading(false);
    }
  }, [blobUrl, numZ, numY, numX, loadSingleImage, calculateOptimalScaling, setLoading, setErrorMessage]);

  const drawCrosshair = useCallback((ctx: CanvasRenderingContext2D, x: number, y: number, color: string) => {
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, y); ctx.lineTo(ctx.canvas.width, y);
    ctx.moveTo(x, 0); ctx.lineTo(x, ctx.canvas.height);
    ctx.stroke();
  }, []);

  const drawMeasurement = useCallback((ctx: CanvasRenderingContext2D, lines: { p1: Point; p2: Point; dist: number }[]) => {
    lines.forEach(({ p1, p2, dist }) => {
      ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y);
      ctx.strokeStyle = "#00ffff"; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = "#00ffff"; ctx.font = "14px sans-serif";
      ctx.fillText(`${dist.toFixed(2)} µm`, (p1.x + p2.x) / 2, (p1.y + p2.y) / 2);
    });
  }, []);

const drawAll = useCallback(() => {
    if (!loaded.current) return;
    const views = [
      { key: "xy", ctx: canvasXY.current?.getContext("2d", { willReadFrequently: true }), slice: coords.z, slices: slicesXY.current, pan: panRefXY.current, zoom: zoomRefXY.current, cross: [coords.x, coords.y], mData: measureData.XY },
      { key: "xz", ctx: canvasXZ.current?.getContext("2d", { willReadFrequently: true }), slice: coords.y, slices: slicesXZ.current, pan: panRefXZ.current, zoom: zoomRefXZ.current, cross: [coords.x, coords.z], mData: measureData.XZ },
      { key: "yz", ctx: canvasYZ.current?.getContext("2d", { willReadFrequently: true }), slice: coords.x, slices: slicesYZ.current, pan: panRefYZ.current, zoom: zoomRefYZ.current, cross: [coords.y, coords.z], mData: measureData.YZ },
    ];

    views.forEach(v => {
      if (!v.ctx || !v.slices[v.slice]) return;
      const dim = dimensions[v.key as keyof Dimensions];
      const sDim = scaledDimensions[v.key as keyof ScaledDimensions];
      const scaleX = sDim.width / dim.width;
      const scaleY = sDim.height / dim.height;

      v.ctx.fillStyle = bgColor;
      v.ctx.fillRect(0, 0, v.ctx.canvas.width, v.ctx.canvas.height);
      v.ctx.save();
      v.ctx.translate(v.pan.x, v.pan.y);
      v.ctx.scale(v.zoom * scaleX, v.zoom * scaleY);
      v.ctx.drawImage(v.slices[v.slice], 0, 0);
      drawMeasurement(v.ctx, v.mData.lines);
      v.ctx.restore();
      drawCrosshair(v.ctx, (v.cross[0] * scaleX * v.zoom) + v.pan.x, (v.cross[1] * scaleY * v.zoom) + v.pan.y, "red");
    });
  }, [coords, bgColor, dimensions, scaledDimensions, measureData, drawCrosshair, drawMeasurement]);

  const getScaledImageCoordinates = useCallback((view: "XY" | "XZ" | "YZ", screenX: number, screenY: number, pan: { x: number; y: number }, zoom: number) => {
    const v = view.toLowerCase() as keyof Dimensions;
    const scaleX = scaledDimensions[v].width / dimensions[v].width;
    const scaleY = scaledDimensions[v].height / dimensions[v].height;
    return { x: (screenX - pan.x) / (zoom * scaleX), y: (screenY - pan.y) / (zoom * scaleY) };
  }, [scaledDimensions, dimensions]);

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>, view: "XY" | "XZ" | "YZ") => {
    const canvas = { XY: canvasXY, XZ: canvasXZ, YZ: canvasYZ }[view].current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const pan = { XY: panXY, XZ: panXZ, YZ: panYZ }[view];
    const zoom = { XY: zoomXY, XZ: zoomXZ, YZ: zoomYZ }[view];
    const imgCoords = getScaledImageCoordinates(view, e.clientX - rect.left, e.clientY - rect.top, pan, zoom);

    setCoords(prev => {
      const nc = { ...prev };
      if (view === "XY") { nc.x = Math.floor(imgCoords.x); nc.y = Math.floor(imgCoords.y); }
      else if (view === "XZ") { nc.x = Math.floor(imgCoords.x); nc.z = Math.floor(imgCoords.y); }
      else { nc.y = Math.floor(imgCoords.x); nc.z = Math.floor(imgCoords.y); }
      return { x: Math.max(0, Math.min(nc.x, numX - 1)), y: Math.max(0, Math.min(nc.y, numY - 1)), z: Math.max(0, Math.min(nc.z, numZ - 1)) };
    });
  }, [zoomXY, zoomXZ, zoomYZ, panXY, panXZ, panYZ, setCoords, numX, numY, numZ, getScaledImageCoordinates]);

  // --- UPDATED HANDLEWHEEL ---
  const handleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>, view: "XY" | "XZ" | "YZ") => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;

      const zoom = { XY: zoomXY, XZ: zoomXZ, YZ: zoomYZ }[view];
      const setZoom = { XY: setZoomXY, XZ: setZoomXZ, YZ: setZoomYZ }[view];
      const zRef = { XY: zoomRefXY, XZ: zoomRefXZ, YZ: zoomRefYZ }[view];
      const pan = { XY: panXY, XZ: panXZ, YZ: panYZ }[view];
      const setPan = { XY: setPanXY, XZ: setPanXZ, YZ: setPanYZ }[view];
      const pRef = { XY: panRefXY, XZ: panRefXZ, YZ: panRefYZ }[view];

      const newZoom = Math.min(Math.max(zoom * delta, 0.1), 10);
      const rect = e.currentTarget.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const dx = (mouseX - pan.x) * (newZoom / zoom - 1);
      const dy = (mouseY - pan.y) * (newZoom / zoom - 1);
      const newPan = { x: pan.x - dx, y: pan.y - dy };

      pRef.current = newPan; setPan(newPan);
      zRef.current = newZoom; setZoom(newZoom);
      drawAll();
    } else {
      const dir = e.deltaY > 0 ? 1 : -1;
      setCoords(p => ({
        x: view === "YZ" ? Math.min(Math.max(p.x + dir, 0), numX - 1) : p.x,
        y: view === "XZ" ? Math.min(Math.max(p.y + dir, 0), numY - 1) : p.y,
        z: view === "XY" ? Math.min(Math.max(p.z + dir, 0), numZ - 1) : p.z,
      }));
    }
  }, [zoomXY, zoomXZ, zoomYZ, panXY, panXZ, panYZ, setCoords, numX, numY, numZ, drawAll]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>, view: "XY" | "XZ" | "YZ") => {
    if (e.button === 2) { isPanningRef.current = view; lastMouse.current = { x: e.clientX, y: e.clientY }; }
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isPanningRef.current) return;
    const dx = e.clientX - lastMouse.current.x;
    const dy = e.clientY - lastMouse.current.y;
    lastMouse.current = { x: e.clientX, y: e.clientY };

    const pRef = { XY: panRefXY, XZ: panRefXZ, YZ: panRefYZ }[isPanningRef.current];
    const setPan = { XY: setPanXY, XZ: setPanXZ, YZ: setPanYZ }[isPanningRef.current];
    pRef.current = { x: pRef.current.x + dx, y: pRef.current.y + dy };
    setPan({ ...pRef.current });
    drawAll();
  }, [drawAll]);

  const handleMouseUp = useCallback(() => { isPanningRef.current = null; }, []);

  const handleMouseMoveColor = useCallback((e: React.MouseEvent<HTMLCanvasElement>, view: "XY" | "XZ" | "YZ") => {
    const ctx = { XY: canvasXY, XZ: canvasXZ, YZ: canvasYZ }[view].current?.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pan = { XY: panXY, XZ: panXZ, YZ: panYZ }[view];
    const zoom = { XY: zoomXY, XZ: zoomXZ, YZ: zoomYZ }[view];
    const coords = getScaledImageCoordinates(view, e.clientX - rect.left, e.clientY - rect.top, pan, zoom);
    
    try {
      const data = ctx.getImageData(Math.floor(coords.x), Math.floor(coords.y), 1, 1).data;
      setActivePixelColor({ view, color: `RGBA(${data[0]}, ${data[1]}, ${data[2]}, ${data[3]})` });
    } catch { setActivePixelColor({ view, color: "RGBA(0,0,0,0)" }); }
  }, [panXY, panXZ, panYZ, zoomXY, zoomXZ, zoomYZ, getScaledImageCoordinates]);

  const resetView = useCallback(() => {
    if (!loaded.current) return;
    setScaledDimensions(calculateOptimalScaling(dimensions));
    [setPanXY, setPanXZ, setPanYZ].forEach(fn => fn({ x: 0, y: 0 }));
    [setZoomXY, setZoomXZ, setZoomYZ].forEach(fn => fn(1));
    [panRefXY, panRefXZ, panRefYZ].forEach(r => r.current = { x: 0, y: 0 });
    [zoomRefXY, zoomRefXZ, zoomRefYZ].forEach(r => r.current = 1);
    setCoords({ x: Math.floor(numX / 2), y: Math.floor(numY / 2), z: Math.floor(numZ / 2) });
    setTimeout(drawAll, 0);
  }, [dimensions, calculateOptimalScaling, numX, numY, numZ, setCoords, drawAll]);

  return {
    canvasXY, canvasXZ, canvasYZ, dimensions, scaledDimensions,
    zoomXY, zoomXZ, zoomYZ, panXY, panXZ, panYZ,
    setPanXY, setPanXZ, setPanYZ, setZoomXY, setZoomXZ, setZoomYZ,
    handleClick, handleWheel, handleMouseDown, handleMouseMove, handleMouseUp,
    handleMouseMoveColor, handleContextMenu: (e: any) => e.preventDefault(),
    preloadImages, drawAll, activePixelColor, resetView
  };
}
