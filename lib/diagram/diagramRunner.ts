import path from "node:path";
import { spawn } from "node:child_process";

export type RunnerLimits = {
  timeoutMs: number;
  maxBufferBytes: number;
};

export async function renderSvgFromSDL(schemaSDL: string, limits: RunnerLimits) {
  const startedAt = Date.now();
  const dot = await sdlToDot(schemaSDL, limits);
  const svg = await dotToSvg(dot, limits);

  return {
    svg,
    phaseMs: { total: Date.now() - startedAt }
  };
}

function sdlToDot(schemaSDL: string, limits: RunnerLimits): Promise<string> {
  return new Promise((resolve, reject) => {
    const graphqlvizBin = path.join(process.cwd(), "node_modules", ".bin", "graphqlviz");
    const child = spawn(graphqlvizBin, [], { stdio: ["pipe", "pipe", "pipe"] });

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

    child.on("error", (spawnErr: any) => {
      const e: any = new Error(spawnErr?.message || "Failed to execute graphqlviz");
      e.code = spawnErr?.code === "ENOENT" ? "GRAPHQLVIZ_NOT_INSTALLED" : "GRAPHQLVIZ_FAILED";
      reject(e);
    });

    child.on("close", (code) => {
      clearTimeout(killTimer);
      if (code !== 0) {
        const e: any = new Error(err.toString() || "graphqlviz failed");
        e.code = "GRAPHQLVIZ_FAILED";
        return reject(e);
      }

      const dot = out.toString("utf8");
      if (!dot.trim()) {
        const e: any = new Error("graphqlviz returned empty DOT");
        e.code = "GRAPHQLVIZ_FAILED";
        return reject(e);
      }

      resolve(dot);
    });

    child.stdin.end(schemaSDL, "utf8");
  });
}

function dotToSvg(dot: string, limits: RunnerLimits): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn("dot", ["-Tsvg"], { stdio: ["pipe", "pipe", "pipe"] });

    child.on("error", (spawnErr: any) => {
      const e: any = new Error(spawnErr?.message || "Failed to execute dot");
      e.code = spawnErr?.code === "ENOENT" ? "DOT_NOT_INSTALLED" : "DOT_FAILED";
      reject(e);
    });

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
