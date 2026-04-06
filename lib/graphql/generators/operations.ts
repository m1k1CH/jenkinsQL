import { exampleValueForType } from "@/lib/graphql/example-value";
import { buildSelectionSet } from "@/lib/graphql/selection-set";
import type { FieldDef, NormalizedSchema } from "@/lib/graphql/type-ref";

export type GeneratedOperation = {
  name: string;
  kind: "query" | "mutation" | "subscription";
  graphql: string;
  variables: Record<string, unknown>;
};

function toGraphqlType(type: FieldDef["type"]): string {
  if (type.kind === "NON_NULL") {
    return `${toGraphqlType(type.ofType)}!`;
  }

  if (type.kind === "LIST") {
    return `[${toGraphqlType(type.ofType)}]`;
  }

  return type.name;
}

function buildOperationArgs(field: FieldDef): {
  variableDefinitions: string;
  argumentList: string;
} {
  if (!field.args.length) {
    return { variableDefinitions: "", argumentList: "" };
  }

  const variableDefinitions = field.args
    .map((arg) => `$${arg.name}: ${toGraphqlType(arg.type)}`)
    .join(", ");

  const argumentList = field.args.map((arg) => `${arg.name}: $${arg.name}`).join(", ");

  return {
    variableDefinitions: `(${variableDefinitions})`,
    argumentList: `(${argumentList})`
  };
}

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
