import type { FieldPathSummary } from "./types";

interface CollectorEntry {
  sampleType: string;
  sampleValue: string;
  occurrenceCount: number;
}

export function extractFieldPaths(value: unknown) {
  const collector = new Map<string, CollectorEntry>();
  walk(value, "root", collector);

  return [...collector.entries()]
    .map(([fieldPath, entry]) => ({ fieldPath, ...entry }))
    .sort((first, second) => first.fieldPath.localeCompare(second.fieldPath)) satisfies FieldPathSummary[];
}

function walk(value: unknown, path: string, collector: Map<string, CollectorEntry>) {
  if (Array.isArray(value)) {
    record(path, value, collector);
    value.forEach((item) => walk(item, `${path}[]`, collector));
    return;
  }

  if (value !== null && typeof value === "object") {
    record(path, value, collector);
    Object.entries(value as Record<string, unknown>).forEach(([key, child]) => {
      walk(child, path === "root" ? key : `${path}.${key}`, collector);
    });
    return;
  }

  record(path, value, collector);
}

function record(path: string, value: unknown, collector: Map<string, CollectorEntry>) {
  if (path === "root") return;

  const existing = collector.get(path);
  if (existing) {
    existing.occurrenceCount += 1;
    return;
  }

  collector.set(path, {
    sampleType: getType(value),
    sampleValue: summariseValue(value),
    occurrenceCount: 1
  });
}

function getType(value: unknown) {
  if (Array.isArray(value)) return "array";
  if (value === null) return "null";
  return typeof value;
}

function summariseValue(value: unknown) {
  if (value === null || value === undefined) return String(value);
  if (typeof value === "string") return value.slice(0, 120);
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return `[array:${value.length}]`;
  return "{object}";
}
