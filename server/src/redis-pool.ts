import { RedisClient } from "bun";
import logger from "./logger";

export class ValkeyConnectionPool {
  private client: RedisClient | null = null;
  private healthy = false;

  constructor(private readonly url: string) {}

  async getClient(): Promise<RedisClient> {
    if (this.client && this.healthy) {
      return this.client;
    }
    await this.connect();
    return this.client!;
  }

  private async connect(): Promise<void> {
    logger.info(`Connecting to Valkey at ${this.url}`);
    this.client = new RedisClient(this.url);
    // PING throws if the server is unreachable — let it propagate.
    await this.client.ping();
    this.healthy = true;
    logger.info("Connected to Valkey");
  }

  async isHealthy(): Promise<boolean> {
    if (!this.client || !this.healthy) return false;
    try {
      const result = await this.client.ping();
      return result === "PONG";
    } catch {
      this.healthy = false;
      return false;
    }
  }

  async close(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.healthy = false;
      logger.info("Valkey connection closed");
    }
  }
}

let _pool: ValkeyConnectionPool | null = null;

export const getRedisPool = (): ValkeyConnectionPool => {
  if (!_pool) {
    const url = Bun.env.VALKEY_URI ?? "redis://localhost:6379";
    _pool = new ValkeyConnectionPool(url);
  }
  return _pool;
};

/**
 * Initialise and verify the Redis connection.
 * Throws (killing the process via the caller) if Redis is unreachable.
 */
export const initializeRedisPool = async (): Promise<void> => {
  const pool = getRedisPool();
  await pool.getClient(); // throws if unavailable
  logger.info("Redis pool initialised");
};

export const closeRedisPool = async (): Promise<void> => {
  if (_pool) {
    await _pool.close();
    _pool = null;
  }
};
