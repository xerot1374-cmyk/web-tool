"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    setLoading(false);

    if (!res.ok) {
      setError("username یا password اشتباهه");
      return;
    }

    router.push("/account");
  }

  return (
    <div style={{ maxWidth: 420, margin: "64px auto", padding: 16 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 16 }}>Login</h1>

      {error && (
        <div style={{ padding: 10, border: "1px solid #f99", marginBottom: 12 }}>
          {error}
        </div>
      )}

      <form onSubmit={onSubmit}>
        <div style={{ marginBottom: 10 }}>
          <input
            placeholder="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={{ width: "100%", padding: 10 }}
          />
        </div>

        <div style={{ marginBottom: 12 }}>
          <input
            placeholder="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: "100%", padding: 10 }}
          />
        </div>

        <button type="submit" disabled={loading} style={{ width: "100%", padding: 10 }}>
          {loading ? "..." : "Login"}
        </button>
      </form>
    </div>
  );
}
