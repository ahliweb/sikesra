import { randomUUID } from "node:crypto";

export interface RequestLike {
  headers?: {
    get?: (name: string) => string | null;
  };
}

export function getOrCreateRequestId(request?: RequestLike): string {
  const inbound = request?.headers?.get?.("x-request-id")?.trim();
  if (inbound) return inbound;
  return randomUUID();
}
