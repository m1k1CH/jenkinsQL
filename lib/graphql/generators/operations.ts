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

function buildArgs(schema: NormalizedSchema, field: FieldDef): string {
  if (!field.args.length) {
    return "";
  }

  const pairs = field.args.map((arg) => {
    const value = exampleValueForType(schema, arg.type);
    return `${arg.name}: ${formatArgValue(value)}`;
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
