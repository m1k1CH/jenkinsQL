import type { NormalizedSchema, TypeRef } from "@/lib/graphql/type-ref";

export function exampleValueForType(
  schema: NormalizedSchema,
  type: TypeRef
): unknown {
  if (type.kind === "NON_NULL") {
    return exampleValueForType(schema, type.ofType);
  }

  if (type.kind === "LIST") {
    return [exampleValueForType(schema, type.ofType)];
  }

  const named = schema.types[type.name];
  if (!named) {
    return "test";
  }

  if (named.kind === "SCALAR") {
    switch (named.name) {
      case "ID":
        return "1";
      case "Int":
        return 1;
      case "Float":
        return 1.0;
      case "Boolean":
        return false;
      default:
        return "test";
    }
  }

  if (named.kind === "ENUM") {
    return named.values[0] ?? "VALUE";
  }

  if (named.kind === "INPUT_OBJECT") {
    const obj: Record<string, unknown> = {};
    for (const field of named.inputFields) {
      obj[field.name] = exampleValueForType(schema, field.type);
    }
    return obj;
  }

  return "test";
}
