"use client";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import MeasureToggleButton from "./MeasureTool";
import LoadingOverlay from "./LoadingOverlay";
import AnnotationPanel from "./Annotation/AnnotationPanel";
import AnnotationTextBox from "./Annotation/AnnotationTextBox";
import AnnotationModal from "./Annotation/AnnotationModal";
import ViewControlPanel from "./Views/ViewControlPanel";
import useAnnotations from "./Annotation/useAnnotations";
import useCanvas from "./useCanvas";
import useMeasurements from "./useMeasurements";
import MediaControlPanel from "./MediaControlPanel";
import { ModalitySwitcher, type Modality } from "@/components/ModalitySwitcher";
import XYZControls from "./XYZControls";
import { MaskOpacityControl } from "./MaskOpacityControl";

const ORGAN_METADATA: Record<string, { color: string; label: string }> = {
  "0": { color: '#000000', label: 'Background' },
  "1": { color: '#ffffff', label: 'Alpha' },
  "2": { color: '#FF4136', label: 'Liver' },
  "3": { color: '#2ECC40', label: 'Lung' },
  "4": { color: '#FFDC00', label: 'Spleen' },
  "5": { color: '#B10DC9', label: 'Brain' },
  "6": { color: '#F012BE', label: 'Thymus' },
  "7": { color: '#FF851B', label: 'Heart' },
  "8": { color: '#7FDBFF', label: 'Stomach' },
  "9": { color: '#39CCCC', label: 'Left Kidney' },
  "10": { color: '#3D9970', label: 'Right Kidney' },
  "11": { color: '#0074D9', label: 'Bladder' },
  "12": { color: '#DDDDDD', label: 'Femur' },
  "13": { color: '#AAAAAA', label: 'Hip' },
  "14": { color: '#FFEEAD', label: 'Sternum' },
  "15": { color: '#D1D1D1', label: 'Tibia' },
  "16": { color: '#E0BBE4', label: 'Lymphnode Accessory Mandibular Left' },
  "17": { color: '#E0BBE4', label: 'Lymphnode Accessory Mandibular Right' },
  "18": { color: '#957DAD', label: 'Lymphnode Axillary Left' },
  "19": { color: '#957DAD', label: 'Lymphnode Axillary Right' },
  "20": { color: '#D291BC', label: 'Lymphnode Brachial Left' },
  "21": { color: '#D291BC', label: 'Lymphnode Brachial Right' },
  "22": { color: '#FEC8D8', label: 'Lymphnode Bronchial' },
  "23": { color: '#FFDFD3', label: 'Lymphnode Deep Cervical Left' },
  "24": { color: '#FFDFD3', label: 'Lymphnode Deep Cervical Right' },
  "25": { color: '#B57EDC', label: 'Lymphnode Iliac Right' },
  "26": { color: '#967BB6', label: 'Lymphnode Inguinal Left' },
  "27": { color: '#967BB6', label: 'Lymphnode Inguinal Right' },
  "28": { color: '#884DFF', label: 'Lymphnode Lumbar Left' },
  "29": { color: '#884DFF', label: 'Lymphnode Lumbar Right' },
  "30": { color: '#A020F0', label: 'Lymphnode Mandibular Left' },
  "31": { color: '#A020F0', label: 'Lymphnode Mandibular Right' },
  "32": { color: '#DA70D6', label: 'Lymphnode Mediastinal Left' },
  "33": { color: '#DA70D6', label: 'Lymphnode Mediastinal Right' },
  "34": { color: '#BA55D3', label: 'Lymphnode Mesentery' },
  "35": { color: '#9370DB', label: 'Lymphnode Parotid Left' },
  "36": { color: '#9370DB', label: 'Lymphnode Parotid Right' },
  "37": { color: '#8A2BE2', label: 'Lymphnode Popliteal Left' },
  "38": { color: '#8A2BE2', label: 'Lymphnode Popliteal Right' },
  "39": { color: '#9932CC', label: 'Lymphnode Sciatic Left' },
  "40": { color: '#9932CC', label: 'Lymphnode Sciatic Right' },
  "41": { color: '#666666', label: 'Tail' }
};

type Point = { x: number; y: number };
type MeasureData = {
  points: Point[];
  lines: { p1: Point; p2: Point; dist: number }[];
};

type ViewerProps = {
  brightfieldBlobUrl?: string;
  fluorescentBlobUrl?: string;
  datasetId: string;
  maskId?: string; 
  brightfieldNumZ?: number;
  brightfieldNumY?: number;
  brightfieldNumX?: number;
  fluorescentNumZ?: number;
  fluorescentNumY?: number;
  fluorescentNumX?: number;
  activeMasks?: Record<string, any>;
};

