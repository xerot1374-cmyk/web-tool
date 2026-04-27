"use client";

import { useState } from "react";

type AdminUserRecord = {
  id: string;
  name: string;
  email: string;
  role: string;
  isAdmin: boolean;
  isBlocked: boolean;
  createdAt: string;
};

type AdminUsersManagerProps = {
  currentUserId: string;
  initialUsers: AdminUserRecord[];
};

export default function AdminUsersManager({
  currentUserId,
  initialUsers,
}: AdminUsersManagerProps) {
  const [users, setUsers] = useState(initialUsers);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runAction(userId: string, action: "block" | "unblock" | "delete") {
    setError(null);
    setPendingKey(`${userId}:${action}`);

    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { message?: string } | null;
        throw new Error(body?.message ?? "Action failed");
      }

      setUsers((currentUsers) => {
        if (action === "delete") {
          return currentUsers.filter((user) => user.id !== userId);
        }

        return currentUsers.map((user) =>
          user.id === userId ? { ...user, isBlocked: action === "block" } : user
        );
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setPendingKey(null);
    }
  }

  return (
    <section className="portal-panel">
      {error && (
        <div style={{ marginBottom: 16, padding: 12, border: "1px solid #f99", color: "#900" }}>
          {error}
        </div>
      )}

      <div style={{ display: "grid", gap: 16 }}>
        {users.map((user) => {
          const isCurrentUser = user.id === currentUserId;
          const blockAction = user.isBlocked ? "unblock" : "block";
          const isBlocking = pendingKey === `${user.id}:${blockAction}`;
          const isDeleting = pendingKey === `${user.id}:delete`;

          return (
            <article
              key={user.id}
              style={{
                border: "1px solid rgba(15, 23, 42, 0.12)",
                borderRadius: 20,
                padding: 20,
                background: "#fff",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 16,
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: "#111827" }}>{user.name}</div>
                  <div style={{ color: "#4b5563", marginTop: 4 }}>{user.email}</div>
                  <div style={{ color: "#6b7280", marginTop: 6 }}>
                    {user.role || "No job title"} - Created {new Date(user.createdAt).toLocaleDateString()}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-start" }}>
                  {user.isAdmin && (
                    <span
                      style={{
                        padding: "6px 10px",
                        borderRadius: 999,
                        background: "#dbeafe",
                        color: "#1d4ed8",
                        fontSize: 12,
                        fontWeight: 700,
                      }}
                    >
                      Admin
                    </span>
                  )}
                  {user.isBlocked && (
                    <span
                      style={{
                        padding: "6px 10px",
                        borderRadius: 999,
                        background: "#fee2e2",
                        color: "#b91c1c",
                        fontSize: 12,
                        fontWeight: 700,
                      }}
                    >
                      Blocked
                    </span>
                  )}
                  {isCurrentUser && (
                    <span
                      style={{
                        padding: "6px 10px",
                        borderRadius: 999,
                        background: "#ecfccb",
                        color: "#3f6212",
                        fontSize: 12,
                        fontWeight: 700,
                      }}
                    >
                      You
                    </span>
                  )}
                </div>
              </div>

              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 18 }}>
                <button
                  type="button"
                  onClick={() => runAction(user.id, blockAction)}
                  disabled={isCurrentUser || Boolean(pendingKey)}
                  style={{
                    padding: "10px 14px",
                    borderRadius: 10,
                    border: "1px solid #cbd5e1",
                    background: "#f8fafc",
                    cursor: isCurrentUser || pendingKey ? "not-allowed" : "pointer",
                  }}
                >
                  {isBlocking
                    ? user.isBlocked
                      ? "Unblocking..."
                      : "Blocking..."
                    : user.isBlocked
                      ? "Unblock account"
                      : "Block account"}
                </button>

                <button
                  type="button"
                  onClick={() => runAction(user.id, "delete")}
                  disabled={isCurrentUser || Boolean(pendingKey)}
                  style={{
                    padding: "10px 14px",
                    borderRadius: 10,
                    border: "1px solid #fecaca",
                    background: "#fef2f2",
                    color: "#b91c1c",
                    cursor: isCurrentUser || pendingKey ? "not-allowed" : "pointer",
                  }}
                >
                  {isDeleting ? "Deleting..." : "Delete account"}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
