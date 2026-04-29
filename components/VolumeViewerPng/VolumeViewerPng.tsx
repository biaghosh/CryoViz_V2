"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import "@kitware/vtk.js/Rendering/Profiles/Volume";
import vtkFullScreenRenderWindow from "@kitware/vtk.js/Rendering/Misc/FullScreenRenderWindow";
import vtkVolume from "@kitware/vtk.js/Rendering/Core/Volume";
import vtkVolumeMapper from "@kitware/vtk.js/Rendering/Core/VolumeMapper";
import vtkImageData from "@kitware/vtk.js/Common/DataModel/ImageData";
import vtkPiecewiseFunction from "@kitware/vtk.js/Common/DataModel/PiecewiseFunction";
import vtkColorTransferFunction from "@kitware/vtk.js/Rendering/Core/ColorTransferFunction";
import vtkDataArray from "@kitware/vtk.js/Common/Core/DataArray";
import vtkPlane from "@kitware/vtk.js/Common/DataModel/Plane";
import { BlendMode } from "@kitware/vtk.js/Rendering/Core/VolumeMapper/Constants";

import ClippingControls from "./ClippingControls";
import RenderQualitySlider from "./RenderQualitySlider";
import ViewControls from "./ViewControls";
import OpacitySlider from "./OpacitySlider";
import ShaderSelector from "./ShaderSelector";
import SpacingControl from "./SpacingControl";
import vtkRenderWindow from "@kitware/vtk.js/Rendering/Core/RenderWindow";

import { ModalitySwitcher, type Modality } from "@/components/ModalitySwitcher";
import { getGPUInfo } from "@/lib/analytics";
import posthog from "posthog-js";

// --------------- Helpers ---------------

/** Load images in batches to avoid overwhelming the browser/network */
async function loadImagesInBatches(
  urls: string[],
  batchSize = 20
): Promise<ImageData[]> {
  const results: ImageData[] = new Array(urls.length);

  for (let i = 0; i < urls.length; i += batchSize) {
    const batch = urls.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(
        (url) =>
          new Promise<ImageData>((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.src = url;
            img.onload = () => {
              const canvas = document.createElement("canvas");
              canvas.width = img.width;
              canvas.height = img.height;
              const ctx = canvas.getContext("2d")!;
              ctx.drawImage(img, 0, 0);
              resolve(ctx.getImageData(0, 0, img.width, img.height));
            };
            img.onerror = reject;
          })
      )
    );
    for (let j = 0; j < batchResults.length; j++) {
      results[i + j] = batchResults[j];
    }
  }
  return results;
}

/** Compute the tight bounding box of non-transparent pixels across all slices */
function computeBounds(slices: ImageData[]) {
  let xMin = Infinity,
    xMax = -1,
    yMin = Infinity,
    yMax = -1;
  for (const slice of slices) {
    const { width, height, data } = slice;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (data[(y * width + x) * 4 + 3] > 10) {
          if (x < xMin) xMin = x;
          if (x > xMax) xMax = x;
          if (y < yMin) yMin = y;
          if (y > yMax) yMax = y;
        }
      }
    }
  }
  return { xMin, xMax, yMin, yMax };
}

/** Assemble a cropped RGBA volume from slices — uses direct byte copy (no .slice()) */
function assembleVolume(
  slices: ImageData[],
  xMin: number,
  yMin: number,
  width: number,
  height: number
) {
  const depth = slices.length;
  const volumeData = new Uint8Array(width * height * depth * 4);

  for (let z = 0; z < depth; z++) {
    const full = slices[z].data;
    const srcW = slices[z].width;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const srcIdx = ((y + yMin) * srcW + (x + xMin)) * 4;
        const dstIdx = (z * width * height + y * width + x) * 4;
        volumeData[dstIdx] = full[srcIdx];
        volumeData[dstIdx + 1] = full[srcIdx + 1];
        volumeData[dstIdx + 2] = full[srcIdx + 2];
        volumeData[dstIdx + 3] = full[srcIdx + 3];
      }
    }
  }
  return volumeData;
}

/** Downsample an RGBA volume by a given factor on each axis.
 *  E.g. factor=4 turns 600×600×527 → 150×150×132 (64× fewer voxels). */
