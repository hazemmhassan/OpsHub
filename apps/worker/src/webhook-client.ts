export class WebhookTransportError extends Error {
  constructor(
    readonly code: string,
    readonly retryable: boolean,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "WebhookTransportError";
  }
}

const permanentTlsCodes = new Set([
  "CERT_HAS_EXPIRED",
  "DEPTH_ZERO_SELF_SIGNED_CERT",
  "ERR_TLS_CERT_ALTNAME_INVALID",
  "SELF_SIGNED_CERT_IN_CHAIN",
  "UNABLE_TO_GET_ISSUER_CERT_LOCALLY",
  "UNABLE_TO_VERIFY_LEAF_SIGNATURE",
]);

export function classifyTransportError(error: unknown): WebhookTransportError {
  const name = error instanceof Error ? error.name : "";
  if (name === "AbortError" || name === "TimeoutError") {
    return new WebhookTransportError(
      "request_timeout",
      true,
      "The receiver did not respond before the timeout.",
      { cause: error },
    );
  }

  const cause = error instanceof Error ? error.cause : undefined;
  const causeCode =
    typeof cause === "object" &&
    cause !== null &&
    "code" in cause &&
    typeof cause.code === "string"
      ? cause.code
      : null;

  if (causeCode && permanentTlsCodes.has(causeCode)) {
    return new WebhookTransportError(
      "tls_validation_failed",
      false,
      "The receiver TLS certificate could not be validated.",
      { cause: error },
    );
  }

  return new WebhookTransportError(
    "network_error",
    true,
    "The receiver could not be reached.",
    { cause: error },
  );
}

type SendWebhookInput = {
  url: string;
  body: string;
  headers: Record<string, string>;
  timeoutMs: number;
};

const maximumResponseBytes = 65_536;

async function readBoundedResponse(response: Response): Promise<string> {
  const declaredLength = Number(response.headers.get("content-length"));
  if (
    Number.isFinite(declaredLength) &&
    declaredLength > maximumResponseBytes
  ) {
    throw new WebhookTransportError(
      "response_too_large",
      false,
      "The receiver response exceeded the allowed size.",
    );
  }

  if (!response.body) {
    return "";
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > maximumResponseBytes) {
      await reader.cancel();
      throw new WebhookTransportError(
        "response_too_large",
        false,
        "The receiver response exceeded the allowed size.",
      );
    }
    chunks.push(value);
  }

  return Buffer.concat(chunks).toString("utf8");
}

export async function sendWebhook(
  input: SendWebhookInput,
): Promise<{ status: number; body: string }> {
  try {
    const response = await fetch(input.url, {
      method: "POST",
      headers: input.headers,
      body: input.body,
      redirect: "manual",
      signal: AbortSignal.timeout(input.timeoutMs),
    });

    return {
      status: response.status,
      body: await readBoundedResponse(response),
    };
  } catch (error) {
    if (error instanceof WebhookTransportError) {
      throw error;
    }
    throw classifyTransportError(error);
  }
}
