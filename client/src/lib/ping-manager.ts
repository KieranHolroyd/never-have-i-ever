export enum ConnectionStatus {
  CONNECTED = 'connected',
  CONNECTING = 'connecting',
  DISCONNECTED = 'disconnected',
  RECONNECTING = 'reconnecting'
}

export interface PingConfig {
  pingInterval: number; // ms between pings
  pongTimeout: number; // ms to wait for pong before considering ping failed
  maxRetries: number; // max failed pings before marking disconnected
  connectionTimeout: number; // ms without pong before marking disconnected
  retryDelay: number; // base delay between retries (exponential backoff)
  maxRetryDelay: number; // max delay between retries
}

const DEFAULT_CONFIG: PingConfig = {
  pingInterval: 1000, // 1 second
  pongTimeout: 5000, // 5 seconds
  maxRetries: 3,
  connectionTimeout: 10000, // 10 seconds
  retryDelay: 1000, // 1 second
  maxRetryDelay: 30000, // 30 seconds
};

export class PingManager {
  private socket: WebSocket | null = null;
  private config: PingConfig;
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private pongTimeout: ReturnType<typeof setTimeout> | null = null;
  private connectionCheckInterval: ReturnType<typeof setInterval> | null = null;

  // State
  private status: ConnectionStatus = ConnectionStatus.DISCONNECTED;
  private pingStartTime: number = 0;
  private lastPongTime: number = 0;
  private currentPing: number = 0;
  private pingHistory: number[] = [];
  private maxPingHistory = 10;
  private failedPingCount = 0;
  private retryCount = 0;
  private retryTimeout: ReturnType<typeof setTimeout> | null = null;

  // Callbacks
  private onStatusChange?: (status: ConnectionStatus) => void;
  private onPingUpdate?: (ping: number) => void;
  private onDisconnect?: () => void;

  constructor(config: Partial<PingConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Set the WebSocket instance to monitor
   */
  setSocket(socket: WebSocket | null): void {
    if (this.socket === socket) return;

    this.cleanup();
    this.socket = socket;

    if (socket) {
      this.startMonitoring();
    } else {
      this.setStatus(ConnectionStatus.DISCONNECTED);
    }
  }

  /**
   * Start ping monitoring
   */
  private startMonitoring(): void {
    this.failedPingCount = 0;
    this.retryCount = 0;
    this.lastPongTime = performance.now();
    this.setStatus(ConnectionStatus.CONNECTED);

    // Start periodic ping
    this.pingInterval = setInterval(() => {
      this.sendPing();
    }, this.config.pingInterval);

    // Start connection health check
    this.connectionCheckInterval = setInterval(() => {
      this.checkConnectionHealth();
    }, this.config.pingInterval);
  }

  /**
   * Stop all monitoring
   */
  private cleanup(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    if (this.pongTimeout) {
      clearTimeout(this.pongTimeout);
      this.pongTimeout = null;
    }
    if (this.connectionCheckInterval) {
      clearInterval(this.connectionCheckInterval);
      this.connectionCheckInterval = null;
    }
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }
  }

