"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ background: "#0A0A0B", color: "#FAFAFA", fontFamily: "system-ui", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", padding: 24, maxWidth: 560 }}>
          <p style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>IC HQ hit an error</p>
          <p style={{ fontSize: 13, color: "#FF453A", wordBreak: "break-word", background: "rgba(255,69,58,0.08)", border: "1px solid rgba(255,69,58,0.2)", borderRadius: 12, padding: "10px 14px" }}>
            {error.message || "Unknown error"}
            {error.digest ? ` · digest: ${error.digest}` : ""}
          </p>
          <button
            onClick={reset}
            style={{ marginTop: 18, height: 36, padding: "0 20px", borderRadius: 999, border: 0, background: "rgba(255,255,255,0.08)", color: "#FAFAFA", cursor: "pointer" }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
