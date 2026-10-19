import "server-only";

import { validateAiEnvironment } from "./environment";

export function getAiEnvironment() {
  return validateAiEnvironment({
    AI_INTAKE_ENABLED: process.env.AI_INTAKE_ENABLED,
    AI_SERVICE_URL: process.env.AI_SERVICE_URL,
    AI_INTERNAL_KEY: process.env.AI_INTERNAL_KEY,
  });
}

export function isAiIntakeEnabled(): boolean {
  try {
    return getAiEnvironment().AI_INTAKE_ENABLED;
  } catch {
    return false;
  }
}
