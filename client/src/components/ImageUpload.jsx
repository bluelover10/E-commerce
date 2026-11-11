import { useState, useRef } from "react";
import api from "../services/api";

const MAX_SIZE_MB = 5;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/gif"];

function ImageUpload({
  type = "products",
  onUploadSuccess,
  currentImage = null,
  onRemove,
  variant = "default",
  autoUpload = true,
}) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef(null);

  const isAdmin = variant === "admin";
  const displayPreview = preview || currentImage;

  const validateFile = (selectedFile) => {
    if (!ACCEPTED.includes(selectedFile.type)) {
      return "Use JPEG, PNG, WebP, or GIF";
    }
    if (selectedFile.size > MAX_SIZE_MB * 1024 * 1024) {
      return `File must be under ${MAX_SIZE_MB}MB`;
    }
    return null;
  };

  const uploadFile = async (selectedFile) => {
    const validationError = validateFile(selectedFile);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setFile(selectedFile);

    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result);
    reader.readAsDataURL(selectedFile);

    const formData = new FormData();
    formData.append("image", selectedFile);

    const endpoint =
      type === "products" ? "/images/upload/product" : "/images/upload/profile";

    try {
      setUploading(true);
      const response = await api.post(endpoint, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (response.data.success) {
        setFile(null);
        onUploadSuccess?.(response.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Upload failed");
      setPreview(null);
      setFile(null);
    } finally {
      setUploading(false);
    }
  };

  const handleFiles = (files) => {
    const selectedFile = files?.[0];
    if (!selectedFile) return;
    if (autoUpload) {
      uploadFile(selectedFile);
    } else {
      const validationError = validateFile(selectedFile);
      if (validationError) {
        setError(validationError);
        return;
      }
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result);
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (uploading) return;
    handleFiles(e.dataTransfer.files);
  };

  const handleManualUpload = () => {
    if (file) uploadFile(file);
  };

  const borderBase = isAdmin
    ? "border-[var(--dash-border)] bg-[var(--dash-surface-2)]"
    : "border-gray-300 bg-gray-50";
  const borderActive = isAdmin
    ? "border-indigo-400 bg-indigo-500/10"
    : "border-blue-500 bg-blue-50";
  const textMuted = isAdmin ? "text-[var(--dash-muted)]" : "text-gray-500";
  const textMain = isAdmin ? "text-[var(--dash-text)]" : "text-gray-800";

  return (
    <div className="w-full">
      <p className={`mb-2 text-sm font-medium ${textMain}`}>Product image</p>

      {displayPreview && (
        <div className="relative mb-3 overflow-hidden rounded-xl">
          <img
            src={displayPreview}
            alt="Preview"
            className="h-48 w-full object-cover"
          />
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <span className="text-sm font-medium text-white">Uploading…</span>
            </div>
          )}
          {onRemove && currentImage && !uploading && (
            <button
              type="button"
              onClick={() => {
                setPreview(null);
                setFile(null);
                onRemove();
              }}
              className="absolute right-2 top-2 rounded-lg bg-black/60 px-2 py-1 text-xs text-white hover:bg-black/80"
            >
              Remove
            </button>
          )}
        </div>
      )}

      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
        onClick={() => !uploading && inputRef.current?.click()}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`relative cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-all duration-200 ${
          isDragging ? borderActive : borderBase
        } ${uploading ? "pointer-events-none opacity-60" : "hover:border-indigo-400/50"}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED.join(",")}
          onChange={(e) => handleFiles(e.target.files)}
          disabled={uploading}
          className="sr-only"
        />

        <div className="pointer-events-none">
          <div
            className={`mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full text-2xl ${
              isDragging ? "scale-110" : ""
            } transition-transform`}
            style={
              isAdmin
                ? { background: "rgba(99, 102, 241, 0.16)", color: "var(--dash-accent-2)" }
                : { background: "#dbeafe", color: "#2563eb" }
            }
          >
            {isDragging ? "↓" : "🖼"}
          </div>
          <p className={`text-sm font-semibold ${textMain}`}>
            {isDragging ? "Drop image here" : "Drag & drop your image"}
          </p>
          <p className={`mt-1 text-xs ${textMuted}`}>
            or <span className="underline">browse files</span> · max {MAX_SIZE_MB}MB
          </p>
          <p className={`mt-2 text-[10px] uppercase tracking-wider ${textMuted}`}>
            JPEG · PNG · WebP · GIF
          </p>
        </div>
      </div>

      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}

      {!autoUpload && file && !uploading && (
        <button
          type="button"
          onClick={handleManualUpload}
          className="mt-3 w-full rounded-lg bg-indigo-500 py-2.5 text-sm font-bold text-white transition-colors hover:bg-indigo-600"
        >
          Upload image
        </button>
      )}

      {currentImage && !displayPreview && (
        <p className={`mt-2 text-xs ${textMuted}`}>Image attached — save product to keep changes</p>
      )}
    </div>
  );
}

export default ImageUpload;
