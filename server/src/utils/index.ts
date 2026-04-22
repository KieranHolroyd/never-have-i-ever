import { SafeJSON } from "./json";
import { z } from "zod";

export function deepCopy<T>(obj: T): T {
  const jsonString = SafeJSON.stringify(obj);
  return SafeJSON.parse(jsonString, z.any()) as T;
}

export function omitKeys<T extends Record<string, any>, K extends keyof T>(
  obj: T,
  keys: K[]
): Omit<T, K> {
  const result = { ...obj };
  keys.forEach(key => delete result[key]);
  return result;
}

export function validateRequiredParams(params: Record<string, any>, required: string[]): void {
  const missing = required.filter(key => !params[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required parameters: ${missing.join(", ")}`);
  }
}
