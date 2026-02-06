"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, setTokens } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await api<{
        accessToken: string;
        refreshToken: string;
      }>("/api/auth/login", {
        method: "POST",
        body: { email, password },
      });
      setTokens(data.accessToken, data.refreshToken);
      router.push("/chat");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = {
    width: "100%",
    padding: "0.75rem",
    borderRadius: "0.5rem",
    border: "1px solid #333",
    background: "#111",
    color: "#fff",
    fontSize: "1rem",
    boxSizing: "border-box" as const,
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0a0a0a",
        color: "#fafafa",
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{ width: "100%", maxWidth: "400px", padding: "2rem" }}
      >
        <h1 style={{ fontSize: "1.5rem", marginBottom: "2rem", textAlign: "center" }}>
          Log in to OpenClaw
        </h1>

        {error && (
          <div style={{ background: "#331111", color: "#ff6b6b", padding: "0.75rem", borderRadius: "0.5rem", marginBottom: "1rem" }}>
            {error}
          </div>
        )}

        <div style={{ marginBottom: "1rem" }}>
          <label style={{ display: "block", marginBottom: "0.5rem", color: "#888" }}>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={inputStyle}
          />
        </div>

        <div style={{ marginBottom: "1.5rem" }}>
          <label style={{ display: "block", marginBottom: "0.5rem", color: "#888" }}>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={inputStyle}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%",
            padding: "0.75rem",
            borderRadius: "0.5rem",
            border: "none",
            background: "#fff",
            color: "#000",
            fontSize: "1rem",
            fontWeight: 600,
            cursor: loading ? "wait" : "pointer",
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? "Logging in..." : "Log in"}
        </button>

        <p style={{ textAlign: "center", marginTop: "1.5rem", color: "#888" }}>
          Don&apos;t have an account?{" "}
          <Link href="/signup" style={{ color: "#fff" }}>
            Sign up
          </Link>
        </p>
      </form>
    </div>
  );
}
