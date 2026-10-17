import { DeliveryRepositoryError } from "./supabase-repository.js";

export function getSafeWorkerErrorCode(error: unknown): string {
  return error instanceof DeliveryRepositoryError
    ? error.message
    : "unknown_worker_error";
}
