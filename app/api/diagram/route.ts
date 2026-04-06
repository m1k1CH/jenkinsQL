import { NextResponse } from "next/server";
import { buildClientSchema, buildSchema, printSchema } from "graphql";
import { enqueue } from "@/lib/diagram/queue";
import { renderSvgFromSDL } from "@/lib/diagram/diagramRunner";

export const runtime = "nodejs";

const DEFAULT_TIMEOUT_MS = 20000;
const DEFAULT_MAX_BUFFER = 20 * 1024 * 1024;
const MAX_INPUT_BYTES = 10 * 1024 * 1024; // safe default; tune if needed (unspecified)

function tooLarge(bytes: number) {
  return bytes > MAX_INPUT_BYTES;
}

function detectInputKind(payload: string): "sdl" | "introspection-json" {
  const trimmed = payload.trim();
  if (!trimmed) return "introspection-json";
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    return "introspection-json";
  }
  return "sdl";
}

export async function POST(request: Request) {
  const startedAt = Date.now();

  try {
    const raw = await request.text();
    if (tooLarge(Buffer.byteLength(raw, "utf8"))) {
      return NextResponse.json({ errorCode: "INPUT_TOO_LARGE", message: "Payload too large" }, { status: 413 });
    }
    const json = JSON.parse(raw);
    const providedKind =
      json.inputKind === "sdl" || json.inputKind === "introspection-json"
        ? json.inputKind
        : null;
    let inputKind: "introspection-json" | "sdl" = "introspection-json";
    let payload = String(json.payload || "");

    if (!payload && typeof json.schemaJson === "string") {
      inputKind = "introspection-json";
      payload = json.schemaJson;
    }

    if (!payload && typeof json.sdl === "string") {
      inputKind = "sdl";
      payload = json.sdl;
    }

    if (payload && !providedKind) {
      inputKind = detectInputKind(payload);
    } else if (providedKind) {
      inputKind = providedKind;
    }

    if (!inputKind || !payload.trim()) {
      return NextResponse.json({ errorCode: "BAD_REQUEST", message: "Missing inputKind/payload" }, { status: 400 });
    }

    const job = async () => {
      const t0 = Date.now();

      let sdl = "";
      try {
        if (inputKind === "introspection-json") {
          const intro = JSON.parse(payload);
          const schema = buildClientSchema(intro.data ?? intro);
          sdl = printSchema(schema);
        } else {
          const schema = buildSchema(payload);
          sdl = printSchema(schema);
        }
      } catch (schemaError: any) {
        const e: any = new Error(schemaError?.message || "Invalid schema payload");
        e.code = "INVALID_SCHEMA_PAYLOAD";
        throw e;
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
    const code =
      e?.code ||
      (e instanceof SyntaxError ? "BAD_JSON" : "INTERNAL");
    const msg = e?.message || "Unknown error";
    const elapsedMs = Date.now() - startedAt;
    const status =
      code === "QUEUE_FULL" ? 429 :
      code === "BAD_JSON" ? 400 :
      code === "INVALID_SCHEMA_PAYLOAD" ? 400 :
      code === "INPUT_TOO_LARGE" ? 413 :
      code === "GRAPHQLVIZ_FAILED" || code === "DOT_FAILED" ? 422 :
      500;

    return NextResponse.json(
      { errorCode: code, message: msg, elapsedMs },
      { status }
    );
  }
}
