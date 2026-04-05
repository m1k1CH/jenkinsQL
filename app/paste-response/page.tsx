"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loadState, saveState } from "@/lib/storage/app-state";
import { parseIntrospectionJson } from "@/lib/graphql/parse-introspection";

export default function PasteResponsePage() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const state = loadState();
    setValue(state.introspectionResponse);
  }, []);

  function handleSubmit() {
    const result = parseIntrospectionJson(value);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    const state = loadState();
    saveState({
      ...state,
      introspectionResponse: value
    });

    setError("");
    router.push("/generated");
  }

  return (
    <main className="space-y-6">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
        <h2 className="text-xl font-semibold">Step 2: Paste introspection response</h2>
        <p className="mt-2 text-zinc-400">
          Paste the full JSON response you received from the target.
        </p>

        <textarea
          className="mt-6 min-h-[420px] w-full rounded-2xl border border-zinc-700 bg-black p-4 text-sm outline-none"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder='{"data":{"__schema":{...}}}'
        />

        {error ? (
          <div className="mt-4 rounded-xl border border-red-700 bg-red-950 p-3 text-sm text-red-300">
            {error}
          </div>
        ) : null}

        <div className="mt-4 flex gap-3">
          <button
            type="button"
            onClick={handleSubmit}
            className="rounded-xl bg-white px-4 py-2 font-medium text-black"
          >
            Parse Schema
          </button>
          <button
            type="button"
            onClick={() => setValue("")}
            className="rounded-xl border border-zinc-700 px-4 py-2"
          >
            Clear
          </button>
        </div>
      </div>
    </main>
  );
}
