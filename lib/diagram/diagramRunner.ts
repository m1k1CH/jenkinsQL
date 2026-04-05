import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export type RunnerLimits = {
  timeoutMs: number;      // default 15–20s
  maxBufferBytes: number; // default 20MB
};

export async function renderSvgFromSDL(schemaSDL: string, limits: RunnerLimits) {
  const startedAt = Date.now();
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "diagram-"));
  const schemaPath = path.join(tempDir, "schema.graphql");

  try {
    await fs.writeFile(schemaPath, schemaSDL, "utf8");

    const graphqlvizBin = path.join(process.cwd(), "node_modules", ".bin", "graphqlviz");

    // execFile runs without spawning a shell; supports timeout/maxBuffer. citeturn4search3turn4search15
    const gv = await execFileAsync(graphqlvizBin, [schemaPath], {
      timeout: limits.timeoutMs,
      maxBuffer: limits.maxBufferBytes
    });

    const dot = gv.stdout?.toString() ?? "";
    if (!dot.trim()) {
      const err: any = new Error(gv.stderr?.toString().slice(0, 2000) || "graphqlviz returned empty DOT");
      err.code = "GRAPHQLVIZ_FAILED";
      throw err;
    }

    const svg = await dotToSvg(dot, limits);
    return {
      svg,
      phaseMs: { total: Date.now() - startedAt }
    };
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

function dotToSvg(dot: string, limits: RunnerLimits): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn("dot", ["-Tsvg"], { stdio: ["pipe", "pipe", "pipe"] });

    const killTimer = setTimeout(() => {
      child.kill("SIGTERM");
    }, limits.timeoutMs);

    let out = Buffer.alloc(0);
    let err = Buffer.alloc(0);

    child.stdout.on("data", (chunk: Buffer) => {
      out = Buffer.concat([out, chunk]);
      if (out.length > limits.maxBufferBytes) {
        child.kill("SIGTERM");
      }
    });

    child.stderr.on("data", (chunk: Buffer) => {
      err = Buffer.concat([err, chunk]);
      if (err.length > 2000) err = err.subarray(0, 2000);
    });

    child.on("close", (code) => {
      clearTimeout(killTimer);
      if (code !== 0) {
        const e: any = new Error(err.toString() || "dot failed");
        e.code = "DOT_FAILED";
        return reject(e);
      }
      const svg = out.toString("utf8");
      if (!svg.includes("<svg")) {
        const e: any = new Error("dot returned non-SVG output");
        e.code = "DOT_FAILED";
        return reject(e);
      }
      resolve(svg);
    });

    child.stdin.end(dot, "utf8");
  });
}
