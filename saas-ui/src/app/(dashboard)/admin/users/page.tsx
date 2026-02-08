"use client";
import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";

type User = {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
  createdAt: string;
};

type UsersResponse = {
  users: User[];
  total: number;
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [actionMsg, setActionMsg] = useState("");
  const [roleModal, setRoleModal] = useState<User | null>(null);
  const [newRole, setNewRole] = useState("user");

  const limit = 20;

  const fetchUsers = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
    if (search) params.set("search", search);
    api<UsersResponse>(`/api/admin/users?${params}`)
      .then((data) => {
        setUsers(data.users);
        setTotal(data.total);
        setError("");
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [search, offset]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  function showMsg(msg: string) {
    setActionMsg(msg);
    setTimeout(() => setActionMsg(""), 3000);
  }

  async function handleSuspend(userId: string) {
    if (!confirm("Suspend this user?")) return;
    try {
      await api(`/api/admin/users/${userId}/suspend`, { method: "POST" });
      showMsg("User suspended");
      fetchUsers();
      setSelectedUser(null);
    } catch (e: unknown) {
      showMsg((e as Error).message);
    }
  }

  async function handleActivate(userId: string) {
    try {
      await api(`/api/admin/users/${userId}/activate`, { method: "POST" });
      showMsg("User activated");
      fetchUsers();
      setSelectedUser(null);
    } catch (e: unknown) {
      showMsg((e as Error).message);
    }
  }

  async function handleDelete(userId: string) {
    if (!confirm("Delete this user permanently? This cannot be undone.")) return;
    try {
      await api(`/api/admin/users/${userId}`, { method: "DELETE" });
      showMsg("User deleted");
      fetchUsers();
      setSelectedUser(null);
    } catch (e: unknown) {
      showMsg((e as Error).message);
    }
  }

  async function handleChangeRole() {
    if (!roleModal) return;
    try {
      await api(`/api/admin/users/${roleModal.id}/role`, { method: "POST", body: { role: newRole } });
      showMsg("Role updated");
      fetchUsers();
      setRoleModal(null);
      setSelectedUser(null);
    } catch (e: unknown) {
      showMsg((e as Error).message);
    }
  }

  const cardStyle = {
    background: "#111",
    border: "1px solid #222",
    borderRadius: "0.75rem",
    padding: "1.5rem",
  };

  const inputStyle = {
    padding: "0.75rem",
    borderRadius: "0.5rem",
    border: "1px solid #333",
    background: "#111",
    color: "#fff",
    fontSize: "0.875rem",
    boxSizing: "border-box" as const,
  };

  const btnPrimary = {
    padding: "0.5rem 1rem",
    borderRadius: "0.5rem",
    border: "none",
    background: "#fff",
    color: "#000",
    fontWeight: 600,
    cursor: "pointer",
    fontSize: "0.8rem",
  };

  const btnDanger = {
    padding: "0.5rem 1rem",
    borderRadius: "0.5rem",
    border: "none",
    background: "#ff6b6b",
    color: "#000",
    fontWeight: 600,
    cursor: "pointer",
    fontSize: "0.8rem",
  };

  const btnSecondary = {
    padding: "0.5rem 1rem",
    borderRadius: "0.5rem",
    border: "1px solid #333",
    background: "transparent",
    color: "#ccc",
    fontWeight: 500,
    cursor: "pointer",
    fontSize: "0.8rem",
  };

  const statusColor = (status: string) => {
    if (status === "active") return "#4ade80";
    if (status === "suspended") return "#ff6b6b";
    return "#fbbf24";
  };

  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  return (
    <div>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "2rem" }}>User Management</h1>

      {actionMsg && (
        <div style={{ background: "#113311", color: "#4ade80", padding: "0.75rem", borderRadius: "0.5rem", marginBottom: "1rem" }}>
          {actionMsg}
        </div>
      )}

      {error && (
        <div style={{ color: "#ff6b6b", padding: "0.75rem", background: "#1a0000", borderRadius: "0.5rem", marginBottom: "1rem" }}>
          Error: {error}
        </div>
      )}

      {/* Search bar */}
      <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.5rem", alignItems: "center" }}>
        <input
          type="text"
          placeholder="Search by email or name..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setOffset(0); }}
          style={{ ...inputStyle, flex: 1 }}
        />
        <div style={{ color: "#888", fontSize: "0.875rem", whiteSpace: "nowrap" }}>
          {total} user{total !== 1 ? "s" : ""} found
        </div>
      </div>

      {/* Role change modal */}
      {roleModal && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex",
          alignItems: "center", justifyContent: "center", zIndex: 100,
        }}>
          <div style={{ ...cardStyle, width: "400px" }}>
            <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "1rem" }}>
              Change Role for {roleModal.email}
            </h3>
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              style={{ ...inputStyle, width: "100%", marginBottom: "1rem" }}
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
              <button style={btnSecondary} onClick={() => setRoleModal(null)}>Cancel</button>
              <button style={btnPrimary} onClick={handleChangeRole}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* User detail panel */}
      {selectedUser && (
        <div style={{ ...cardStyle, marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
            <div>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "0.25rem" }}>
                {selectedUser.name || "Unnamed User"}
              </h3>
              <div style={{ color: "#888", fontSize: "0.875rem" }}>{selectedUser.email}</div>
            </div>
            <button style={btnSecondary} onClick={() => setSelectedUser(null)}>Close</button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
            <div>
              <div style={{ color: "#888", fontSize: "0.75rem", marginBottom: "0.25rem" }}>ID</div>
              <div style={{ fontSize: "0.8rem", fontFamily: "monospace" }}>{selectedUser.id}</div>
            </div>
            <div>
              <div style={{ color: "#888", fontSize: "0.75rem", marginBottom: "0.25rem" }}>Role</div>
              <div style={{ textTransform: "capitalize" }}>{selectedUser.role}</div>
            </div>
            <div>
              <div style={{ color: "#888", fontSize: "0.75rem", marginBottom: "0.25rem" }}>Status</div>
              <div style={{ color: statusColor(selectedUser.status), textTransform: "capitalize" }}>{selectedUser.status}</div>
            </div>
            <div>
              <div style={{ color: "#888", fontSize: "0.75rem", marginBottom: "0.25rem" }}>Created</div>
              <div style={{ fontSize: "0.875rem" }}>{new Date(selectedUser.createdAt).toLocaleDateString()}</div>
            </div>
          </div>

          <div style={{ display: "flex", gap: "0.5rem" }}>
            {selectedUser.status === "active" ? (
              <button style={btnDanger} onClick={() => handleSuspend(selectedUser.id)}>Suspend</button>
            ) : (
              <button style={btnPrimary} onClick={() => handleActivate(selectedUser.id)}>Activate</button>
            )}
            <button style={btnSecondary} onClick={() => { setRoleModal(selectedUser); setNewRole(selectedUser.role); }}>
              Change Role
            </button>
            <button style={btnDanger} onClick={() => handleDelete(selectedUser.id)}>Delete</button>
          </div>
        </div>
      )}

      {/* Users table */}
      {loading ? (
        <div style={{ color: "#888", padding: "2rem" }}>Loading...</div>
      ) : (
        <div style={cardStyle}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #222" }}>
                <th style={{ textAlign: "left", padding: "0.75rem", color: "#888", fontWeight: 500, fontSize: "0.8rem" }}>Email</th>
                <th style={{ textAlign: "left", padding: "0.75rem", color: "#888", fontWeight: 500, fontSize: "0.8rem" }}>Name</th>
                <th style={{ textAlign: "left", padding: "0.75rem", color: "#888", fontWeight: 500, fontSize: "0.8rem" }}>Role</th>
                <th style={{ textAlign: "left", padding: "0.75rem", color: "#888", fontWeight: 500, fontSize: "0.8rem" }}>Status</th>
                <th style={{ textAlign: "left", padding: "0.75rem", color: "#888", fontWeight: 500, fontSize: "0.8rem" }}>Created</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: "2rem", textAlign: "center", color: "#666" }}>
                    No users found
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr
                    key={u.id}
                    onClick={() => setSelectedUser(u)}
                    style={{
                      borderBottom: "1px solid #1a1a1a",
                      cursor: "pointer",
                      background: selectedUser?.id === u.id ? "#1a1a1a" : "transparent",
                    }}
                  >
                    <td style={{ padding: "0.75rem", fontSize: "0.875rem" }}>{u.email}</td>
                    <td style={{ padding: "0.75rem", fontSize: "0.875rem", color: u.name ? "#fafafa" : "#666" }}>
                      {u.name || "--"}
                    </td>
                    <td style={{ padding: "0.75rem", fontSize: "0.875rem", textTransform: "capitalize" }}>{u.role}</td>
                    <td style={{ padding: "0.75rem", fontSize: "0.875rem" }}>
                      <span style={{
                        color: statusColor(u.status),
                        background: u.status === "active" ? "#0a2a0a" : u.status === "suspended" ? "#2a0a0a" : "#2a2a0a",
                        padding: "0.2rem 0.5rem",
                        borderRadius: "0.25rem",
                        fontSize: "0.75rem",
                        textTransform: "capitalize",
                      }}>
                        {u.status}
                      </span>
                    </td>
                    <td style={{ padding: "0.75rem", fontSize: "0.875rem", color: "#888" }}>
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid #222" }}>
              <button
                style={{ ...btnSecondary, opacity: currentPage <= 1 ? 0.4 : 1 }}
                disabled={currentPage <= 1}
                onClick={() => setOffset(Math.max(0, offset - limit))}
              >
                Previous
              </button>
              <span style={{ color: "#888", fontSize: "0.875rem" }}>
                Page {currentPage} of {totalPages}
              </span>
              <button
                style={{ ...btnSecondary, opacity: currentPage >= totalPages ? 0.4 : 1 }}
                disabled={currentPage >= totalPages}
                onClick={() => setOffset(offset + limit)}
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
