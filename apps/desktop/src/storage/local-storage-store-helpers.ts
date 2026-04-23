import type { ZodTypeAny } from "zod";
import { localStorageAdapter } from "./local-storage-adapter.ts";
import {
  createSerializeFailed,
  createUnexpectedWriteError,
  createValidationFailed,
  storageWriteOk,
  type StorageEntity,
  type StorageWriteResult,
} from "./storage-result.ts";

export function persistValidatedEntity<T>({
  entity,
  target,
  key,
  value,
  schema,
}: {
  entity: StorageEntity;
  target: string;
  key: string;
  value: T;
  schema: ZodTypeAny;
}): StorageWriteResult {
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    return {
      ok: false,
      error: createValidationFailed(entity, target, parsed.error.issues),
    };
  }

  let serialized: string;
  try {
    serialized = JSON.stringify(parsed.data);
  } catch (error) {
    return {
      ok: false,
      error: createSerializeFailed(entity, target, error),
    };
  }

  try {
    localStorageAdapter.setItem(key, serialized);
  } catch (error) {
    return {
      ok: false,
      error: createUnexpectedWriteError(entity, target, error),
    };
  }

  return storageWriteOk();
}
