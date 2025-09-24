import { getRedisPool } from "./redis-pool";
import logger from "./logger";

// Get client from the connection pool
export const getClient = async () => {
  const pool = getRedisPool();
  return await pool.getClient();
};

// For backward compatibility, provide a default client
export const client = new Proxy({}, {
  get: (target, prop) => {
    if (process.env.NODE_ENV === 'test') {
      // Return mock functions during testing
      return () => Promise.resolve(null);
    }
    // For non-test environments, delegate to the real client from pool
    return async (...args: any[]) => {
      const realClient = await getClient();
      return (realClient as any)[prop](...args);
    };
  }
}) as any;