function downsampleVolume(
  data: Uint8Array,
  width: number,
  height: number,
  depth: number,
  factor: number
): { data: Uint8Array; width: number; height: number; depth: number } {
  const nw = Math.ceil(width / factor);
  const nh = Math.ceil(height / factor);
  const nd = Math.ceil(depth / factor);
  const out = new Uint8Array(nw * nh * nd * 4);

  for (let z = 0; z < nd; z++) {
    const sz = Math.min(z * factor, depth - 1);
    for (let y = 0; y < nh; y++) {
      const sy = Math.min(y * factor, height - 1);
      for (let x = 0; x < nw; x++) {
        const sx = Math.min(x * factor, width - 1);
        const srcIdx = (sz * width * height + sy * width + sx) * 4;
        const dstIdx = (z * nw * nh + y * nw + x) * 4;
        out[dstIdx] = data[srcIdx];
        out[dstIdx + 1] = data[srcIdx + 1];
        out[dstIdx + 2] = data[srcIdx + 2];
        out[dstIdx + 3] = data[srcIdx + 3];
      }
    }
  }
  return { data: out, width: nw, height: nh, depth: nd };
}


// --------------- Component ---------------

const VolumeViewerPng: React.FC<{
  brightfieldBlobUrl?: string;
  fluorescentBlobUrl?: string;
  brightfieldNumZ?: number;
  fluorescentNumZ?: number;
  datasetId: string;
  spacing?: number;
  activeMasks?: Record<string, boolean>;
}> = ({
  brightfieldBlobUrl,
  fluorescentBlobUrl,
  brightfieldNumZ,
  fluorescentNumZ,
  spacing: initialSpacing = 3,
  datasetId,
  activeMasks = {},
}) => {
  // Determine available modalities
  const hasBrightfield = Boolean(brightfieldBlobUrl && brightfieldNumZ);
  const hasFluorescent = Boolean(fluorescentBlobUrl && fluorescentNumZ);

  // Set default modality to the first available one
  const defaultModality: Modality = hasBrightfield ? "brightfield" : "fluorescent";
  const [currentModality, setCurrentModality] = useState<Modality>(defaultModality);

  // Get current modality data
  const currentBlobUrl = currentModality === "brightfield" ? brightfieldBlobUrl : fluorescentBlobUrl;
  const currentNumZ = currentModality === "brightfield" ? brightfieldNumZ : fluorescentNumZ;

  const containerRef = useRef<HTMLDivElement>(null);
  const [clip, setClip] = useState({ x: 0, y: 0, z: 0 });
  const [quality, setQuality] = useState(1.5);
  const [opacityLevel, setOpacityLevel] = useState(0.05);
  const [volumeDims, setVolumeDims] = useState({ x: 600, y: 600, z: 527 });
  const [viewOrientation, setViewOrientation] = useState<string>("");
  const [blendMode, setBlendMode] = useState<string>("composite");
  const [loading, setLoading] = useState(true);
  const [spacing, setSpacing] = useState(initialSpacing);

  const clipPlanes = useRef({
    planeX: vtkPlane.newInstance({ normal: [1, 0, 0], origin: [0, 0, 0] }),
    planeY: vtkPlane.newInstance({ normal: [0, 1, 0], origin: [0, 0, 0] }),
    planeZ: vtkPlane.newInstance({ normal: [0, 0, 1], origin: [0, 0, 0] }),
  });

  // Persistent VTK refs — survive across slider changes
  const renderWindowRef = useRef<vtkFullScreenRenderWindow | null>(null);
  const mapperRef = useRef<vtkVolumeMapper | null>(null);
  const opacityRef = useRef<vtkPiecewiseFunction | null>(null);
  const imageDataRef = useRef<vtkImageData | null>(null);
  const lowResImageDataRef = useRef<vtkImageData | null>(null);
  const rafIdRef = useRef<number>(0);

  /** Coalesce multiple render requests into one requestAnimationFrame callback.
   *  This yields the main thread back to the browser between frames so INP stays low. */
  const scheduleRender = useCallback(() => {
    cancelAnimationFrame(rafIdRef.current);
    rafIdRef.current = requestAnimationFrame(() => {
      renderWindowRef.current?.getRenderWindow().render();
    });
  }, []);

  // ──────────────────────────────────────────────
  // EFFECT 1: Load data ONLY when modality/URL changes
  // ──────────────────────────────────────────────
  useEffect(() => {
    if (!currentBlobUrl || !currentNumZ || currentNumZ <= 0) return;

    const sliceCount = currentNumZ;
    const urls = Array.from({ length: sliceCount }, (_, i) =>
      `${currentBlobUrl}/xy/${String(i).padStart(3, "0")}.png`
    );

    let cancelled = false;

    const loadStackAndRender = async () => {
      setLoading(true);
      const startTime = performance.now();

      // Batch-load images (20 at a time instead of all at once)
      const slices = await loadImagesInBatches(urls, 20);
      if (cancelled) return;

      // Compute tight bounding box
      const { xMin, xMax, yMin, yMax } = computeBounds(slices);
      const width = xMax - xMin + 1;
      const height = yMax - yMin + 1;
      const depth = sliceCount;

      setVolumeDims({ x: width, y: height, z: depth });

      // Assemble volume with direct byte copy
      const volumeData = assembleVolume(slices, xMin, yMin, width, height);

      // Build VTK pipeline
      const imageData = vtkImageData.newInstance();
      imageData.setDimensions([width, height, depth]);
      imageData.setSpacing([1, 1, spacing]);

      const scalars = vtkDataArray.newInstance({
        name: "ImageScalars",
        numberOfComponents: 4,
        values: volumeData,
      });
      imageData.getPointData().setScalars(scalars);
      imageDataRef.current = imageData;

      // Build a 4× downsampled volume for interactive rendering
      const DOWNSAMPLE_FACTOR = 8;
      const lowRes = downsampleVolume(volumeData, width, height, depth, DOWNSAMPLE_FACTOR);
      const lowResImageData = vtkImageData.newInstance();
      lowResImageData.setDimensions([lowRes.width, lowRes.height, lowRes.depth]);
      lowResImageData.setSpacing([DOWNSAMPLE_FACTOR, DOWNSAMPLE_FACTOR, spacing * DOWNSAMPLE_FACTOR]);
      const lowResScalars = vtkDataArray.newInstance({
        name: "ImageScalars",
        numberOfComponents: 4,
        values: lowRes.data,
      });
      lowResImageData.getPointData().setScalars(lowResScalars);
      lowResImageDataRef.current = lowResImageData;

      const mapper = vtkVolumeMapper.newInstance();
      mapper.setInputData(imageData);
      mapper.setSampleDistance(quality);
      mapper.setMaximumSamplesPerRay(400);

      // KEY PERF: Auto-adjust sample distances during interaction
      // VTK will reduce sampling quality while dragging/rotating,
      // then render at full quality when idle. This is the #1 fix for INP.
      mapper.setAutoAdjustSampleDistances(true);

      // Set a higher image sample distance (renders at lower resolution
      // internally, then upscales — big GPU savings)
      mapper.setImageSampleDistance(1.5);

      mapper.addClippingPlane(clipPlanes.current.planeX);
      mapper.addClippingPlane(clipPlanes.current.planeY);
      mapper.addClippingPlane(clipPlanes.current.planeZ);

      // Apply current blend mode
      switch (blendMode) {
        case "mip":
          mapper.setBlendMode(BlendMode.MAXIMUM_INTENSITY_BLEND);
          break;
        case "composite":
        default:
          mapper.setBlendMode(BlendMode.COMPOSITE_BLEND);
      }
      mapperRef.current = mapper;

      const volume = vtkVolume.newInstance();
      volume.setMapper(mapper);

      const opacity = vtkPiecewiseFunction.newInstance();
      opacity.addPoint(0, 0.0);
      opacity.addPoint(100, opacityLevel);
      opacity.addPoint(255, 1.0);
      opacityRef.current = opacity;

      const color = vtkColorTransferFunction.newInstance();
      color.addRGBPoint(0, 0.0, 0.0, 0.0);
      color.addRGBPoint(100, 0.8, 0.2, 0.2);
      color.addRGBPoint(255, 1.0, 1.0, 1.0);

      const property = volume.getProperty();
      property.setIndependentComponents(false);
      property.setRGBTransferFunction(0, color);
      property.setScalarOpacity(0, opacity);
      property.setInterpolationTypeToLinear();
      property.setShade(true);
      property.setAmbient(0.3);
      property.setDiffuse(0.6);
      property.setSpecular(0.2);
      property.setSpecularPower(10);

      // Teardown previous renderer
      if (renderWindowRef.current) {
        renderWindowRef.current.delete();
      }
      containerRef.current!.innerHTML = "";

      const fullScreenRenderer = vtkFullScreenRenderWindow.newInstance({
        container: containerRef.current!,
        background: [1, 1, 1],
        containerStyle: {
          width: "100%",
          height: "100%",
          position: "relative",
          top: 0,
          left: 0,
          overflow: "hidden",
        },
      });

      const renderer = fullScreenRenderer.getRenderer();
      const renderWindow = fullScreenRenderer.getRenderWindow() as vtkRenderWindow;

      renderer.addVolume(volume);
      renderer.resetCamera();
      renderWindow.render();
      renderWindowRef.current = fullScreenRenderer;

      // Swap to low-res volume during interaction, high-res when idle.
      // Low-res has ~512× fewer voxels → renders in ~5ms vs ~1000ms.
      const container = containerRef.current!;
      const onPointerDown = () => {
        if (mapperRef.current && lowResImageDataRef.current) {
          mapperRef.current.setInputData(lowResImageDataRef.current);
          mapperRef.current.setSampleDistance(2.0);
          mapperRef.current.setMaximumSamplesPerRay(200);
        }
      };
      const onPointerUp = () => {
        // CRITICAL: Defer the expensive high-res render so the browser
        // can paint the pointerup visual feedback first.
        // Without this, the synchronous render() blocks INP for ~1200ms.
        setTimeout(() => {
          if (mapperRef.current && imageDataRef.current) {
            mapperRef.current.setInputData(imageDataRef.current);
            mapperRef.current.setSampleDistance(quality);
            mapperRef.current.setMaximumSamplesPerRay(400);
            renderWindowRef.current?.getRenderWindow().render();
          }
        }, 50);
      };
      // Use capture to fire BEFORE VTK's internal handlers
      container.addEventListener("pointerdown", onPointerDown, { capture: true });
      container.addEventListener("pointerup", onPointerUp);
      container.addEventListener("pointerleave", onPointerUp);

      setLoading(false);

      const endTime = performance.now();
      posthog.capture("dataset_loaded", {
        datasetId,
        modality: currentModality,
        slices: sliceCount,
        spacing,
        gpu: getGPUInfo(),
        quality,
        loadTimeMs: Math.round(endTime - startTime),
      });
    };

    loadStackAndRender();

    return () => {
      cancelled = true;
    };
    // Only re-run when the actual data source changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentBlobUrl, currentNumZ, currentModality]);

  // ──────────────────────────────────────────────
  // EFFECT 2: Update sample distance (quality) WITHOUT reloading data
  // ──────────────────────────────────────────────
  useEffect(() => {
    if (!mapperRef.current || !renderWindowRef.current) return;
    mapperRef.current.setSampleDistance(quality);
    scheduleRender();
  }, [quality, scheduleRender]);

  // ──────────────────────────────────────────────
  // EFFECT 3: Update opacity WITHOUT reloading data
  // ──────────────────────────────────────────────
  useEffect(() => {
    if (!opacityRef.current || !renderWindowRef.current) return;
    opacityRef.current.removeAllPoints();
    opacityRef.current.addPoint(0, 0.0);
    opacityRef.current.addPoint(100, opacityLevel);
    opacityRef.current.addPoint(255, 1.0);
    scheduleRender();
  }, [opacityLevel, scheduleRender]);

  // ──────────────────────────────────────────────
  // EFFECT 4: Update blend mode WITHOUT reloading data
  // ──────────────────────────────────────────────
  useEffect(() => {
    if (!mapperRef.current || !renderWindowRef.current) return;
    switch (blendMode) {
      case "mip":
        mapperRef.current.setBlendMode(BlendMode.MAXIMUM_INTENSITY_BLEND);
        break;
      case "composite":
      default:
        mapperRef.current.setBlendMode(BlendMode.COMPOSITE_BLEND);
    }
    scheduleRender();
  }, [blendMode, scheduleRender]);

  // ──────────────────────────────────────────────
  // EFFECT 5: Update spacing WITHOUT reloading data
  // ──────────────────────────────────────────────
  useEffect(() => {
    if (!imageDataRef.current || !renderWindowRef.current) return;
    imageDataRef.current.setSpacing([1, 1, spacing]);
    imageDataRef.current.modified();
    const renderer = renderWindowRef.current.getRenderer();
    renderer.resetCamera();
    scheduleRender();
  }, [spacing, scheduleRender]);

  // ──────────────────────────────────────────────
  // EFFECT 6: Clipping planes
  // ──────────────────────────────────────────────
  useEffect(() => {
    const { x, y, z } = clip;
    clipPlanes.current.planeX.setOrigin([x, 0, 0]);
    clipPlanes.current.planeY.setOrigin([0, y, 0]);
    clipPlanes.current.planeZ.setOrigin([0, 0, z]);
    scheduleRender();
  }, [clip, scheduleRender]);

  // ──────────────────────────────────────────────
  // EFFECT 7: View orientation
  // ──────────────────────────────────────────────
  useEffect(() => {
    if (!renderWindowRef.current || !viewOrientation) return;

    const renderer = renderWindowRef.current.getRenderer();
    const camera = renderer.getActiveCamera();
    const bounds = renderer.computeVisiblePropBounds();
    const center = [
      (bounds[0] + bounds[1]) / 2,
      (bounds[2] + bounds[3]) / 2,
      (bounds[4] + bounds[5]) / 2,
    ];

    switch (viewOrientation) {
      case "front":
        camera.setPosition(center[0], center[1], center[2] + 2800);
        camera.setViewUp([0, 1, 0]);
        break;
      case "back":
        camera.setPosition(center[0], center[1], center[2] - 2800);
        camera.setViewUp([0, 1, 0]);
        break;
      case "top":
        camera.setPosition(center[0], center[1] + 2800, center[2]);
        camera.setViewUp([0, 0, -1]);
        break;
      case "bottom":
        camera.setPosition(center[0], center[1] - 2800, center[2]);
        camera.setViewUp([0, 0, 1]);
        break;
      case "left":
        camera.setPosition(center[0] - 2800, center[1], center[2]);
        camera.setViewUp([0, 1, 0]);
        break;
      case "right":
        camera.setPosition(center[0] + 2300, center[1], center[2]);
        camera.setViewUp([0, 1, 0]);
        break;
    }

    camera.setFocalPoint(center[0], center[1], center[2]);
    renderer.resetCameraClippingRange();
    scheduleRender();
  }, [viewOrientation, scheduleRender]);

  // ──────────────────────────────────────────────
  // Actions
  // ──────────────────────────────────────────────
  const handleAutoFocus = useCallback(() => {
    if (!renderWindowRef.current) return;

    const renderer = renderWindowRef.current.getRenderer();
    const camera = renderer.getActiveCamera();
    const actors = renderer.getVolumes();

    if (!actors.length) return;

    const bounds = actors[0].getBounds();
    const center = [
      (bounds[0] + bounds[1]) / 2,
      (bounds[2] + bounds[3]) / 2,
      (bounds[4] + bounds[5]) / 2,
    ];

    const maxDim = Math.max(
      bounds[1] - bounds[0],
      bounds[3] - bounds[2],
      bounds[5] - bounds[4]
    );

    camera.setFocalPoint(center[0], center[1], center[2]);
    camera.setPosition(center[0], center[1], center[2] + maxDim * 2);
    camera.setViewUp([0, 1, 0]);

    renderer.resetCameraClippingRange();
    scheduleRender();
  }, [scheduleRender]);

  const handleSpacingChange = useCallback((newSpacing: number) => {
    setSpacing(newSpacing);
  }, []);

  const handleSpacingReset = useCallback(() => {
    setSpacing(initialSpacing);
  }, [initialSpacing]);

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "87vh",
        overflow: "hidden",
      }}
    >
      {/* Floating Controls */}

      {/* Render + Shader + Opacity + Spacing - Top Left */}
      <div
        style={{
          position: "absolute",
          top: 10,
          left: 10,
          background: "rgba(0,0,0,0.7)",
          borderRadius: 8,
          padding: 10,
          zIndex: 20,
          minHeight: "fit-content",
        }}
      >
        <RenderQualitySlider quality={quality} setQuality={setQuality} />
        <OpacitySlider
          opacityLevel={opacityLevel}
          setOpacityLevel={setOpacityLevel}
        />
        <ShaderSelector blendMode={blendMode} setBlendMode={setBlendMode} />

        {/* Separator */}
        <div className="w-full h-px bg-white/20 my-3"></div>

        <SpacingControl
          spacing={spacing}
          onSpacingChange={handleSpacingChange}
          onReset={handleSpacingReset}
          datasetId={datasetId}
          isLoading={loading}
        />
      </div>

      {/* Clipping - Bottom Left */}
      <div
        style={{
          position: "absolute",
          bottom: 10,
          left: 10,
          background: "rgba(0,0,0,0.7)",
          borderRadius: 8,
          padding: 10,
          zIndex: 20,
          color: "white",
          fontSize: "14px",
          width: "240px",
          backdropFilter: "blur(4px)",
          boxShadow: "0 0 10px rgba(0,0,0,0.4)",
        }}
      >
        <ClippingControls clip={clip} setClip={setClip} max={volumeDims} />
      </div>

      {/* View Controls - Bottom Right */}
      <div
        style={{
          position: "absolute",
          bottom: 10,
          right: 10,
          background: "rgba(0,0,0,0.7)",
          borderRadius: 8,
          padding: 10,
          zIndex: 20,
        }}
      >
        <ViewControls
          setViewOrientation={setViewOrientation}
          handleAutoFocus={handleAutoFocus}
        />
      </div>

      {/* Loading Overlay */}
      {loading && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: "rgba(0, 0, 0, 0.6)",
            backdropFilter: "blur(6px)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
            animation: "fadeIn 0.4s ease-in-out",
          }}
        >
          {/* Pulse + Spinner + BIV */}
          <div style={{ position: "relative", width: "80px", height: "80px" }}>
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "80px",
                height: "80px",
                borderRadius: "50%",
                border: "5px solid #4caf50",
                borderTop: "5px solid transparent",
                animation: "spin 1.2s linear infinite",
              }}
            />
            <div
              style={{
                position: "absolute",
                top: "20px",
                left: "20px",
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                backgroundColor: "#4caf50",
                opacity: 0.3,
                animation: "pulse 1.6s ease-in-out infinite",
              }}
            />
            <div
              style={{
                position: "absolute",
                top: "22px",
                left: "22px",
                width: "36px",
                height: "36px",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                fontSize: "0.85rem",
                fontWeight: 600,
                color: "#ffffff",
                opacity: 0.7,
                fontFamily: "Trajan, serif",
                letterSpacing: "1px",
              }}
            >
              BIV
            </div>
          </div>

          {/* Status Text */}
          <div
            style={{
              color: "#e0e0e0",
              fontSize: "1rem",
              marginTop: "1.25rem",
              fontWeight: 400,
              opacity: 0.85,
              letterSpacing: "0.5px",
            }}
          >
            Initializing Volume Viewer...
          </div>

          {/* CSS Animations */}
          <style>
            {`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.3; }
          50% { transform: scale(1.4); opacity: 0.6; }
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}
          </style>
        </div>
      )}

      {/* Modality Switcher */}
      <ModalitySwitcher
        hasBrightfield={hasBrightfield}
        hasFluorescent={hasFluorescent}
        currentModality={currentModality}
        onModalityChange={setCurrentModality}
        className="absolute top-4 right-4 z-50"
      />

      {/* VTK Canvas */}
      <div
        ref={containerRef}
        style={{
          width: "100%",
          height: "100vh",
          position: "absolute",
          top: 0,
          left: 0,
          overflow: "hidden",
        }}
      ></div>
    </div>
  );
};

export default VolumeViewerPng;
