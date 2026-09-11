"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/browser";

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

type ImagePickerProps = {
  value: string;
  onChange: (url: string) => void;
  /** True when `value` currently came from the external lookup, not something the admin picked. */
  isAutoRetrieved?: boolean;
};

export function ImagePicker({ value, onChange, isAutoRetrieved }: ImagePickerProps) {
  const [urlDraft, setUrlDraft] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setUploadError(null);

    if (!ALLOWED_TYPES.includes(file.type)) {
      setUploadError("Use a JPEG, PNG, WebP, or GIF image.");
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setUploadError("Image must be 5MB or smaller.");
      return;
    }

    setIsUploading(true);
    try {
      const supabase = createClient();
      const extension = file.name.split(".").pop() || "jpg";
      const path = `${crypto.randomUUID()}.${extension}`;

      const { error: uploadErr } = await supabase.storage
        .from("product-images")
        .upload(path, file, { upsert: false, contentType: file.type });

      if (uploadErr) throw uploadErr;

      const { data: publicUrlData } = supabase.storage
        .from("product-images")
        .getPublicUrl(path);

      onChange(publicUrlData.publicUrl);
    } catch (error) {
      console.error("Image upload failed:", error);
      setUploadError(
        "We couldn't upload that image. You can try again or paste an image URL instead.",
      );
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">Product Image</label>

      {value ? (
        <div className="relative w-32 h-32 rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
          {/* Product photos come from arbitrary external/user sources, so a
              plain <img> is used rather than next/image, which requires
              allow-listing every remote host up front. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="Product" className="w-full h-full object-cover" />
          {isAutoRetrieved && (
            <span className="absolute bottom-1 right-1 bg-purple-100 text-purple-700 text-[10px] font-bold px-1.5 py-0.5 rounded">
              ✓ Retrieved
            </span>
          )}
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute top-1 right-1 bg-black/60 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center hover:bg-black/80"
            aria-label="Remove image"
          >
            ×
          </button>
        </div>
      ) : (
        <div className="w-32 h-32 rounded-lg border border-dashed border-gray-300 bg-gray-50 flex items-center justify-center text-xs text-gray-400 text-center px-2">
          No image yet
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="text-sm font-medium text-gray-700 border border-gray-300 rounded-lg px-3 py-2 hover:bg-gray-50 disabled:opacity-50"
        >
          {isUploading ? "Uploading..." : "Upload Image"}
        </button>
        <button
          type="button"
          onClick={() => cameraInputRef.current?.click()}
          disabled={isUploading}
          className="text-sm font-medium text-gray-700 border border-gray-300 rounded-lg px-3 py-2 hover:bg-gray-50 disabled:opacity-50"
        >
          Take Product Photo
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />

      {uploadError && <p className="mt-2 text-xs text-red-600">{uploadError}</p>}

      <div className="mt-3 flex gap-2">
        <input
          type="text"
          value={urlDraft}
          onChange={e => setUrlDraft(e.target.value)}
          placeholder="Or paste an image URL"
          className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500"
        />
        <button
          type="button"
          onClick={() => {
            if (urlDraft.trim()) {
              onChange(urlDraft.trim());
              setUrlDraft("");
            }
          }}
          className="text-sm font-medium text-gray-700 border border-gray-300 rounded-lg px-3 py-2 hover:bg-gray-50"
        >
          Use URL
        </button>
      </div>
    </div>
  );
}