const MaskOverlay = ({ activeMasks, view, slice, currentNumZ, currentNumY, currentNumX, pan, zoom, globalOpacity }: any) => {
  // 1. Define activeEntries at the top level of the component
  const activeEntries = Object.entries(activeMasks || {}).filter(([_, val]) => val !== false);
  if (activeEntries.length === 0) return null;

  const maskCounts: Record<string, number> = { xy: 126, xz: 547, yz: 1144 };
  const tissueCounts: Record<string, number> = {
    xy: currentNumZ || 1,
    xz: currentNumY || 1,
    yz: currentNumX || 1
  };

  return (
    <>
      {activeEntries.map(([maskName, data]: [string, any]) => {
        // --- Variables must be defined INSIDE the map function ---
        const blobUrl = typeof data === 'string' ? data : data.blobUrl;
        
        const metaEntry = Object.values(ORGAN_METADATA).find(
          (m) => m.label.toLowerCase() === maskName.toLowerCase()
        );
        
        const organColor = data.color || metaEntry?.color || "#FF4136";
        if (!blobUrl) return null;

        const v = view.toLowerCase();
        const ratio = slice / tissueCounts[v];
        const mappedSlice = Math.floor(ratio * (maskCounts[v] - 1));
        const safeSlice = Math.max(0, Math.min(mappedSlice, maskCounts[v] - 1));
        const sliceStr = String(safeSlice).padStart(3, '0');
        
        // This defines finalUrl for use below
        const finalUrl = `${blobUrl}/${v}/${sliceStr}.png`;

        const isOutlineOnly = globalOpacity < 0.2;

        const maskStyle: any = {
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          zIndex: 20,
          backgroundColor: organColor, 
          WebkitMaskImage: `url(${finalUrl})`,
          maskImage: `url(${finalUrl})`,
          WebkitMaskSize: "100% 100%",
          WebkitMaskRepeat: "no-repeat",
          WebkitMaskMode: "luminance",
          maskMode: "luminance",
          
          // Use high base opacity to keep the drop-shadow visible
          opacity: Math.max(globalOpacity, 0.7), 
          
          // Edge detection logic: high contrast creates the "outline" feel
          filter: isOutlineOnly 
            ? `contrast(500%) brightness(50%) drop-shadow(0 0 1px ${organColor})` 
            : `opacity(${globalOpacity})`,
          
          mixBlendMode: "screen",
          pointerEvents: "none",
          transformOrigin: "0 0",
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transition: "filter 0.1s ease-out, opacity 0.1s ease-out",
        };

        return (
          <div key={maskName} className="absolute inset-0 pointer-events-none" style={maskStyle} />
        );
      })}
    </>
  );
};

