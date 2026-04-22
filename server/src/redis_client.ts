import { getRedisPool } from "./redis-pool";

export const getClient = async () => getRedisPool().getClient();

// Proxy used by HttpService (ValkeyJSON helper) — delegates to real client.
export const client = new Proxy({} as any, {
  get: (_target, prop) => async (...args: any[]) => {
    const c = await getClient();
    return (c as any)[prop](...args);
  },
});
