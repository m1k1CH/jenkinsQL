import { exampleValueForType } from "@/lib/graphql/example-value";
import { buildSelectionSet } from "@/lib/graphql/selection-set";
import type { FieldDef, NormalizedSchema, TypeRef } from "@/lib/graphql/type-ref";

export type GeneratedOperation = {
  name: string;
  kind: "query" | "mutation" | "subscription";
  graphql: string;
  variables: Record<string, unknown>;
};

function parseJsonLike(value: unknown): unknown {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  if (
    !(trimmed.startsWith("{") && trimmed.endsWith("}")) &&
    !(trimmed.startsWith("[") && trimmed.endsWith("]"))
  ) {
    return value;
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

function formatGraphqlLiteral(
  schema: NormalizedSchema,
  type: TypeRef | undefined,
  rawValue: unknown
): string {
  const value = parseJsonLike(rawValue);

  if (type?.kind === "NON_NULL") {
    return formatGraphqlLiteral(schema, type.ofType, value);
  }

  if (value === null || value === undefined) {
    return "null";
  }

  if (type?.kind === "LIST") {
    if (!Array.isArray(value)) {
      return `[${formatGraphqlLiteral(schema, type.ofType, value)}]`;
    }
    return `[${value.map((item) => formatGraphqlLiteral(schema, type.ofType, item)).join(", ")}]`;
  }

  if (type?.kind === "NAMED") {
    const namedType = schema.types[type.name];
    if (namedType?.kind === "ENUM") {
      if (typeof value === "string" && namedType.values.includes(value)) {
        return value;
      }
      return namedType.values[0] ?? "VALUE";
    }

    if (namedType?.kind === "INPUT_OBJECT") {
      if (!value || typeof value !== "object" || Array.isArray(value)) {
        return "{}";
      }

      const objectValue = value as Record<string, unknown>;
      const fields = namedType.inputFields.map((field) => {
        const fieldValue =
          field.name in objectValue
            ? objectValue[field.name]
            : exampleValueForType(schema, field.type);
        return `${field.name}: ${formatGraphqlLiteral(schema, field.type, fieldValue)}`;
      });

      return `{${fields.length ? ` ${fields.join(", ")} ` : ""}}`;
    }
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => formatGraphqlLiteral(schema, undefined, item)).join(", ")}]`;
  }

  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).map(
      ([key, nested]) => `${key}: ${formatGraphqlLiteral(schema, undefined, nested)}`
    );
    return `{${entries.length ? ` ${entries.join(", ")} ` : ""}}`;
  }

  if (typeof value === "string") {
    return JSON.stringify(value);
  }

  return String(value);
}

function buildOperationArgs(field: FieldDef): {
  variableDefinitions: string;
  argumentList: string;
} {
  if (!field.args.length) {
    return { variableDefinitions: "", argumentList: "" };
  }

  const pairs = field.args.map((arg) => {
    const value = exampleValueForType(schema, arg.type);
    return `${arg.name}: ${formatGraphqlLiteral(schema, arg.type, value)}`;
  });

function buildOperationVariables(
  schema: NormalizedSchema,
  field: FieldDef
): Record<string, unknown> {
  return Object.fromEntries(
    field.args.map((arg) => [arg.name, exampleValueForType(schema, arg.type)])
  );
}

function buildOperation(
  schema: NormalizedSchema,
  kind: "query" | "mutation" | "subscription",
  field: FieldDef
): GeneratedOperation {
  const args = buildOperationArgs(field);
  const variables = buildOperationVariables(schema, field);
  const selection = buildSelectionSet(schema, field.type);
  const opName =
    `${kind}_${field.name.charAt(0).toUpperCase()}${field.name.slice(1)}`;

  const graphql = `${kind} ${opName}${args.variableDefinitions} {
  ${field.name}${args.argumentList} ${selection}
}`;

  return {
    name: opName,
    kind,
    graphql,
    variables
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
