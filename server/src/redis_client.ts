import { GlideClient } from "@valkey/valkey-glide";

// Lazy client initialization to avoid issues during testing
let clientInstance: any = null;

export const getClient = async () => {
  if (clientInstance) return clientInstance;

  // Parse VALKEY_URI (format: valkey://host:port)
  const valkeyUri = (Bun?.env?.VALKEY_URI as string) || "valkey://localhost:6379";
  const url = new URL(valkeyUri);

  clientInstance = await GlideClient.createClient({
    addresses: [{ host: url.hostname, port: parseInt(url.port) }],
  });

  return clientInstance;
};

// For backward compatibility, provide a default client
export const client = new Proxy({}, {
  get: (target, prop) => {
    if (process.env.NODE_ENV === 'test') {
      // Return mock functions during testing
      return () => Promise.resolve(null);
    }
    // For non-test environments, delegate to the real client
    return async (...args: any[]) => {
      const realClient = await getClient();
      return (realClient as any)[prop](...args);
    };
  }
}) as any;
