"use client";

import { useRef, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import styles from "./ImageUpload.module.css";

export function ImageUpload({
  kind,
  name,
  label,
  currentUrl,
  currentName,
  round = false,
}: {
  kind: "logo" | "avatar";
  name: string;
  label: string;
  currentUrl?: string | null;
  currentName?: string;
  round?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(currentUrl || null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedKey, setSavedKey] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    setBusy(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("kind", kind);
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Upload failed");
        return;
      }
      setPreview(json.url);
      setSavedKey(json.url);
    } catch {
      setError("Upload failed. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.wrap}>
      <div className="kicker">{label}</div>
      <div className={styles.row}>
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt=""
            className={`${styles.preview} ${round ? styles.round : ""} ${
              kind === "logo" ? styles.logo : styles.avatar
            }`}
          />
        ) : kind === "avatar" && currentName ? (
          <Avatar name={currentName} size={64} />
        ) : (
          <div className={`${styles.placeholder} ${round ? styles.round : ""} ${
            kind === "logo" ? styles.logo : styles.avatar
          }`}>
            <span>{kind === "logo" ? "Logo" : "Photo"}</span>
          </div>
        )}

        <div className={styles.actions}>
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleFile(f);
            }}
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            {busy ? "Uploading..." : preview ? "Replace" : "Upload"}
          </Button>
          {preview ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setPreview(null);
                setSavedKey(null);
                if (inputRef.current) inputRef.current.value = "";
              }}
            >
              Remove
            </Button>
          ) : null}
        </div>
      </div>

      {error ? (
        <div className="text-sm" style={{ color: "var(--brand-ink)" }}>
          {error}
        </div>
      ) : null}

      <input type="hidden" name={name} value={savedKey ?? preview ?? ""} />
    </div>
  );
}
