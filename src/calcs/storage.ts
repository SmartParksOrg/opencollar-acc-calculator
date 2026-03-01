import type { Storage } from "../models/config";

export type StorageMetrics = {
  records_per_day: number;
  bytes_per_day: number;
  days_to_fill: number;
  messages_until_full: number;
};

export function calculateStorageUsage(storage: Storage, payloadBytes: number, reportIntervalS: number): StorageMetrics {
  const safeInterval = Math.max(1, reportIntervalS);
  const safePayload = Math.max(1, payloadBytes);

  const records_per_day = 86400 / safeInterval;
  const bytes_per_day = records_per_day * safePayload;
  const messages_until_full = storage.flash_bytes_available / safePayload;
  const days_to_fill = storage.flash_bytes_available / bytes_per_day;

  return {
    records_per_day,
    bytes_per_day,
    days_to_fill,
    messages_until_full
  };
}
