"use client";
import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

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

  const statusBadgeVariant = (status: string) => {
    if (status === "active") return "default" as const;
    if (status === "suspended") return "destructive" as const;
    return "secondary" as const;
  };

  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-8">User Management</h1>

      {actionMsg && (
        <div className="bg-emerald-950 text-emerald-400 px-4 py-3 rounded-md mb-4">
          {actionMsg}
        </div>
      )}

      {error && (
        <div className="bg-red-950 text-destructive px-4 py-3 rounded-md mb-4">
          Error: {error}
        </div>
      )}

      {/* Search bar */}
      <div className="flex gap-3 mb-6 items-center">
        <Input
          type="text"
          placeholder="Search by email or name..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setOffset(0); }}
          className="flex-1"
        />
        <span className="text-sm text-muted-foreground whitespace-nowrap">
          {total} user{total !== 1 ? "s" : ""} found
        </span>
      </div>

      {/* Role change modal */}
      <Dialog open={!!roleModal} onOpenChange={(open) => { if (!open) setRoleModal(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Role</DialogTitle>
            <DialogDescription>
              Update the role for {roleModal?.email}
            </DialogDescription>
          </DialogHeader>
          <Select value={newRole} onValueChange={setNewRole}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="user">User</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleModal(null)}>
              Cancel
            </Button>
            <Button onClick={handleChangeRole}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* User detail panel */}
      {selectedUser && (
        <Card className="mb-6">
          <CardHeader className="flex flex-row items-start justify-between">
            <div>
              <CardTitle className="text-lg">
                {selectedUser.name || "Unnamed User"}
              </CardTitle>
              <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setSelectedUser(null)}>
              Close
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4 mb-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">ID</p>
                <p className="text-sm font-mono">{selectedUser.id}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Role</p>
                <p className="capitalize">{selectedUser.role}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Status</p>
                <Badge variant={statusBadgeVariant(selectedUser.status)} className="capitalize">
                  {selectedUser.status}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Created</p>
                <p className="text-sm">{new Date(selectedUser.createdAt).toLocaleDateString()}</p>
              </div>
            </div>

            <Separator className="my-4" />

            <div className="flex gap-2">
              {selectedUser.status === "active" ? (
                <Button variant="destructive" size="sm" onClick={() => handleSuspend(selectedUser.id)}>
                  Suspend
                </Button>
              ) : (
                <Button size="sm" onClick={() => handleActivate(selectedUser.id)}>
                  Activate
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setRoleModal(selectedUser); setNewRole(selectedUser.role); }}
              >
                Change Role
              </Button>
              <Button variant="destructive" size="sm" onClick={() => handleDelete(selectedUser.id)}>
                Delete
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Users table */}
      {loading ? (
        <div className="p-8 text-muted-foreground">Loading...</div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No users found
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((u) => (
                    <TableRow
                      key={u.id}
                      onClick={() => setSelectedUser(u)}
                      className={`cursor-pointer ${
                        selectedUser?.id === u.id ? "bg-muted" : ""
                      }`}
                    >
                      <TableCell className="text-sm">{u.email}</TableCell>
                      <TableCell className={`text-sm ${u.name ? "" : "text-muted-foreground"}`}>
                        {u.name || "--"}
                      </TableCell>
                      <TableCell className="text-sm capitalize">{u.role}</TableCell>
                      <TableCell>
                        <Badge variant={statusBadgeVariant(u.status)} className="capitalize">
                          {u.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            {/* Pagination */}
            {totalPages > 1 && (
              <>
                <Separator />
                <div className="flex justify-between items-center p-4">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage <= 1}
                    onClick={() => setOffset(Math.max(0, offset - limit))}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage >= totalPages}
                    onClick={() => setOffset(offset + limit)}
                  >
                    Next
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
