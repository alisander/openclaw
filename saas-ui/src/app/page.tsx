import Link from "next/link";

export default function LandingPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", color: "#fafafa" }}>
      {/* Header */}
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "1rem 2rem",
          borderBottom: "1px solid #222",
        }}
      >
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700 }}>OpenClaw</h1>
        <nav style={{ display: "flex", gap: "1rem" }}>
          <Link href="/login" style={{ color: "#888", textDecoration: "none" }}>
            Log in
          </Link>
          <Link
            href="/signup"
            style={{
              background: "#fff",
              color: "#000",
              padding: "0.5rem 1rem",
              borderRadius: "0.5rem",
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            Get Started
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <main style={{ maxWidth: "800px", margin: "0 auto", padding: "6rem 2rem", textAlign: "center" }}>
        <h2 style={{ fontSize: "3rem", fontWeight: 800, lineHeight: 1.1, marginBottom: "1.5rem" }}>
          Your Personal AI Assistant
        </h2>
        <p style={{ fontSize: "1.25rem", color: "#888", marginBottom: "3rem", lineHeight: 1.6 }}>
          Connect your AI assistant to Gmail, Google Drive, Outlook, OneDrive, and 30+ messaging
          channels. Powered by the best AI models with 54+ skills.
        </p>
        <Link
          href="/signup"
          style={{
            background: "#fff",
            color: "#000",
            padding: "0.75rem 2rem",
            borderRadius: "0.5rem",
            textDecoration: "none",
            fontWeight: 600,
            fontSize: "1.1rem",
          }}
        >
          Start Free
        </Link>

        {/* Pricing */}
        <section style={{ marginTop: "6rem" }}>
          <h3 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: "2rem" }}>Pricing</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1.5rem" }}>
            {[
              { name: "Free", price: "$0", features: ["$0.50 in credits", "Web chat", "10 skills", "5 sessions"] },
              { name: "Starter", price: "$15/mo", features: ["$7 in credits", "+WhatsApp, Telegram", "30 skills", "20 sessions"] },
              { name: "Pro", price: "$40/mo", features: ["$20 in credits", "All channels", "All skills", "Unlimited sessions"] },
            ].map((plan) => (
              <div
                key={plan.name}
                style={{
                  border: "1px solid #333",
                  borderRadius: "0.75rem",
                  padding: "1.5rem",
                  textAlign: "left",
                }}
              >
                <h4 style={{ fontSize: "1.25rem", marginBottom: "0.5rem" }}>{plan.name}</h4>
                <p style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "1rem" }}>{plan.price}</p>
                <ul style={{ listStyle: "none", padding: 0, color: "#888" }}>
                  {plan.features.map((f) => (
                    <li key={f} style={{ marginBottom: "0.5rem" }}>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
