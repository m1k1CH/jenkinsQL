"use client";

import { useEffect, useMemo, useState } from "react";
import CopyButton from "@/components/copy-button";
import SchemaDiagram from "@/components/schema-diagram";
import { parseIntrospectionJson } from "@/lib/graphql/parse-introspection";
import { generateOperations } from "@/lib/graphql/generators/operations";
import {
  toGetRequest,
  toJsonBody,
  toRawHttpRequest
} from "@/lib/graphql/generators/exports";
import { loadState, saveState } from "@/lib/storage/app-state";

export default function GeneratedPage() {
  const [host, setHost] = useState("example.com");
  const [path, setPath] = useState("/graphql");
  const [raw, setRaw] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const state = loadState();
    setHost(state.host);
    setPath(state.path);
    setRaw(state.introspectionResponse);
  }, []);

  useEffect(() => {
    saveState({
      host,
      path,
      introspectionResponse: raw
    });
  }, [host, path, raw]);

  const parsed = useMemo(() => {
    if (!raw.trim()) {
      return null;
    }
    return parseIntrospectionJson(raw);
  }, [raw]);

  const operations = useMemo(() => {
    if (!parsed || !parsed.ok) return [];
    return generateOperations(parsed.normalized);
  }, [parsed]);

  useEffect(() => {
    if (parsed && !parsed.ok) {
      setError(parsed.error);
    } else {
      setError("");
    }
  }, [parsed]);

  return (
    <main className="space-y-6">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
        <h2 className="text-xl font-semibold">Step 3: Generated requests</h2>
        <p className="mt-2 text-zinc-400">
          Configure host and path, then copy GraphQL, JSON, POST, or GET variants.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm text-zinc-400">Host</label>
            <input
              className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-2 outline-none"
              value={host}
              onChange={(event) => setHost(event.target.value)}
            />
          </div>
          <div>
            <label className="mb-2 block text-sm text-zinc-400">Path</label>
            <input
              className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-2 outline-none"
              value={path}
              onChange={(event) => setPath(event.target.value)}
            />
          </div>
        </div>

        {error ? (
          <div className="mt-4 rounded-xl border border-red-700 bg-red-950 p-3 text-sm text-red-300">
            {error}
          </div>
        ) : null}
      </div>

      {parsed && parsed.ok ? (
        <>
          <div className="space-y-6">
            {operations.map((operation) => {
              const json = toJsonBody(operation.graphql, operation.variables);
              const post = toRawHttpRequest(
                host,
                path,
                operation.graphql,
                operation.variables
              );
              const get = toGetRequest(
                host,
                path,
                operation.graphql,
                operation.variables
              );

              return (
                <div
                  key={operation.name}
                  className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold">{operation.name}</h3>
                      <p className="text-sm text-zinc-400">{operation.kind}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <CopyButton value={operation.graphql} label="Copy GraphQL" />
                      <CopyButton value={json} label="Copy JSON" />
                      <CopyButton value={post} label="Copy POST" />
                      <CopyButton value={get} label="Copy GET" />
                    </div>
                  </div>

                  <div className="mt-6 grid gap-4 xl:grid-cols-4">
                    <div>
                      <h4 className="mb-2 text-sm font-medium text-zinc-400">GraphQL</h4>
                      <pre className="overflow-auto rounded-2xl bg-black p-4 text-sm">
{operation.graphql}
                      </pre>
                    </div>
                    <div>
                      <h4 className="mb-2 text-sm font-medium text-zinc-400">JSON Body</h4>
                      <pre className="overflow-auto rounded-2xl bg-black p-4 text-sm">
{json}
                      </pre>
                    </div>
                    <div>
                      <h4 className="mb-2 text-sm font-medium text-zinc-400">Raw HTTP POST</h4>
                      <pre className="overflow-auto rounded-2xl bg-black p-4 text-sm">
{post}
                      </pre>
                    </div>
                    <div>
                      <h4 className="mb-2 text-sm font-medium text-zinc-400">Raw HTTP GET</h4>
                      <pre className="overflow-auto rounded-2xl bg-black p-4 text-sm break-all">
{get}
                      </pre>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <SchemaDiagram schemaSdl={parsed.sdl} />
        </>
      ) : (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 text-zinc-400">
          No parsed schema yet. Go to “Paste Response” and add introspection JSON.
        </div>
      )}
    </main>
  );
}
