export type NamedKind =
  | "SCALAR"
  | "OBJECT"
  | "INTERFACE"
  | "UNION"
  | "ENUM"
  | "INPUT_OBJECT";

export type TypeRef =
  | { kind: "NAMED"; name: string; namedKind: NamedKind }
  | { kind: "LIST"; ofType: TypeRef }
  | { kind: "NON_NULL"; ofType: TypeRef };

export type InputValueDef = {
  name: string;
  type: TypeRef;
  defaultValue?: string | null;
};

export type FieldDef = {
  name: string;
  type: TypeRef;
  args: InputValueDef[];
};

export type TypeDef =
  | { kind: "SCALAR"; name: string }
  | { kind: "ENUM"; name: string; values: string[] }
  | { kind: "OBJECT"; name: string; fields: FieldDef[] }
  | { kind: "INTERFACE"; name: string; fields: FieldDef[] }
  | { kind: "UNION"; name: string; possibleTypes: string[] }
  | { kind: "INPUT_OBJECT"; name: string; inputFields: InputValueDef[] };

export type NormalizedSchema = {
  root: {
    queryType: string;
    mutationType?: string;
    subscriptionType?: string;
  };
  types: Record<string, TypeDef>;
};
