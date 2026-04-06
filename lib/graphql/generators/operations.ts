import { exampleValueForType } from "@/lib/graphql/example-value";
import { buildSelectionSet } from "@/lib/graphql/selection-set";
import type { FieldDef, NormalizedSchema } from "@/lib/graphql/type-ref";

export type GeneratedOperation = {
  name: string;
  kind: "query" | "mutation" | "subscription";
  graphql: string;
};

function formatArgValue(value: unknown): string {
  if (typeof value === "string") {
    return JSON.stringify(value);
  }
  return JSON.stringify(value, null, 0);
}

function formatGraphqlValue(
  schema: NormalizedSchema,
  type: FieldDef["type"],
  value: unknown
): string {
  if (type.kind === "NON_NULL") {
    return formatGraphqlValue(schema, type.ofType, value);
  }

  if (value === null || value === undefined) {
    return "null";
  }

  if (type.kind === "LIST") {
    if (typeof value === "string") {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) {
          return `[${parsed.map((item) => formatGraphqlValue(schema, type.ofType, item)).join(", ")}]`;
        }
      } catch {
        // Keep fallback behavior for non-JSON strings.
      }
    }

    if (!Array.isArray(value)) {
      return `[${formatGraphqlValue(schema, type.ofType, value)}]`;
    }
    return `[${value.map((item) => formatGraphqlValue(schema, type.ofType, item)).join(", ")}]`;
  }

  const named = schema.types[type.name];
  if (!named) {
    return formatArgValue(value);
  }

  if (named.kind === "ENUM") {
    if (typeof value === "string" && named.values.includes(value)) {
      return value;
    }
    return named.values[0] ?? "VALUE";
  }

  if (named.kind === "INPUT_OBJECT") {
    let preparedValue = value;
    if (typeof preparedValue === "string") {
      try {
        preparedValue = JSON.parse(preparedValue);
      } catch {
        // Keep fallback behavior for non-JSON strings.
      }
    }

    if (!preparedValue || typeof preparedValue !== "object" || Array.isArray(preparedValue)) {
      return "{}";
    }

    const objectValue = preparedValue as Record<string, unknown>;
    const fields = named.inputFields.map((field) => {
      const fieldValue =
        field.name in objectValue
          ? objectValue[field.name]
          : exampleValueForType(schema, field.type);
      return `${field.name}: ${formatGraphqlValue(schema, field.type, fieldValue)}`;
    });

    return `{ ${fields.join(", ")} }`;
  }

  return formatArgValue(value);
}

function buildArgs(schema: NormalizedSchema, field: FieldDef): string {
  if (!field.args.length) {
    return "";
  }

  const pairs = field.args.map((arg) => {
    const value = exampleValueForType(schema, arg.type);
    return `${arg.name}: ${formatGraphqlValue(schema, arg.type, value)}`;
  });

  return `(${pairs.join(", ")})`;
}

function buildOperation(
  schema: NormalizedSchema,
  kind: "query" | "mutation" | "subscription",
  field: FieldDef
): GeneratedOperation {
  const args = buildArgs(schema, field);
  const selection = buildSelectionSet(schema, field.type);
  const opName =
    `${kind}_${field.name.charAt(0).toUpperCase()}${field.name.slice(1)}`;

  const graphql = `${kind} ${opName} {
  ${field.name}${args} ${selection}
}`;

  return {
    name: opName,
    kind,
    graphql
  };
}

export function generateOperations(schema: NormalizedSchema): GeneratedOperation[] {
  const result: GeneratedOperation[] = [];

  const queryRoot = schema.types[schema.root.queryType];
  if (queryRoot && queryRoot.kind === "OBJECT") {
    for (const field of queryRoot.fields) {
      result.push(buildOperation(schema, "query", field));
    }
  }

  if (schema.root.mutationType) {
    const mutationRoot = schema.types[schema.root.mutationType];
    if (mutationRoot && mutationRoot.kind === "OBJECT") {
      for (const field of mutationRoot.fields) {
        result.push(buildOperation(schema, "mutation", field));
      }
    }
  }

  if (schema.root.subscriptionType) {
    const subscriptionRoot = schema.types[schema.root.subscriptionType];
    if (subscriptionRoot && subscriptionRoot.kind === "OBJECT") {
      for (const field of subscriptionRoot.fields) {
        result.push(buildOperation(schema, "subscription", field));
      }
    }
  }

  return result;
}