export default function OrthographicViewer(props: ViewerProps) {
  const {
    brightfieldBlobUrl,
    fluorescentBlobUrl,
    datasetId,
    brightfieldNumZ,
    brightfieldNumY,
    brightfieldNumX,
    fluorescentNumZ,
    fluorescentNumY,
    fluorescentNumX,
    activeMasks = {},
  } = props;

  const hasBrightfield = Boolean(brightfieldBlobUrl && brightfieldNumZ);
  const hasFluorescent = Boolean(fluorescentBlobUrl && fluorescentNumZ);
  const defaultModality: Modality = hasBrightfield ? "brightfield" : "fluorescent";
  const [currentModality, setCurrentModality] = useState<Modality>(defaultModality);  
  const [maskOpacity, setMaskOpacity] = useState(0.5);

  const currentBlobUrl = currentModality === "brightfield" ? brightfieldBlobUrl : fluorescentBlobUrl;
  const currentNumZ = currentModality === "brightfield" ? brightfieldNumZ : fluorescentNumZ;
  const currentNumY = currentModality === "brightfield" ? brightfieldNumY : fluorescentNumY;
  const currentNumX = currentModality === "brightfield" ? brightfieldNumX : fluorescentNumX;

  const { theme } = useTheme();
  const { data: session } = useSession();
  const userEmail = session?.user?.email || null;

  const [coords, setCoords] = useState({
    x: Math.floor((currentNumX || 0) / 2),
    y: Math.floor((currentNumY || 0) / 2),
    z: Math.floor((currentNumZ || 0) / 2),
  });

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isMeasuring, setIsMeasuring] = useState(false);
  const [measureData, setMeasureData] = useState<{
    XY: MeasureData;
    XZ: MeasureData;
    YZ: MeasureData;
  }>({
    XY: { points: [], lines: [] },
    XZ: { points: [], lines: [] },
    YZ: { points: [], lines: [] },
  });

  const {
    setAnnotations,
    fetchAnnotations,
  } = useAnnotations(userEmail, setErrorMessage, datasetId);

  const {
    canvasXY,
    canvasXZ,
    canvasYZ,
    scaledDimensions,
    zoomXY,
    zoomXZ,
    zoomYZ,
    panXY,
    panXZ,
    panYZ,
    setPanXY,
    setPanXZ,
    setPanYZ,
    setZoomXY,
    setZoomXZ,
    setZoomYZ,
    handleClick,
    handleWheel,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleMouseMoveColor,
    handleContextMenu,
    preloadImages,
    drawAll,
    activePixelColor,
    resetView,
  } = useCanvas(
    theme,
    coords,
    measureData,
    setLoading,
    setErrorMessage,
    setCoords,
    currentBlobUrl || "",
    currentNumZ || 0,
    currentNumY || 0,
    currentNumX || 0
  );

  

  const { handleMeasureClick, handleToggleMeasure } = useMeasurements(
    {
      XY: canvasXY as React.RefObject<HTMLCanvasElement>,
      XZ: canvasXZ as React.RefObject<HTMLCanvasElement>,
      YZ: canvasYZ as React.RefObject<HTMLCanvasElement>,
    },
    { XY: panXY, XZ: panXZ, YZ: panYZ },
    { XY: zoomXY, XZ: zoomXZ, YZ: zoomYZ },
    drawAll,
    measureData,
    setMeasureData
  );

  useEffect(() => {
    if (session) fetchAnnotations();
    else setAnnotations([]);
  }, [session, fetchAnnotations, setAnnotations]);

  useEffect(() => { drawAll(); }, [drawAll, coords]);
  useEffect(() => { preloadImages(); }, [preloadImages]);

  useEffect(() => {
    setCoords({
      x: Math.floor((currentNumX || 0) / 2),
      y: Math.floor((currentNumY || 0) / 2),
      z: Math.floor((currentNumZ || 0) / 2),
    });
  }, [currentModality, currentNumX, currentNumY, currentNumZ]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>, view: "XY" | "XZ" | "YZ") => {
    if (isMeasuring) handleMeasureClick(e, view);
    else handleClick(e, view);
  };

  const handleSlider = (axis: "x" | "y" | "z", value: number) => {
    setCoords((prev) => ({ ...prev, [axis]: value }));
  };

  const handleToggleMeasureWrapper = () => {
    setIsMeasuring((prev) => {
      const newVal = !prev;
      handleToggleMeasure(newVal);
      return newVal;
    });
  };

  return Boolean(datasetId) ? (
    <div className="h-full w-full p-4 overflow-hidden relative bg-white dark:bg-black">
      {loading && <LoadingOverlay />}
      {errorMessage && (
        <div className="absolute top-12 left-12 bg-red-500/80 text-white px-4 py-2 rounded z-[1000]">
          {errorMessage}
        </div>
      )}
      
      <div className="flex flex-col h-[90%] gap-2 overflow-hidden">
        {/* XY View */}
        <div className="flex-1 flex justify-center items-center relative min-h-0 overflow-hidden bg-white dark:bg-black rounded-lg shadow-sm">
          <div className="relative" style={{ width: scaledDimensions.xy.width, height: scaledDimensions.xy.height }}>
            <canvas
              ref={canvasXY}
              width={scaledDimensions.xy.width}
              height={scaledDimensions.xy.height}
              onClick={(e) => handleCanvasClick(e, "XY")}
              onWheel={(e) => handleWheel(e, "XY")}
              onMouseDown={(e) => handleMouseDown(e, "XY")}
              onMouseMove={(e) => {
                handleMouseMove(e);
                handleMouseMoveColor(e, "XY");
              }}
              onMouseUp={handleMouseUp}
              onContextMenu={handleContextMenu}
              className="block max-w-full max-h-full relative z-[1]"
            />
            <MaskOverlay activeMasks={activeMasks} view="xy" slice={coords.z} currentNumZ={currentNumZ} pan={panXY} zoom={zoomXY} globalOpacity={maskOpacity}/>
          </div>
        </div>

        <div className="flex gap-2 h-1/3 min-h-0 overflow-hidden">
          {/* XZ View */}
          <div className="flex-1 flex justify-center items-center relative overflow-hidden bg-white dark:bg-black rounded-lg shadow-sm">
            <div className="relative" style={{ width: scaledDimensions.xz.width, height: scaledDimensions.xz.height }}>
              <canvas
                ref={canvasXZ}
                width={scaledDimensions.xz.width}
                height={scaledDimensions.xz.height}
                onClick={(e) => handleCanvasClick(e, "XZ")}
                onWheel={(e) => handleWheel(e, "XZ")}
                onMouseDown={(e) => handleMouseDown(e, "XZ")}
                onMouseMove={(e) => {
                  handleMouseMove(e);
                  handleMouseMoveColor(e, "XZ");
                }}
                onMouseUp={handleMouseUp}
                onContextMenu={handleContextMenu}
                className="block max-w-full max-h-full relative z-[1]"
              />
              <MaskOverlay activeMasks={activeMasks} view="xz" slice={coords.y} currentNumY={currentNumY} pan={panXZ} zoom={zoomXZ} globalOpacity={maskOpacity}/>
            </div>
          </div>

          {/* YZ View */}
          <div className="flex-1 flex justify-center items-center relative overflow-hidden bg-white dark:bg-black rounded-lg shadow-sm">
            <div className="relative" style={{ width: scaledDimensions.yz.width, height: scaledDimensions.yz.height }}>
              <canvas
                ref={canvasYZ}
                width={scaledDimensions.yz.width}
                height={scaledDimensions.yz.height}
                onClick={(e) => handleCanvasClick(e, "YZ")}
                onWheel={(e) => handleWheel(e, "YZ")}
                onMouseDown={(e) => handleMouseDown(e, "YZ")}
                onMouseMove={(e) => {
                  handleMouseMove(e);
                  handleMouseMoveColor(e, "YZ");
                }}
                onMouseUp={handleMouseUp}
                onContextMenu={handleContextMenu}
                className="block max-w-full max-h-full relative z-[1]"
              />
              <MaskOverlay activeMasks={activeMasks} view="yz" slice={coords.x} currentNumX={currentNumX} pan={panYZ} zoom={zoomYZ} globalOpacity={maskOpacity}/>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute top-4 right-4 text-black dark:text-white text-sm bg-white/95 dark:bg-black/95 px-3 py-2 rounded-md z-50">
        <div className="font-semibold mb-1">Canvas Scaling</div>
        <div>XY: {scaledDimensions.xy.scale.toFixed(3)}x</div>
        <div>XZ: {scaledDimensions.xz.scale.toFixed(3)}x</div>
        <div>YZ: {scaledDimensions.yz.scale.toFixed(3)}x</div>
        <button onClick={resetView} className="mt-2 px-2 py-1 bg-black hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-200 dark:text-black text-white text-xs rounded transition-colors">
          Reset View
        </button>
      </div>

      <MeasureToggleButton isMeasuring={isMeasuring} onToggle={handleToggleMeasureWrapper} />
      <XYZControls coords={coords} onChange={handleSlider} limits={{ x: (currentNumX || 1)-1, y: (currentNumY || 1)-1, z: (currentNumZ || 1)-1 }} onReset={resetView} />
      <ModalitySwitcher hasBrightfield={hasBrightfield} hasFluorescent={hasFluorescent} currentModality={currentModality} onModalityChange={setCurrentModality} className="absolute top-4 left-4 z-10" />
      {Object.values(activeMasks).some(v => v !== false) && (<MaskOpacityControl opacity={maskOpacity} onOpacityChange={setMaskOpacity} className="absolute top-28 left-4 z-10" />
  )}
      <ViewControlPanel coords={coords} zoom={{ XY: zoomXY, XZ: zoomXZ, YZ: zoomYZ }} pan={{ XY: panXY, XZ: panXZ, YZ: panYZ }} setCoords={setCoords} setZoom={(z) => { setZoomXY(z.XY); setZoomXZ(z.XZ); setZoomYZ(z.YZ); }} setPan={(p) => { setPanXY(p.XY); setPanXZ(p.XZ); setPanYZ(p.YZ); }} canvasXY={canvasXY as React.RefObject<HTMLCanvasElement>} canvasXZ={canvasXZ as React.RefObject<HTMLCanvasElement>} canvasYZ={canvasYZ as React.RefObject<HTMLCanvasElement>} setErrorMessage={setErrorMessage} datasetId={datasetId} />
      <MediaControlPanel datasetId={datasetId} setErrorMessage={setErrorMessage} />
    </div>
  ) : (
    <div className="h-full w-full p-4 flex items-center justify-center">
      <p className="text-red-500">Error: Please select a dataset to view.</p>
    </div>
  );
}
