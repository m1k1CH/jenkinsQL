import Link from "next/link";

export default function HomePage() {
  return (
    <main className="space-y-6">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
        <h2 className="text-xl font-semibold">Start</h2>
        <p className="mt-2 text-zinc-400">
          Use the flow below to generate GraphQL requests.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/introspection"
            className="rounded-xl bg-white px-4 py-2 font-medium text-black"
          >
            1. Introspection Query
          </Link>
          <Link
            href="/paste-response"
            className="rounded-xl border border-zinc-700 px-4 py-2"
          >
            2. Paste Response
          </Link>
          <Link
            href="/generated"
            className="rounded-xl border border-zinc-700 px-4 py-2"
          >
            3. Generated Requests
          </Link>
        </div>
      </div>
    </main>
  );
}
