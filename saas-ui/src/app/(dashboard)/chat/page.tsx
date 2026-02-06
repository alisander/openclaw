"use client";

import { useState, useRef, useEffect } from "react";
import { api } from "@/lib/api";

type Message = {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
};

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = { role: "user", content: text, timestamp: Date.now() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const data = await api<{ result: unknown }>("/api/assistant/message", {
        method: "POST",
        body: { message: text },
      });
      const content =
        typeof data.result === "string"
          ? data.result
          : JSON.stringify(data.result, null, 2);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content, timestamp: Date.now() },
      ]);
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

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      {/* Messages */}
      <div style={{ flex: 1, overflow: "auto", padding: "1rem 2rem" }}>
        {messages.length === 0 && (
          <div style={{ textAlign: "center", color: "#555", marginTop: "4rem" }}>
            <h2 style={{ fontSize: "1.25rem", marginBottom: "0.5rem" }}>
              Welcome to OpenClaw
            </h2>
            <p>Send a message to start chatting with your AI assistant.</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              maxWidth: "700px",
              margin: msg.role === "user" ? "0.75rem 0 0.75rem auto" : "0.75rem auto 0.75rem 0",
              padding: "0.75rem 1rem",
              borderRadius: "0.75rem",
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
              maxWidth: "700px",
              margin: "0.75rem auto 0.75rem 0",
              padding: "0.75rem 1rem",
              borderRadius: "0.75rem",
              background: "#1a1a1a",
              border: "1px solid #222",
              color: "#666",
            }}
          >
            Thinking...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSend}
        style={{
          padding: "1rem 2rem",
          borderTop: "1px solid #222",
          display: "flex",
          gap: "0.75rem",
        }}
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          disabled={loading}
          style={{
            flex: 1,
            padding: "0.75rem 1rem",
            borderRadius: "0.5rem",
            border: "1px solid #333",
            background: "#111",
            color: "#fff",
            fontSize: "1rem",
            outline: "none",
          }}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          style={{
            padding: "0.75rem 1.5rem",
            borderRadius: "0.5rem",
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
      </form>
    </div>
  );
}