  /**
   * Send a ping and set timeout for pong response
   */
  private sendPing(): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return;
    }

    this.pingStartTime = performance.now();

    try {
      this.socket.send(JSON.stringify({ op: 'ping' }));

      // Set timeout for pong response
      this.pongTimeout = setTimeout(() => {
        this.handlePingTimeout();
      }, this.config.pongTimeout);

    } catch (error) {
      console.warn('Failed to send ping:', error);
      this.handlePingTimeout();
    }
  }

  /**
   * Handle pong message from server
   */
  handlePong(): void {
    if (this.pongTimeout) {
      clearTimeout(this.pongTimeout);
      this.pongTimeout = null;
    }

    const pingTime = performance.now() - this.pingStartTime;
    this.updatePingMeasurement(pingTime);
    this.lastPongTime = performance.now();
    this.failedPingCount = 0;
    this.retryCount = 0;

    if (this.status !== ConnectionStatus.CONNECTED) {
      this.setStatus(ConnectionStatus.CONNECTED);
    }
  }

  /**
   * Handle ping timeout (no pong received)
   */
  private handlePingTimeout(): void {
    this.failedPingCount++;

    if (this.failedPingCount >= this.config.maxRetries) {
      this.setStatus(ConnectionStatus.DISCONNECTED);
      this.onDisconnect?.();
      this.scheduleRetry();
    } else {
      // Continue with degraded connection status
      if (this.status === ConnectionStatus.CONNECTED) {
        this.setStatus(ConnectionStatus.RECONNECTING);
      }
    }
  }

  /**
   * Check overall connection health
   */
  private checkConnectionHealth(): void {
    const timeSinceLastPong = performance.now() - this.lastPongTime;

    if (timeSinceLastPong > this.config.connectionTimeout) {
      if (this.status !== ConnectionStatus.DISCONNECTED) {
        this.setStatus(ConnectionStatus.DISCONNECTED);
        this.onDisconnect?.();
        this.scheduleRetry();
      }
    }
  }

  /**
   * Schedule a retry with exponential backoff
   */
  private scheduleRetry(): void {
    if (this.retryTimeout) return; // Already scheduled

    const delay = Math.min(
      this.config.retryDelay * Math.pow(2, this.retryCount),
      this.config.maxRetryDelay
    );

    this.retryCount++;
    this.setStatus(ConnectionStatus.RECONNECTING);

    this.retryTimeout = setTimeout(() => {
      this.retryTimeout = null;
      // Note: Actual reconnection should be handled by the WebSocket manager
      // This just resets our state for when reconnection occurs
      this.failedPingCount = 0;
    }, delay);
  }

  /**
   * Update ping measurement with moving average
   */
  private updatePingMeasurement(newPing: number): void {
    this.pingHistory.push(newPing);
    if (this.pingHistory.length > this.maxPingHistory) {
      this.pingHistory.shift();
    }

    // Calculate weighted moving average (80% old + 20% new)
    if (this.currentPing === 0) {
      this.currentPing = newPing;
    } else {
      this.currentPing = this.currentPing * 0.8 + newPing * 0.2;
    }

    this.onPingUpdate?.(this.currentPing);
  }

  /**
   * Set connection status and notify listeners
   */
  private setStatus(status: ConnectionStatus): void {
    if (this.status !== status) {
      this.status = status;
      this.onStatusChange?.(status);
    }
  }

  /**
   * Get current connection status
   */
  getStatus(): ConnectionStatus {
    return this.status;
  }

  /**
   * Get current ping measurement
   */
  getPing(): number {
    return this.currentPing;
  }

  /**
   * Get ping statistics
   */
  getPingStats(): {
    current: number;
    average: number;
    min: number;
    max: number;
  } {
    const pings = this.pingHistory;
    if (pings.length === 0) {
      return { current: 0, average: 0, min: 0, max: 0 };
    }

    return {
      current: this.currentPing,
      average: pings.reduce((sum, ping) => sum + ping, 0) / pings.length,
      min: Math.min(...pings),
      max: Math.max(...pings),
    };
  }

  /**
   * Check if connection is healthy
   */
  isHealthy(): boolean {
    return this.status === ConnectionStatus.CONNECTED &&
           (performance.now() - this.lastPongTime) < this.config.connectionTimeout;
  }

  /**
   * Set event listeners
   */
  setCallbacks(callbacks: {
    onStatusChange?: (status: ConnectionStatus) => void;
    onPingUpdate?: (ping: number) => void;
    onDisconnect?: () => void;
  }): void {
    this.onStatusChange = callbacks.onStatusChange;
    this.onPingUpdate = callbacks.onPingUpdate;
    this.onDisconnect = callbacks.onDisconnect;
  }

  /**
   * Force disconnect (for cleanup)
   */
  disconnect(): void {
    this.cleanup();
    this.setStatus(ConnectionStatus.DISCONNECTED);
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<PingConfig>): void {
    this.config = { ...this.config, ...config };
  }
}