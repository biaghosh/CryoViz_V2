"use client";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { Download, List, Eye, Save } from "lucide-react";
import SavedViewsModal from "./SavedViewsModal";



interface ViewControlPanelProps {
  coords: { x: number; y: number; z: number };
  zoom: { XY: number; XZ: number; YZ: number };
  pan: {
    XY: { x: number; y: number };
    XZ: { x: number; y: number };
    YZ: { x: number; y: number };
  };
  setCoords: (coords: { x: number; y: number; z: number }) => void;
  setZoom: (zoom: { XY: number; XZ: number; YZ: number }) => void;
  setPan: (pan: {
    XY: { x: number; y: number };
    XZ: { x: number; y: number };
    YZ: { x: number; y: number };
  }) => void;
  canvasXY: React.RefObject<HTMLCanvasElement>;
  canvasXZ: React.RefObject<HTMLCanvasElement>;
  canvasYZ: React.RefObject<HTMLCanvasElement>;
  setErrorMessage: (message: string | null) => void;
  datasetId: string;
}

export default function ViewControlPanel({
  coords,
  zoom,
  pan,
  setCoords,
  setZoom,
  setPan,
  canvasXY,
  canvasXZ,
  canvasYZ,
  setErrorMessage,
  datasetId,
}: ViewControlPanelProps) {
  const { data: session } = useSession();
  const userEmail = session?.user?.email || null;
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isListModalOpen, setIsListModalOpen] = useState(false);
  const [showSaveViewSection, setShowSaveViewSection] = useState(false);

  const downloadViews = () => {
    const canvases = [
      { canvas: canvasXY, name: `XY_slice_${coords.z}.png` },
      { canvas: canvasXZ, name: `XZ_slice_${coords.y}.png` },
      { canvas: canvasYZ, name: `YZ_slice_${coords.x}.png` },
    ];

    canvases.forEach(({ canvas, name }) => {
      const canvasEl = canvas.current;
      if (!canvasEl) return;
      const dataUrl = canvasEl.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = name;
      link.click();
      link.remove();
    });
    setIsDropdownOpen(false);
  };

  return (
    <>
      <div style={{ position: "absolute", bottom: 160, left: 10, zIndex: 10 }}>
        <button
          onClick={() => setIsDropdownOpen((prev) => !prev)}
          className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-blue-600 dark:hover:bg-red-400 dark:hover:text-white hover:text-white transition-colors group"
          title="View Controls"
        >
          <div className="relative">
            <Eye className="w-5 h-5 transition-transform duration-200 transform group-hover:scale-110 group-hover:-rotate-x-10 group-hover:-rotate-y-10" />
          </div>
        </button>
        {isDropdownOpen && (
          <div
            className="bg-white dark:bg-gray-800 shadow-lg rounded-md py-2 w-48 z-[1000]"
            style={{
              position: "absolute",
              bottom: 40,
              left: 40,
              fontSize: "0.85rem",
            }}
          >
            <ul className="text-sm text-gray-700 dark:text-gray-200">
              <li>
                <button
                  onClick={() => {
                    setIsListModalOpen(true);
                    setShowSaveViewSection(true);
                    setIsDropdownOpen(false);
                  }}
                  className="flex items-center w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 group"
                  title="Save current view"
                >
                  <div className="relative mr-2">
                    <Save className="w-4 h-4 transition-transform duration-200 transform group-hover:scale-110 group-hover:-rotate-x-10 group-hover:-rotate-y-10" />
                  </div>
                  Save View
                </button>
              </li>
              <li>
                <button
                  onClick={downloadViews}
                  className="flex items-center w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 group"
                  title="Download current views as PNG"
                >
                  <div className="relative mr-2">
                    <Download className="w-4 h-4 transition-transform duration-200 transform group-hover:scale-110 group-hover:-rotate-x-10 group-hover:-rotate-y-10" />
                  </div>
                  Download View
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    setIsListModalOpen(true);
                    setShowSaveViewSection(false);
                    setIsDropdownOpen(false);
                  }}
                  className="flex items-center w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 group"
                  title="List saved views"
                >
                  <div className="relative mr-2">
                    <List className="w-4 h-4 transition-transform duration-200 transform group-hover:scale-110 group-hover:-rotate-x-10 group-hover:-rotate-y-10" />
                  </div>
                  List Views
                </button>
              </li>
            </ul>
          </div>
        )}
      </div>
      <SavedViewsModal
        isOpen={isListModalOpen}
        onClose={() => {
          setIsListModalOpen(false);
          setShowSaveViewSection(false);
        }}
        userEmail={userEmail}
        datasetId={datasetId}
        setErrorMessage={setErrorMessage}
        setCoords={setCoords}
        setZoom={setZoom}
        setPan={setPan}
        coords={coords}
        zoom={zoom}
        pan={pan}
        showSaveViewSection={showSaveViewSection}
        setShowSaveViewSection={setShowSaveViewSection}
      />
    </>
  );
}