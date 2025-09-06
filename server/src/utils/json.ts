import { z } from "zod";

/**
 * Custom JSON wrapper with type safety and error handling
 */
export class SafeJSON {
  /**
   * Safely parse JSON string with type validation
   * @param jsonString - The JSON string to parse
   * @param schema - Zod schema for type validation
   * @returns Parsed and validated object
   * @throws Error if parsing or validation fails
   */
  static parse<T>(jsonString: string, schema: z.ZodType<T>): T {
    try {
      const parsed = JSON.parse(jsonString);
      return schema.parse(parsed);
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error(`Invalid JSON format: ${error.message}`);
      }
      throw new Error(`Type validation failed: ${(error as Error).message}`);
    }
  }

  /**
   * Safely stringify an object to JSON
   * @param obj - Object to stringify
   * @returns JSON string
   * @throws Error if stringification fails
   */
  static stringify(obj: unknown): string {
    try {
      return JSON.stringify(obj);
    } catch (error) {
      throw new Error(`JSON stringification failed: ${(error as Error).message}`);
    }
  }

  /**
   * Parse JSON with fallback value
   * @param jsonString - The JSON string to parse
   * @param schema - Zod schema for type validation
   * @param fallback - Fallback value if parsing fails
   * @returns Parsed object or fallback
   */
  static parseWithFallback<T>(
    jsonString: string,
    schema: z.ZodType<T>,
    fallback: T
  ): T {
    try {
      return this.parse(jsonString, schema);
    } catch (error) {
      console.warn(`JSON parsing failed, using fallback: ${(error as Error).message}`);
      return fallback;
    }
  }

  /**
   * Parse JSON from Valkey (handles null/undefined gracefully)
   * @param value - Value from Valkey (could be null)
   * @param schema - Zod schema for type validation
   * @returns Parsed object or null if value is null/undefined
   */
  static parseFromStorage<T>(
    value: string | null | undefined,
    schema: z.ZodType<T>
  ): T | null {
    if (value == null) {
      return null;
    }
    return this.parse(value, schema);
  }
}

/**
 * Type-safe Valkey operations with JSON serialization
 */
export class ValkeyJSON {
  /**
   * Get and parse JSON value from Valkey with type validation
   * @param client - Valkey client
   * @param key - Key to retrieve
   * @param schema - Zod schema for type validation
   * @returns Parsed object or null if key doesn't exist
   */
  static async get<T>(
    client: any,
    key: string,
    schema: z.ZodType<T>
  ): Promise<T | null> {
    const value = await client.get(key);
    return SafeJSON.parseFromStorage(value, schema);
  }

  /**
   * Set JSON value in Valkey with type validation
   * @param client - Valkey client
   * @param key - Key to set
   * @param value - Value to store (will be validated and serialized)
   * @param schema - Zod schema for type validation
   */
  static async set<T>(
    client: any,
    key: string,
    value: T,
    schema: z.ZodType<T>
  ): Promise<void> {
    // Validate the value first
    schema.parse(value);
    const jsonString = SafeJSON.stringify(value);
    await client.set(key, jsonString);
  }

  /**
   * Get with fallback - returns fallback if key doesn't exist or parsing fails
   * @param client - Valkey client
   * @param key - Key to retrieve
   * @param schema - Zod schema for type validation
   * @param fallback - Fallback value
   * @returns Parsed object or fallback
   */
  static async getWithFallback<T>(
    client: any,
    key: string,
    schema: z.ZodType<T>,
    fallback: T
  ): Promise<T> {
    try {
      const value = await client.get(key);
      return SafeJSON.parseFromStorage(value, schema) ?? fallback;
    } catch (error) {
      console.warn(`Failed to get ${key} from Valkey, using fallback: ${(error as Error).message}`);
      return fallback;
    }
  }
}
