import {
  GraphQLSchema,
  isEnumType,
  isInputObjectType,
  isInterfaceType,
  isListType,
  isNonNullType,
  isObjectType,
  isScalarType,
  isUnionType,
  type GraphQLType
} from "graphql";
import type {
  FieldDef,
  InputValueDef,
  NamedKind,
  NormalizedSchema,
  TypeDef,
  TypeRef
} from "@/lib/graphql/type-ref";

function getNamedKind(type: GraphQLType): NamedKind {
  if (isScalarType(type)) return "SCALAR";
  if (isObjectType(type)) return "OBJECT";
  if (isInterfaceType(type)) return "INTERFACE";
  if (isUnionType(type)) return "UNION";
  if (isEnumType(type)) return "ENUM";
  return "INPUT_OBJECT";
}

function toTypeRef(type: GraphQLType): TypeRef {
  if (isNonNullType(type)) {
    return { kind: "NON_NULL", ofType: toTypeRef(type.ofType) };
  }

  if (isListType(type)) {
    return { kind: "LIST", ofType: toTypeRef(type.ofType) };
  }

  return {
    kind: "NAMED",
    name: type.name,
    namedKind: getNamedKind(type)
  };
}

function mapInputValue(value: any): InputValueDef {
  return {
    name: value.name,
    type: toTypeRef(value.type),
    defaultValue: value.defaultValue ?? null
  };
}

function mapField(field: any): FieldDef {
  return {
    name: field.name,
    type: toTypeRef(field.type),
    args: (field.args ?? []).map(mapInputValue)
  };
}

export function normalizeSchema(schema: GraphQLSchema): NormalizedSchema {
  const typeMap = schema.getTypeMap();
  const normalizedTypes: Record<string, TypeDef> = {};

  for (const [name, type] of Object.entries(typeMap)) {
    if (name.startsWith("__")) {
      continue;
    }

    if (isScalarType(type)) {
      normalizedTypes[name] = { kind: "SCALAR", name };
    } else if (isEnumType(type)) {
      normalizedTypes[name] = {
        kind: "ENUM",
        name,
        values: type.getValues().map((value) => value.name)
      };
    } else if (isObjectType(type)) {
      normalizedTypes[name] = {
        kind: "OBJECT",
        name,
        fields: Object.values(type.getFields()).map(mapField)
      };
    } else if (isInterfaceType(type)) {
      normalizedTypes[name] = {
        kind: "INTERFACE",
        name,
        fields: Object.values(type.getFields()).map(mapField)
      };
    } else if (isUnionType(type)) {
      normalizedTypes[name] = {
        kind: "UNION",
        name,
        possibleTypes: type.getTypes().map((t) => t.name)
      };
    } else if (isInputObjectType(type)) {
      normalizedTypes[name] = {
        kind: "INPUT_OBJECT",
        name,
        inputFields: Object.values(type.getFields()).map(mapInputValue)
      };
    }
  }

  const queryType = schema.getQueryType();
  if (!queryType) {
    throw new Error("Schema does not expose query type");
  }

  return {
    root: {
      queryType: queryType.name,
      mutationType: schema.getMutationType()?.name,
      subscriptionType: schema.getSubscriptionType()?.name
    },
    types: normalizedTypes
  };
}
