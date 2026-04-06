"use client";

import { useEffect, useMemo, useState } from "react";
import CopyButton from "@/components/copy-button";

type SchemaDiagramProps = {
  schemaSdl: string;
};

export default function SchemaDiagram({ schemaSdl }: SchemaDiagramProps) {
  const [svg, setSvg] = useState("");
  const [sdl, setSdl] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function generate() {
      if (!schemaSdl.trim()) {
        setSvg("");
        setSdl("");
        setError("");
        setElapsedMs(null);
        return;
      }

      try {
        setLoading(true);
        setError("");
        setSvg("");
        setElapsedMs(null);

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 25000);

        const response = await fetch("/api/diagram", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            inputKind: "sdl",
            payload: schemaSdl
          }),
          signal: controller.signal
        });

        clearTimeout(timeout);

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.message || "Failed to generate diagram");
        }

        if (cancelled) return;

        setSvg(data.svg || "");
        setSdl(data.sdl || "");
        setElapsedMs(typeof data.elapsedMs === "number" ? data.elapsedMs : null);
      } catch (err) {
        if (cancelled) return;

        if (err instanceof Error && err.name === "AbortError") {
          setError("Diagram generation timed out after 25 seconds.");
        } else {
          setError(err instanceof Error ? err.message : "Failed to generate diagram");
        }

        setSvg("");
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    generate();

    return () => {
      cancelled = true;
    };
  }, [schemaSdl]);

  const svgBlobUrl = useMemo(() => {
    if (!svg) return "";
    const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    return URL.createObjectURL(blob);
  }, [svg]);

  useEffect(() => {
    return () => {
      if (svgBlobUrl) {
        URL.revokeObjectURL(svgBlobUrl);
      }
    };
  }, [svgBlobUrl]);

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">Schema Diagram</h3>
          <p className="text-sm text-zinc-400">
            Backend: SDL → graphqlviz → dot → SVG
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {sdl ? <CopyButton value={sdl} label="Copy SDL" /> : null}
          {svgBlobUrl ? (
            <a
              href={svgBlobUrl}
              download="schema-diagram.svg"
              className="rounded-xl border border-zinc-700 px-4 py-2 text-sm hover:bg-zinc-800"
            >
              Download SVG
            </a>
          ) : null}
        </div>
      </div>

      {loading ? (
        <div className="mt-4 rounded-xl border border-zinc-700 bg-zinc-950 p-3 text-sm text-zinc-300">
          Building schema.graphql and generating SVG...
        </div>
      ) : null}

      {!loading && elapsedMs !== null ? (
        <div className="mt-4 rounded-xl border border-green-800 bg-green-950 p-3 text-sm text-green-300">
          Diagram ready in {elapsedMs} ms
        </div>
      ) : null}

      {error ? (
        <div className="mt-4 rounded-xl border border-red-700 bg-red-950 p-3 text-sm text-red-300">
          {error}
        </div>
      ) : null}

      <div className="mt-6 max-h-[70vh] overflow-auto rounded-2xl bg-white p-4">
        {svg ? (
          <div
            dangerouslySetInnerHTML={{ __html: svg }}
            className="[&>svg]:h-auto [&>svg]:w-full [&>svg]:max-w-[1600px]"
          />
        ) : (
          <div className="text-sm text-zinc-500">
            {loading ? "Please wait..." : "No diagram yet"}
          </div>
        )}
      </div>
    </div>
  );
}
