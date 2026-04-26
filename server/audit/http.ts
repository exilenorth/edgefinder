import { createId } from "./auditDb";
import type { AuditProvider, AuditRequestRecord } from "./types";

export interface AuditFetchOptions {
  runId: string;
  provider: AuditProvider;
  baseUrl: string;
  endpoint: string;
  params: Record<string, string | number | boolean | undefined>;
  headers?: Record<string, string>;
  redactParams?: string[];
}

export async function auditFetchJson(options: AuditFetchOptions): Promise<{ record: AuditRequestRecord; json?: unknown }> {
  const url = new URL(`${options.baseUrl}${options.endpoint}`);
  Object.entries(options.params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });

  const started = Date.now();
  try {
    const response = await fetch(url, { headers: options.headers });
    const text = await response.text();
    let json: unknown;

    try {
      json = text ? JSON.parse(text) : undefined;
    } catch {
      json = { raw: text };
    }

    const record: AuditRequestRecord = {
      id: createId("request"),
      runId: options.runId,
      provider: options.provider,
      endpoint: options.endpoint,
      params: redactParams(options.params, options.redactParams ?? []),
      statusCode: response.status,
      success: response.ok,
      errorMessage: response.ok ? undefined : `HTTP ${response.status}`,
      durationMs: Date.now() - started,
      fetchedAt: Date.now(),
      response: json
    };

    return { record, json };
  } catch (error) {
    const record: AuditRequestRecord = {
      id: createId("request"),
      runId: options.runId,
      provider: options.provider,
      endpoint: options.endpoint,
      params: redactParams(options.params, options.redactParams ?? []),
      success: false,
      errorMessage: error instanceof Error ? error.message : String(error),
      durationMs: Date.now() - started,
      fetchedAt: Date.now()
    };

    return { record };
  }
}

export function getEnvelopeResultCount(json: unknown) {
  if (!json || typeof json !== "object") return undefined;
  const result = (json as { results?: unknown }).results;
  return typeof result === "number" ? result : undefined;
}

export function getEnvelopeResponse<T = unknown>(json: unknown): T | undefined {
  if (!json || typeof json !== "object") return undefined;
  return (json as { response?: T }).response;
}

export function hasApiFootballErrors(json: unknown) {
  if (!json || typeof json !== "object") return false;
  const errors = (json as { errors?: unknown }).errors;
  if (Array.isArray(errors)) return errors.length > 0;
  if (errors && typeof errors === "object") return Object.keys(errors).length > 0;
  return false;
}

export function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function redactParams(params: Record<string, string | number | boolean | undefined>, keys: string[]) {
  return Object.fromEntries(
    Object.entries(params).map(([key, value]) => [key, keys.includes(key) ? "[redacted]" : value])
  );
}
