import { RedisClient } from "bun";
import logger from "./logger";

export interface RedisConnectionPool {
  getClient(): Promise<RedisClient>;
  isHealthy(): Promise<boolean>;
  close(): Promise<void>;
}

export class ValkeyConnectionPool implements RedisConnectionPool {
  private client: RedisClient | null = null;
  private isConnected = false;
  private connectionAttempts = 0;
  private maxRetries = 3;
  private retryDelay = 1000; // 1 second

  constructor(
    private config: {
      url: string;
      maxRetries?: number;
      retryDelay?: number;
    }
  ) {
    this.maxRetries = config.maxRetries || 3;
    this.retryDelay = config.retryDelay || 1000;
  }

  async getClient(): Promise<RedisClient> {
    if (this.client && this.isConnected) {
      return this.client;
    }

    await this.connect();
    return this.client!;
  }

  private async connect(): Promise<void> {
    if (this.connectionAttempts >= this.maxRetries) {
      throw new Error(`Failed to connect to Valkey after ${this.maxRetries} attempts`);
    }

    this.connectionAttempts++;

    try {
      logger.info(`Attempting to connect to Valkey at ${this.config.url} (attempt ${this.connectionAttempts})`);
      
      this.client = new RedisClient(this.config.url);
      
      // Test the connection with a PING
      await this.client.ping();

      this.isConnected = true;
      this.connectionAttempts = 0; // Reset on successful connection
      
      logger.info("Successfully connected to Valkey");
    } catch (error) {
      logger.error(`Failed to connect to Valkey (attempt ${this.connectionAttempts}): ${(error as Error).message}`);
      
      if (this.connectionAttempts < this.maxRetries) {
        logger.info(`Retrying connection in ${this.retryDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
        return this.connect();
      }
      
      throw error;
    }
  }

  async isHealthy(): Promise<boolean> {
    try {
      if (!this.client || !this.isConnected) {
        return false;
      }
      
      // Simple ping to check if connection is alive
      const result = await this.client.ping();
      return result === "PONG";
    } catch (error) {
      logger.warn(`Valkey health check failed: ${(error as Error).message}`);
      this.isConnected = false;
      return false;
    }
  }

  async close(): Promise<void> {
    try {
      if (this.client) {
        await this.client.close();
        this.client = null;
        this.isConnected = false;
        logger.info("Valkey connection closed");
      }
    } catch (error) {
      logger.error(`Error closing Valkey connection: ${(error as Error).message}`);
    }
  }
}

export class KeyValueStoreFallback implements RedisConnectionPool {
  private store: Map<string, string> = new Map();

  constructor() {
    logger.info("Using in-memory key-value store fallback");
  }

  async getClient(): Promise<any> {
    return {
      get: async (key: string): Promise<string | null> => {
        return this.store.get(key) || null;
      },
      set: async (key: string, value: string): Promise<void> => {
        this.store.set(key, value);
      },
      del: async (...keys: string[]): Promise<number> => {
        let deleted = 0;
        for (const key of keys) {
          if (this.store.delete(key)) {
            deleted++;
          }
        }
        return deleted;
      },
      exists: async (...keys: string[]): Promise<number> => {
        return keys.filter(key => this.store.has(key)).length;
      },
      keys: async (pattern: string): Promise<string[]> => {
        // Simple pattern matching for in-memory store
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        return Array.from(this.store.keys()).filter(key => regex.test(key));
      },
      ping: async (): Promise<string> => {
        return "PONG";
      }
    };
  }

  async isHealthy(): Promise<boolean> {
    return true; // In-memory store is always "healthy"
  }

  async close(): Promise<void> {
    this.store.clear();
    logger.info("KeyValueStore fallback cleared");
  }
}

export class RedisPoolManager {
  private pool: RedisConnectionPool;
  private fallback: RedisConnectionPool;
  private usingFallback = false;

  constructor() {
    // Parse VALKEY_URI (format: redis://host:port or redis://user:pass@host:port)
    const valkeyUri = (Bun?.env?.VALKEY_URI as string) || "redis://localhost:6379";

    this.pool = new ValkeyConnectionPool({
      url: valkeyUri,
      maxRetries: 3,
      retryDelay: 1000
    });

    this.fallback = new KeyValueStoreFallback();
  }

  async getClient(): Promise<any> {
    try {
      if (!this.usingFallback) {
        const client = await this.pool.getClient();
        const isHealthy = await this.pool.isHealthy();
        
        if (isHealthy) {
          return client;
        } else {
          logger.warn("Valkey connection unhealthy, switching to fallback");
          this.usingFallback = true;
        }
      }
      
      return await this.fallback.getClient();
    } catch (error) {
      logger.error(`Failed to get Valkey client: ${(error as Error).message}`);
      
      if (!this.usingFallback) {
        logger.warn("Switching to KeyValueStore fallback due to Valkey error");
        this.usingFallback = true;
      }
      
      return await this.fallback.getClient();
    }
  }

  async isHealthy(): Promise<boolean> {
    if (this.usingFallback) {
      return await this.fallback.isHealthy();
    }
    
    try {
      return await this.pool.isHealthy();
    } catch (error) {
      logger.warn(`Valkey health check failed: ${(error as Error).message}`);
      return false;
    }
  }

  async close(): Promise<void> {
    try {
      await this.pool.close();
    } catch (error) {
      logger.error(`Error closing Valkey pool: ${(error as Error).message}`);
    }
    
    try {
      await this.fallback.close();
    } catch (error) {
      logger.error(`Error closing fallback: ${(error as Error).message}`);
    }
  }

  isUsingFallback(): boolean {
    return this.usingFallback;
  }
}

// Global instance
let poolManager: RedisPoolManager | null = null;

export const getRedisPool = (): RedisPoolManager => {
  if (!poolManager) {
    poolManager = new RedisPoolManager();
  }
  return poolManager;
};

export const initializeRedisPool = async (): Promise<void> => {
  const pool = getRedisPool();
  
  try {
    // Test the connection
    const client = await pool.getClient();
    await client.ping();
    
    if (pool.isUsingFallback()) {
      logger.warn("Valkey pool initialized with fallback mode");
    } else {
      logger.info("Valkey pool initialized successfully");
    }
  } catch (error) {
    logger.error(`Failed to initialize Valkey pool: ${(error as Error).message}`);
    throw error;
  }
};

export const closeRedisPool = async (): Promise<void> => {
  if (poolManager) {
    await poolManager.close();
    poolManager = null;
    logger.info("Valkey pool closed");
  }
};
