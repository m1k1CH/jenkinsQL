export function toJsonBody(graphql: string) {
  return JSON.stringify(
    {
      query: graphql,
      variables: {}
    },
    null,
    2
  );
}

export function toRawHttpRequest(
  host: string,
  path: string,
  graphql: string
): string {
  const body = JSON.stringify({
    query: graphql,
    variables: {}
  });

  return `POST ${path} HTTP/1.1
Host: ${host}
Content-Type: application/json
Accept: application/json
Connection: close

${body}`;
}

export function toGetRequest(
  host: string,
  path: string,
  graphql: string
): string {
  const url = `${path}?query=${encodeURIComponent(graphql)}`;

  return `GET ${url} HTTP/1.1
Host: ${host}
Accept: application/json
Connection: close
`;
}
