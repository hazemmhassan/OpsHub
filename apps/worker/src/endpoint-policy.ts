type EndpointPolicy = {
  allowedOrigins: string[];
  allowInsecureLocal: boolean;
};

export function assertAllowedEndpoint(
  value: string,
  policy: EndpointPolicy,
): URL {
  let endpoint: URL;

  try {
    endpoint = new URL(value);
  } catch {
    throw new Error("invalid_endpoint_url");
  }

  if (
    endpoint.username ||
    endpoint.password ||
    endpoint.hash ||
    !["https:", "http:"].includes(endpoint.protocol)
  ) {
    throw new Error("invalid_endpoint_url");
  }

  if (endpoint.protocol !== "https:") {
    const localHosts = new Set([
      "127.0.0.1",
      "localhost",
      "host.docker.internal",
    ]);
    if (!policy.allowInsecureLocal || !localHosts.has(endpoint.hostname)) {
      throw new Error("endpoint_https_required");
    }
  }

  const allowedOrigins = policy.allowedOrigins.map((origin) => {
    const parsed = new URL(origin);
    if (parsed.href !== `${parsed.origin}/`) {
      throw new Error("invalid_allowed_origin");
    }
    return parsed.origin;
  });

  if (!allowedOrigins.includes(endpoint.origin)) {
    throw new Error("endpoint_not_allowlisted");
  }

  return endpoint;
}
