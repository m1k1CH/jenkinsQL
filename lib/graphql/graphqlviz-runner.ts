import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export async function runGraphqlvizToSvg(schemaSDL: string): Promise<string> {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "graphqlviz-"));
  const schemaPath = path.join(tempDir, "schema.graphql");
  const dotPath = path.join(tempDir, "schema.dot");
  const svgPath = path.join(tempDir, "schema.svg");

  try {
    await fs.writeFile(schemaPath, schemaSDL, "utf8");

    const graphqlvizPath = path.join(process.cwd(), "node_modules", ".bin", "graphqlviz");

    const graphqlvizResult = await execFileAsync(graphqlvizPath, [schemaPath], {
      timeout: 15000,
      maxBuffer: 20 * 1024 * 1024
    });

    const dotOutput = graphqlvizResult.stdout?.trim();

    if (!dotOutput) {
      throw new Error(graphqlvizResult.stderr?.trim() || "graphqlviz returned empty DOT");
    }

    await fs.writeFile(dotPath, dotOutput, "utf8");

    const dotResult = await execFileAsync("dot", ["-Tsvg", dotPath, "-o", svgPath], {
      timeout: 15000,
      maxBuffer: 20 * 1024 * 1024
    });

    const svg = await fs.readFile(svgPath, "utf8");

    if (!svg.trim()) {
      throw new Error(dotResult.stderr?.trim() || "dot returned empty SVG");
    }

    return svg;
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}
