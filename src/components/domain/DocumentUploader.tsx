"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Status } from "@/components/ui/Status";
import styles from "./DocumentUploader.module.css";

type UploadState = {
  status: "idle" | "uploading" | "scanning" | "clean" | "infected" | "error";
  message?: string;
  signature?: string;
  durationMs?: number;
};

export function DocumentUploader({
  studentId,
  docType,
  label,
  allowedMimes,
  maxBytes,
  onUploaded,
}: {
  studentId: string;
  docType: string;
  label: string;
  allowedMimes: string[];
  maxBytes: number;
  onUploaded?: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<UploadState>({ status: "idle" });

  async function handleFile(file: File) {
    setState({ status: "uploading", message: "Uploading..." });

    // Client-side validation
    if (!allowedMimes.includes(file.type)) {
      setState({
        status: "error",
        message: `File type ${file.type} is not allowed`,
      });
      return;
    }
    if (file.size > maxBytes) {
      const mb = Math.round(maxBytes / 1024 / 1024);
      setState({ status: "error", message: `File must be ${mb}MB or smaller` });
      return;
    }

    setState({ status: "scanning", message: "Scanning for malware..." });

    try {
      const form = new FormData();
      form.append("file", file);
      form.append("kind", "document");
      form.append("studentId", studentId);
      form.append("docType", docType);

      const res = await fetch("/api/upload", { method: "POST", body: form });
      const json = await res.json();

      if (res.ok && json.scanResult?.clean) {
        setState({
          status: "clean",
          message: "Uploaded and scanned clean.",
          durationMs: json.scanResult.durationMs,
        });
        onUploaded?.();
      } else if (json.scanResult && !json.scanResult.clean) {
        setState({
          status: "infected",
          message: json.error ?? "Malware detected. File rejected.",
          signature: json.scanResult.signature,
        });
      } else {
        setState({
          status: "error",
          message: json.error ?? "Upload failed",
        });
      }
    } catch {
      setState({ status: "error", message: "Network error. Try again." });
    }
  }

  return (
    <div className={styles.wrap}>
      <input
        ref={inputRef}
        type="file"
        accept={allowedMimes.join(",")}
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
        }}
      />

      <div className={styles.row}>
        <Button
          variant="secondary"
          size="sm"
          disabled={state.status === "uploading" || state.status === "scanning"}
          onClick={() => inputRef.current?.click()}
        >
          {state.status === "uploading"
            ? "Uploading..."
            : state.status === "scanning"
              ? "Scanning..."
              : "Upload file"}
        </Button>
        <span className="text-sm muted">{label}</span>
      </div>

      {state.status !== "idle" ? (
        <div
          className={`status-row ${
            state.status === "clean"
              ? "is-ok"
              : state.status === "infected"
                ? "is-bad"
                : state.status === "error"
                  ? "is-bad"
                  : "is-brand"
          }`}
        >
          <div>
            <div className="text-sm font-medium">
              {state.status === "clean"
                ? "Scan complete"
                : state.status === "infected"
                  ? "Malware detected"
                  : state.status === "scanning"
                    ? "Scanning"
                    : state.status === "uploading"
                      ? "Uploading"
                      : "Error"}
            </div>
            <div className="text-sm">{state.message}</div>
            {state.signature ? (
              <div className="text-sm">Signature: {state.signature}</div>
            ) : null}
            {state.durationMs != null ? (
              <div className="text-xs muted">
                Scanned in {state.durationMs}ms
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="text-xs muted">
        Allowed: {allowedMimes.map((m) => m.split("/")[1]).join(", ")}.
        Max {Math.round(maxBytes / 1024 / 1024)}MB.
        Files are scanned before release.
      </div>
    </div>
  );
}
