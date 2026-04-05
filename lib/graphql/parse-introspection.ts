import { buildClientSchema, printSchema } from "graphql";
import { normalizeSchema } from "@/lib/graphql/normalize-schema";

export type ParsedIntrospectionResult =
  | {
      ok: true;
      sdl: string;
      normalized: ReturnType<typeof normalizeSchema>;
    }
  | {
      ok: false;
      error: string;
    };

type AnyRecord = Record<string, any>;

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function ensureArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

function ensureRecordArray(value: unknown): AnyRecord[] {
  return Array.isArray(value)
    ? value.filter((item): item is AnyRecord => !!item && typeof item === "object")
    : [];
}

function patchDirective(directive: AnyRecord): AnyRecord {
  if (!directive || typeof directive !== "object") {
    return directive;
  }

  if (Array.isArray(directive.locations) && directive.locations.length > 0) {
    directive.args = ensureRecordArray(directive.args);
    return directive;
  }

  const locations: string[] = [];

  if (directive.onOperation) {
    locations.push("QUERY", "MUTATION", "SUBSCRIPTION");
  }

  if (directive.onFragment) {
    locations.push(
      "FRAGMENT_DEFINITION",
      "FRAGMENT_SPREAD",
      "INLINE_FRAGMENT"
    );
  }

  if (directive.onField) {
    locations.push("FIELD");
  }

  directive.locations = locations;
  directive.args = ensureRecordArray(directive.args);

  return directive;
}

function patchType(type: AnyRecord): AnyRecord {
  if (!type || typeof type !== "object") {
    return type;
  }

  type.fields = ensureRecordArray(type.fields);
  type.inputFields = ensureRecordArray(type.inputFields);
  type.interfaces = ensureRecordArray(type.interfaces);
  type.enumValues = ensureRecordArray(type.enumValues);
  type.possibleTypes = ensureRecordArray(type.possibleTypes);

  if (Array.isArray(type.fields)) {
    type.fields = type.fields.map((field: AnyRecord) => ({
      ...field,
      args: ensureRecordArray(field?.args)
    }));
  }

  return type;
}

function patchIntrospectionShape(candidate: AnyRecord): AnyRecord {
  if (
    !candidate ||
    typeof candidate !== "object" ||
    !candidate.__schema ||
    typeof candidate.__schema !== "object"
  ) {
    return candidate;
  }

  const schema = candidate.__schema as AnyRecord;

  schema.types = ensureRecordArray(schema.types).map((type) => patchType(type));
  schema.directives = ensureRecordArray(schema.directives).map((directive) =>
    patchDirective(directive)
  );

  if (schema.subscriptionType === undefined) {
    schema.subscriptionType = null;
  }

  if (schema.mutationType === undefined) {
    schema.mutationType = null;
  }

  return candidate;
}

export function parseIntrospectionJson(raw: string): ParsedIntrospectionResult {
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, error: "Invalid JSON" };
  }

  const candidate =
    parsed &&
    typeof parsed === "object" &&
    "data" in parsed &&
    parsed.data &&
    typeof parsed.data === "object"
      ? parsed.data
      : parsed;

  if (
    !candidate ||
    typeof candidate !== "object" ||
    !("__schema" in candidate)
  ) {
    return {
      ok: false,
      error: "No __schema found. Paste a full introspection response."
    };
  }

  try {
    const patched = patchIntrospectionShape(deepClone(candidate as AnyRecord));
    const schema = buildClientSchema(patched as any);

    return {
      ok: true,
      sdl: printSchema(schema),
      normalized: normalizeSchema(schema)
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to parse schema"
    };
  }
}
