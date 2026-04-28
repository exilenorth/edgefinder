import type { DatabaseConnection } from "../db/types";

export class ProviderRequestsRepository {
  constructor(private readonly db: DatabaseConnection) {}

  record(request: {
    provider: string;
    endpoint: string;
    requestKey: string;
    status: "success" | "failure";
    source?: string;
    error?: string;
    responseRef?: string;
    requestedAt?: number;
  }) {
    const requestedAt = request.requestedAt ?? Date.now();
    this.db.run(
      `INSERT OR REPLACE INTO provider_requests
        (id, provider, endpoint, request_key, status, source, error, requested_at, response_ref)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        stableId("provider-request", request.provider, request.endpoint, request.requestKey, String(requestedAt)),
        request.provider,
        request.endpoint,
        request.requestKey,
        request.status,
        request.source ?? null,
        request.error ?? null,
        requestedAt,
        request.responseRef ?? null
      ]
    );
  }
}

function stableId(...parts: string[]) {
  return parts.map((part) => part.toLowerCase().replace(/[^a-z0-9:_-]+/g, "-")).join(":");
}

