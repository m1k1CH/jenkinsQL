import type { NormalizedSchema, TypeRef } from "@/lib/graphql/type-ref";

function unwrap(type: TypeRef): TypeRef {
  if (type.kind === "NON_NULL" || type.kind === "LIST") {
    return unwrap(type.ofType);
  }
  return type;
}

export function buildSelectionSet(schema: NormalizedSchema, type: TypeRef): string {
  const named = unwrap(type);

  if (named.kind !== "NAMED") {
    return "";
  }

  const typeDef = schema.types[named.name];
  if (!typeDef) {
    return "";
  }

  if (typeDef.kind === "SCALAR" || typeDef.kind === "ENUM") {
    return "";
  }

  if (typeDef.kind === "UNION") {
    return "{ __typename }";
  }

  if (typeDef.kind === "OBJECT" || typeDef.kind === "INTERFACE") {
    const preferred = typeDef.fields
      .map((field) => field.name)
      .filter((name) =>
        ["id", "name", "title", "slug", "email", "createdAt"].includes(name)
      );

    const fallback = typeDef.fields
      .map((field) => field.name)
      .filter((name) => !preferred.includes(name))
      .slice(0, 4);

    const selected = ["__typename", ...preferred, ...fallback]
      .filter((value, index, array) => array.indexOf(value) === index)
      .slice(0, 6);

    return `{ ${selected.join(" ")} }`;
  }

  return "{ __typename }";
}
