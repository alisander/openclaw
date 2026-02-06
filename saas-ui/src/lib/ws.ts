"use client";

export type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
};

type WsCallbacks = {
  onMessage: (msg: ChatMessage) => void;
  onStatus: (status: "connected" | "disconnected" | "error") => void;
};

/**
 * WebSocket client for real-time chat with the assistant.
 * Connects through the SaaS API proxy.
 */
export class ChatWebSocket {
  private ws: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectDelay = 1000;

  constructor(
    private baseUrl: string,
    private token: string,
    private callbacks: WsCallbacks,
  ) {}

  connect(): void {
    const wsUrl = this.baseUrl.replace(/^http/, "ws") + "/api/chat/ws";
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      // Authenticate
      this.ws?.send(JSON.stringify({ type: "auth", token: this.token }));
      this.callbacks.onStatus("connected");
      this.reconnectDelay = 1000;
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data as string);
        if (data.type === "message") {
          this.callbacks.onMessage({
            role: data.role ?? "assistant",
            content: data.content,
            timestamp: data.timestamp ?? Date.now(),
          });
        }
      } catch {
        // Ignore parse errors
      }
    };

    this.ws.onerror = () => {
      this.callbacks.onStatus("error");
    };

    this.ws.onclose = () => {
      this.callbacks.onStatus("disconnected");
      this.scheduleReconnect();
    };
  }

  send(message: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: "message", content: message }));
    }
  }

  close(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    this.ws?.close();
    this.ws = null;
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
      this.reconnectDelay = Math.min(this.reconnectDelay * 1.5, 15000);
    }, this.reconnectDelay);
  }
}
