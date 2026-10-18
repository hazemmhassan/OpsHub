import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import test from "node:test";

const workflowPath = new URL(
  "./workflows/opshub-google-sheets.json",
  import.meta.url,
);

async function loadWorkflow() {
  return JSON.parse(await readFile(workflowPath, "utf8"));
}

const require = createRequire(import.meta.url);
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

async function runCodeNode(code, { input, rawBody, env = {} }) {
  const execute = new AsyncFunction("$input", "$env", "require", code);
  return execute.call(
    {
      helpers: {
        getBinaryDataBuffer: async () => Buffer.from(rawBody, "utf8"),
      },
    },
    { first: () => ({ json: input }) },
    env,
    require,
  );
}

const eventId = "11111111-1111-4111-8111-111111111111";
const timestamp = String(Math.floor(Date.now() / 1_000));
const secret = "opshub-test-signing-secret-with-32-chars";
const payload = {
  event_id: eventId,
  event_type: "request.approved",
  event_version: 1,
  occurred_at: "2026-12-18T10:00:00.000Z",
  request: {
    reference: "7K3M9Q2R8D",
    submitted_at: "2026-12-18T09:00:00.000Z",
    approved_at: "2026-12-18T10:00:00.000Z",
    submitted_locale: "en",
    requester_type: "individual",
    contact_name: "Synthetic Demo User",
    email: "demo@example.test",
    phone_e164: "+201000000000",
    country_code: "EG",
    preferred_contact_method: "email",
    company_name: null,
    job_title: null,
    company_website: null,
    service_category: "consulting",
    request_title: "Synthetic service request",
    description: "Synthetic portfolio demonstration data only.",
    desired_start_date: null,
  },
};

function signedWebhookInput(body = JSON.stringify(payload)) {
  const signature = createHmac("sha256", secret)
    .update(`${timestamp}.${body}`, "utf8")
    .digest("hex");
  return {
    input: {
      headers: {
        "idempotency-key":
          "request.approved:00000000-0000-4000-8000-000000000001",
        "x-opshub-event-id": eventId,
        "x-opshub-signature": `v1=${signature}`,
        "x-opshub-timestamp": timestamp,
      },
    },
    rawBody: body,
    env: {
      OPSHUB_WEBHOOK_SIGNING_SECRET: secret,
    },
  };
}

test("the importable workflow verifies raw input before the Google credential boundary", async () => {
  const workflow = await loadWorkflow();
  const nodeNames = workflow.nodes.map((node) => node.name);

  assert.deepEqual(nodeNames, [
    "Receive Approved Request",
    "Verify Signature and Event",
    "Map Destination Row",
    "Upsert Request by Reference",
    "Build Verified Success",
    "Return Verified Success",
  ]);
  assert.equal(
    workflow.connections["Receive Approved Request"].main[0][0].node,
    "Verify Signature and Event",
  );
  assert.equal(
    workflow.connections["Verify Signature and Event"].main[0][0].node,
    "Map Destination Row",
  );
  assert.equal(
    workflow.connections["Map Destination Row"].main[0][0].node,
    "Upsert Request by Reference",
  );
});

test("the Google Sheets effect is an idempotent upsert keyed only by request reference", async () => {
  const workflow = await loadWorkflow();
  const sheetNode = workflow.nodes.find(
    (node) => node.name === "Upsert Request by Reference",
  );

  assert.equal(sheetNode.type, "n8n-nodes-base.googleSheets");
  assert.equal(sheetNode.parameters.operation, "appendOrUpdate");
  assert.deepEqual(sheetNode.parameters.columns.matchingColumns, ["reference"]);
  assert.equal("credentials" in sheetNode, false);
});

test("the exported workflow contains no embedded signing secret or credential identifier", async () => {
  const workflowText = await readFile(workflowPath, "utf8");

  assert.doesNotMatch(workflowText, /replace_with|client_secret|private_key/i);
  assert.doesNotMatch(workflowText, /"credentials"\s*:/i);
  assert.match(workflowText, /OPSHUB_WEBHOOK_SIGNING_SECRET/);
});

test("the workflow verifier authenticates the exact raw bytes and validates the V1 event", async () => {
  const workflow = await loadWorkflow();
  const verifier = workflow.nodes.find(
    (node) => node.name === "Verify Signature and Event",
  );

  const result = await runCodeNode(
    verifier.parameters.jsCode,
    signedWebhookInput(),
  );

  assert.deepEqual(result, [{ json: payload }]);
});

test("the workflow verifier rejects a body changed after signing", async () => {
  const workflow = await loadWorkflow();
  const verifier = workflow.nodes.find(
    (node) => node.name === "Verify Signature and Event",
  );
  const signed = signedWebhookInput();
  signed.rawBody = signed.rawBody.replace(
    "Synthetic Demo User",
    "Changed User",
  );

  await assert.rejects(
    () => runCodeNode(verifier.parameters.jsCode, signed),
    /invalid_signature/,
  );
});

test("the workflow row mapper preserves E.164 phone text and emits only destination columns", async () => {
  const workflow = await loadWorkflow();
  const mapper = workflow.nodes.find(
    (node) => node.name === "Map Destination Row",
  );

  const result = await runCodeNode(mapper.parameters.jsCode, {
    input: payload,
    rawBody: "",
  });

  assert.deepEqual(result, [
    {
      json: {
        ...payload.request,
        phone_e164: "'+201000000000",
      },
    },
  ]);
});
