export type GeneratorState = {
  host: string;
  path: string;
  introspectionResponse: string;
};

export const DEFAULT_STATE: GeneratorState = {
  host: "example.com",
  path: "/graphql",
  introspectionResponse: ""
};

const STORAGE_KEY = "graphql-burp-generator-state";

export function loadState(): GeneratorState {
  if (typeof window === "undefined") {
    return DEFAULT_STATE;
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return DEFAULT_STATE;
  }

  try {
    return { ...DEFAULT_STATE, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_STATE;
  }
}

export function saveState(state: GeneratorState) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
