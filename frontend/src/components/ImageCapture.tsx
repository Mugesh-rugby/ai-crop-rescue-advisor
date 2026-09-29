"use client";

import { useCallback, useRef, useState } from "react";
import Webcam from "react-webcam";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import { Camera, Upload, RotateCcw, Crop as CropIcon, Check } from "lucide-react";

interface Props {
  onImageReady: (blob: Blob, previewUrl: string) => void;
}

type Stage = "choose" | "camera" | "crop" | "done";

export default function ImageCapture({ onImageReady }: Props) {
  const [stage, setStage] = useState<Stage>("choose");
  const [rawImage, setRawImage] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const webcamRef = useRef<Webcam>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  function handleFile(file: File) {
    if (!["image/jpeg", "image/jpg", "image/png"].includes(file.type)) {
      alert("Please choose a JPG or PNG image.");
      return;
    }
    const url = URL.createObjectURL(file);
    setRawImage(url);
    setStage("crop");
  }

  function capturePhoto() {
    const shot = webcamRef.current?.getScreenshot();
    if (!shot) return;
    setRawImage(shot);
    setStage("crop");
  }

  async function confirmCrop() {
    if (!rawImage || !croppedAreaPixels) return;
    const blob = await getCroppedBlob(rawImage, croppedAreaPixels);
    const previewUrl = URL.createObjectURL(blob);
    onImageReady(blob, previewUrl);
    setStage("done");
  }

  function retake() {
    setRawImage(null);
    setStage("choose");
  }

  if (stage === "choose") {
    return (
      <div className="card">
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const file = e.dataTransfer.files[0];
            if (file) handleFile(file);
          }}
          className="flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed border-canopy-700 px-6 py-14 text-center"
        >
          <p className="text-sm text-canopy-300">Drag and drop a leaf photo here, or</p>
          <div className="flex gap-3">
            <button className="btn-primary" onClick={() => setStage("camera")}>
              <Camera className="h-4 w-4" /> Use camera
            </button>
            <button className="btn-secondary" onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-4 w-4" /> Upload photo
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
        </div>
      </div>
    );
  }

  if (stage === "camera") {
    return (
      <div className="card">
        <Webcam
          ref={webcamRef}
          audio={false}
          screenshotFormat="image/jpeg"
          videoConstraints={{ facingMode: "environment" }}
          className="w-full rounded-lg"
        />
        <div className="mt-4 flex justify-center gap-3">
          <button className="btn-secondary" onClick={() => setStage("choose")}>Cancel</button>
          <button className="btn-primary" onClick={capturePhoto}>
            <Camera className="h-4 w-4" /> Capture
          </button>
        </div>
      </div>
    );
  }

  if (stage === "crop" && rawImage) {
    return (
      <div className="card">
        <div className="relative h-80 w-full overflow-hidden rounded-lg bg-black">
          <Cropper
            image={rawImage}
            crop={crop}
            zoom={zoom}
            aspect={1}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>
        <input
          type="range"
          min={1}
          max={3}
          step={0.1}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          className="mt-4 w-full"
          aria-label="Zoom"
        />
        <div className="mt-2 flex justify-center gap-3">
          <button className="btn-secondary" onClick={retake}>
            <RotateCcw className="h-4 w-4" /> Retake
          </button>
          <button className="btn-primary" onClick={confirmCrop}>
            <CropIcon className="h-4 w-4" /> Use this crop
          </button>
        </div>
      </div>
    );
  }

  if (stage === "done") {
    return (
      <div className="card flex items-center gap-3 text-canopy-200">
        <Check className="h-5 w-5 text-canopy-400" /> Image ready — analyzing below.
        <button className="btn-secondary ml-auto !px-4 !py-2 text-xs" onClick={retake}>
          Retake
        </button>
      </div>
    );
  }

  return null;
}

async function getCroppedBlob(imageSrc: string, area: Area): Promise<Blob> {
  const image = await loadImage(imageSrc);
  const canvas = document.createElement("canvas");
  canvas.width = area.width;
  canvas.height = area.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas context unavailable");
  ctx.drawImage(image, area.x, area.y, area.width, area.height, 0, 0, area.width, area.height);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Crop failed"))), "image/jpeg", 0.92);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
