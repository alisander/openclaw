"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { api } from "@/lib/api";

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
};

export function ChatView() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(scrollToBottom, [messages, scrollToBottom]);

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return;

    setMessages((prev) => [...prev, { role: "user", content: text, timestamp: Date.now() }]);
    setInput("");
    setLoading(true);

    try {
      const data = await api<{ result: unknown }>("/api/assistant/message", {
        method: "POST",
        body: { message: text },
      });
      const content =
        typeof data.result === "string" ? data.result : JSON.stringify(data.result, null, 2);
      setMessages((prev) => [...prev, { role: "assistant", content, timestamp: Date.now() }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Error: ${err instanceof Error ? err.message : "Unknown error"}`,
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ flex: 1, overflow: "auto", padding: "1rem" }}>
        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              marginBottom: "0.75rem",
              padding: "0.75rem 1rem",
              borderRadius: "0.75rem",
              maxWidth: "80%",
              marginLeft: msg.role === "user" ? "auto" : 0,
              marginRight: msg.role === "user" ? 0 : "auto",
              background: msg.role === "user" ? "#1a3a5c" : "#1a1a1a",
              border: msg.role === "user" ? "none" : "1px solid #222",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            {msg.content}
          </div>
        ))}
        {loading && (
          <div
            style={{
              padding: "0.75rem 1rem",
              borderRadius: "0.75rem",
              background: "#1a1a1a",
              border: "1px solid #222",
              color: "#666",
              maxWidth: "80%",
            }}
          >
            Thinking...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <div style={{ padding: "0.75rem", borderTop: "1px solid #222", display: "flex", gap: "0.5rem" }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          disabled={loading}
          style={{
            flex: 1,
            padding: "0.5rem 0.75rem",
            borderRadius: "0.375rem",
            border: "1px solid #333",
            background: "#111",
            color: "#fff",
            outline: "none",
          }}
        />
        <button
          onClick={() => sendMessage(input)}
          disabled={loading || !input.trim()}
          style={{
            padding: "0.5rem 1rem",
            borderRadius: "0.375rem",
            border: "none",
            background: "#fff",
            color: "#000",
            fontWeight: 600,
            cursor: loading ? "wait" : "pointer",
            opacity: loading || !input.trim() ? 0.5 : 1,
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}
