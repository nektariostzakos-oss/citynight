"use client";

import { useRef, useState } from "react";

type Props = {
  label?: string;
  value: string;
  onChange: (url: string) => void;
  /** Long edge in px to downscale to before upload. */
  maxSide?: number;
  /** JPEG quality 0..1 */
  quality?: number;
  /** Accept a URL paste as well. Defaults true. */
  allowUrl?: boolean;
  /**
   * Placement preset — the server resizes the upload to exactly the width
   * this slot needs (hero, product, gallery, staff, logo, og, ...). The
   * server is authoritative; the client resize is just upload bandwidth.
   */
  preset?: string;
};

export default function ImagePicker({
  label,
  value,
  onChange,
  maxSide = 2000,
  quality = 0.85,
  allowUrl = true,
  preset = "default",
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string>("");
  const [err, setErr] = useState<string>("");

  async function pick(file: File) {
    setErr("");
    if (!file.type.startsWith("image/")) {
      setErr("Please select an image.");
      return;
    }
    setBusy(true);
    try {
      setStatus("Preparing…");
      const original = await fileToDataUrl(file);
      setStatus("Resizing…");
      const { blob, w, h, mime } = await resize(original, maxSide, quality);

      setStatus(`Uploading ${humanSize(blob.size)} · ${w}×${h}…`);
      const fd = new FormData();
      const ext = mime === "image/webp" ? "webp" : "jpg";
      fd.append("file", blob, `upload.${ext}`);
      fd.append("preset", preset);

      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Upload failed.");
      onChange(d.url);
      setStatus("Uploaded ✓");
      setTimeout(() => setStatus(""), 2000);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Upload failed.");
      setStatus("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ marginBottom: 12 }}>
      {label && (
        <p
          style={{
            margin: "0 0 6px",
            fontSize: 11,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            color: "var(--gold)",
          }}
        >
          {label}
        </p>
      )}

      <div
        style={{
          display: "flex",
          gap: 8,
          alignItems: "center",
          marginBottom: 6,
        }}
      >
        {value && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={value}
            alt=""
            width={56}
            height={56}
            decoding="async"
            loading="lazy"
            style={{
              width: 56,
              height: 56,
              objectFit: "cover",
              borderRadius: 8,
              border: "1px solid var(--border)",
            }}
          />
        )}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          style={{
            padding: "8px 14px",
            borderRadius: 999,
            border: "1px solid var(--border-strong)",
            background: "var(--surface-strong)",
            color: "var(--foreground)",
            fontSize: 11,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            cursor: busy ? "progress" : "pointer",
            opacity: busy ? 0.6 : 1,
          }}
        >
          {value ? "Replace" : "Upload image"}
        </button>
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            disabled={busy}
            style={{
              padding: "6px 12px",
              borderRadius: 999,
              border: "1px solid var(--border)",
              background: "transparent",
              color: "var(--muted)",
              fontSize: 11,
              cursor: "pointer",
            }}
          >
            Clear
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
        capture="environment"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) pick(f);
          e.target.value = "";
        }}
        style={{ display: "none" }}
      />

      {allowUrl && (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="…or paste an image URL"
          disabled={busy}
          style={{
            width: "100%",
            padding: "8px 12px",
            borderRadius: 10,
            border: "1px solid var(--border)",
            background: "var(--surface)",
            color: "var(--foreground)",
            fontSize: 13,
            outline: "none",
            marginTop: 4,
          }}
        />
      )}

      {status && (
        <p style={{ margin: "6px 0 0", fontSize: 12, color: "var(--gold)" }}>
          {status}
        </p>
      )}
      {err && (
        <p
          style={{
            margin: "6px 0 0",
            padding: 8,
            borderRadius: 8,
            background: "rgba(239,68,68,0.1)",
            border: "1px solid rgba(239,68,68,0.4)",
            color: "#fca5a5",
            fontSize: 12,
          }}
        >
          {err}
        </p>
      )}
    </div>
  );
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

async function resize(
  dataUrl: string,
  maxSide: number,
  quality: number
): Promise<{ blob: Blob; w: number; h: number; mime: string }> {
  const img = await loadImage(dataUrl);
  let { width, height } = img;
  const max = Math.max(width, height);
  if (max > maxSide) {
    const scale = maxSide / max;
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported in this browser.");
  // Better downscale quality
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, width, height);

  // Prefer WebP (smaller at same quality); fall back to JPEG.
  const canWebp = await canvasSupportsType(canvas, "image/webp");
  const mime = canWebp ? "image/webp" : "image/jpeg";

  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Canvas.toBlob failed."))),
      mime,
      quality
    );
  });

  return { blob, w: width, h: height, mime };
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not read the image."));
    img.src = src;
  });
}

function canvasSupportsType(canvas: HTMLCanvasElement, type: string) {
  return new Promise<boolean>((resolve) => {
    try {
      canvas.toBlob((b) => resolve(!!b && b.type === type), type, 0.85);
    } catch {
      resolve(false);
    }
  });
}

function humanSize(n: number) {
  if (n > 1_048_576) return (n / 1_048_576).toFixed(2) + " MB";
  if (n > 1024) return (n / 1024).toFixed(0) + " KB";
  return n + " B";
}
