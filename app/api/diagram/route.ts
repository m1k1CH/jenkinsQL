import { NextResponse } from "next/server";
import { buildClientSchema, buildSchema, printSchema } from "graphql";
import { enqueue } from "@/lib/diagram/queue";
import { renderSvgFromSDL } from "@/lib/diagram/diagramRunner";

export const runtime = "nodejs"; // Route Segment Config: runtime supports 'nodejs'/'edge'. citeturn2search0

const DEFAULT_TIMEOUT_MS = 20000;
const DEFAULT_MAX_BUFFER = 20 * 1024 * 1024;
const MAX_INPUT_BYTES = 10 * 1024 * 1024; // safe default; tune if needed (unspecified)

function tooLarge(bytes: number) {
  return bytes > MAX_INPUT_BYTES;
}

export async function POST(request: Request) {
  const startedAt = Date.now();

  try {
    const contentType = request.headers.get("content-type") || "";

    let inputKind: "introspection-json" | "sdl" | null = null;
    let payload = "";

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const kind = String(form.get("inputKind") || "");
      inputKind = kind === "sdl" ? "sdl" : "introspection-json";

      const file = form.get("schemaFile");
      if (file instanceof File) {
        if (tooLarge(file.size)) {
          return NextResponse.json({ errorCode: "INPUT_TOO_LARGE", message: `File too large: ${file.size} bytes` }, { status: 413 });
        }
        payload = await file.text();
        inputKind = "sdl";
      } else {
        payload = String(form.get("payload") || "");
      }
    } else {
      const raw = await request.text();
      if (tooLarge(Buffer.byteLength(raw, "utf8"))) {
        return NextResponse.json({ errorCode: "INPUT_TOO_LARGE", message: "Payload too large" }, { status: 413 });
      }
      const json = JSON.parse(raw);
      inputKind = json.inputKind === "sdl" ? "sdl" : "introspection-json";
      payload = String(json.payload || "");
    }

    if (!inputKind || !payload.trim()) {
      return NextResponse.json({ errorCode: "BAD_REQUEST", message: "Missing inputKind/payload" }, { status: 400 });
    }

    const job = async () => {
      const t0 = Date.now();

      let sdl = "";
      if (inputKind === "introspection-json") {
        const intro = JSON.parse(payload);
        // GraphQL.js: buildClientSchema produces schema from introspection result; printSchema prints SDL. citeturn0search1
        const schema = buildClientSchema(intro.data ?? intro);
        sdl = printSchema(schema);
      } else {
        // Validate SDL and canonicalize
        const schema = buildSchema(payload);
        sdl = printSchema(schema);
      }

      const rendered = await renderSvgFromSDL(sdl, {
        timeoutMs: DEFAULT_TIMEOUT_MS,
        maxBufferBytes: DEFAULT_MAX_BUFFER
      });

      return {
        svg: rendered.svg,
        sdl,
        elapsedMs: Date.now() - startedAt,
        diagnostics: {
          phaseMs: { parseAndCanonicalize: Date.now() - t0 }
        }
      };
    };

    const result = await enqueue(job);
    return NextResponse.json(result, { status: 200 });
  } catch (e: any) {
    const code = e?.code || "INTERNAL";
    const msg = e?.message || "Unknown error";
    const elapsedMs = Date.now() - startedAt;
    const status = code === "QUEUE_FULL" ? 429 : 500;

    return NextResponse.json(
      { errorCode: code, message: msg, elapsedMs },
      { status }
    );
  }
}
