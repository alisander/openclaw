import WebSocket from "ws";

export type GatewayBridgeOptions = {
  gatewayUrl: string;
  authToken: string;
};

type PendingRequest = {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
};

/**
 * Bridges between the SaaS API and the OpenClaw gateway via WebSocket.
 * Each tenant gets a dedicated bridge for their chat sessions.
 */
export class GatewayBridge {
  private ws: WebSocket | null = null;
  private requestId = 0;
  private pending = new Map<number, PendingRequest>();
  private eventListeners = new Map<string, Set<(payload: unknown) => void>>();
  private connected = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectDelay = 800;

  constructor(private options: GatewayBridgeOptions) {}

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.options.gatewayUrl);

      this.ws.on("open", () => {
        // Send connect request
        this.send({
          type: "req",
          id: ++this.requestId,
          method: "connect",
          params: { token: this.options.authToken },
        });
      });

      this.ws.on("message", (data: WebSocket.Data) => {
        try {
          const frame = JSON.parse(data.toString());
          this.handleFrame(frame);
          if (frame.type === "event" && frame.event === "hello-ok") {
            this.connected = true;
            this.reconnectDelay = 800;
            resolve();
          }
        } catch {
          // Ignore parse errors
        }
      });

      this.ws.on("error", (err) => {
        if (!this.connected) {
          reject(err);
        }
      });

      this.ws.on("close", () => {
        this.connected = false;
        this.rejectAllPending();
        this.scheduleReconnect();
      });
    });
  }

  async request(method: string, params?: unknown): Promise<unknown> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error("Gateway not connected");
    }

    const id = ++this.requestId;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Gateway request timeout: ${method}`));
      }, 30_000);

      this.pending.set(id, { resolve, reject, timer });
      this.send({ type: "req", id, method, params });
    });
  }

  on(event: string, listener: (payload: unknown) => void): void {
    let listeners = this.eventListeners.get(event);
    if (!listeners) {
      listeners = new Set();
      this.eventListeners.set(event, listeners);
    }
    listeners.add(listener);
  }

  off(event: string, listener: (payload: unknown) => void): void {
    this.eventListeners.get(event)?.delete(listener);
  }

  close(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    this.rejectAllPending();
    this.ws?.close();
    this.ws = null;
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected;
  }

  private send(frame: unknown): void {
    this.ws?.send(JSON.stringify(frame));
  }

  private handleFrame(frame: { type: string; id?: number; ok?: boolean; payload?: unknown; error?: string; event?: string }): void {
    if (frame.type === "res" && frame.id !== undefined) {
      const pending = this.pending.get(frame.id);
      if (pending) {
        clearTimeout(pending.timer);
        this.pending.delete(frame.id);
        if (frame.ok) {
          pending.resolve(frame.payload);
        } else {
          pending.reject(new Error(frame.error ?? "Unknown gateway error"));
        }
      }
    } else if (frame.type === "event" && frame.event) {
      const listeners = this.eventListeners.get(frame.event);
      if (listeners) {
        for (const listener of listeners) {
          try {
            listener(frame.payload);
          } catch {
            // Ignore listener errors
          }
        }
      }
    }
  }

  private rejectAllPending(): void {
    for (const [, pending] of this.pending) {
      clearTimeout(pending.timer);
      pending.reject(new Error("Gateway connection lost"));
    }
    this.pending.clear();
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect().catch(() => {
        this.reconnectDelay = Math.min(this.reconnectDelay * 1.5, 15_000);
      });
    }, this.reconnectDelay);
  }
}
