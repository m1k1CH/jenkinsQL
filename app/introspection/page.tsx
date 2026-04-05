import Link from "next/link";
import CopyButton from "@/components/copy-button";
import {
  INTROSPECTION_QUERY,
  getIntrospectionBody
} from "@/lib/graphql/introspection";

export default function IntrospectionPage() {
  const body = getIntrospectionBody();

  return (
    <main className="space-y-6">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
        <h2 className="text-xl font-semibold">Step 1: Copy introspection query</h2>
        <p className="mt-2 text-zinc-400">
          Send this exact query to the target GraphQL endpoint, then copy the full JSON response.
        </p>

        <div className="mt-4 flex flex-wrap gap-3">
          <CopyButton value={INTROSPECTION_QUERY} label="Copy Query" />
          <CopyButton value={body} label="Copy JSON Body" />
          <Link
            href="/paste-response"
            className="rounded-xl bg-white px-4 py-2 font-medium text-black"
          >
            Next
          </Link>
        </div>

        <pre className="mt-6 overflow-x-auto rounded-2xl bg-black p-4 text-sm text-zinc-200">
{INTROSPECTION_QUERY}
        </pre>
      </div>
    </main>
  );
}
