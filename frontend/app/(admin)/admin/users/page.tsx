"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

type UserRow = {
  id: string;
  phone: string;
  name: string | null;
  role: string;
  cotisations_count: string | number;
  created_at: string;
  paystack_subaccount_id: string | null;
};

export default function AdminUsersPage() {
  const [q, setQ] = useState("");
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);

  async function load(search = q) {
    setLoading(true);
    try {
      const qs = search ? `?q=${encodeURIComponent(search)}` : "";
      const data = await api<{ users: UserRow[] }>(`/api/admin/users${qs}`);
      setUsers(data.users);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function setRole(id: string, role: "admin" | "user") {
    try {
      await api(`/api/admin/users/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ role }),
      });
      toast.success(role === "admin" ? "Admin promu" : "Rôle utilisateur");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Échec");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Utilisateurs</h2>
        <p className="text-sm text-muted-foreground">
          Comptes inscrits et rôles d’administration.
        </p>
      </div>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          load();
        }}
      >
        <Input
          placeholder="Rechercher nom ou téléphone…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <Button type="submit">Rechercher</Button>
      </form>
      <div className="overflow-x-auto rounded-lg border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-zinc-50 text-zinc-500">
            <tr>
              <th className="px-3 py-2">Téléphone</th>
              <th className="px-3 py-2">Nom</th>
              <th className="px-3 py-2">Rôle</th>
              <th className="px-3 py-2">Cotisations</th>
              <th className="px-3 py-2">Inscription</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">
                  Chargement…
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className="border-b last:border-0">
                  <td className="px-3 py-2 font-mono text-xs">{u.phone}</td>
                  <td className="px-3 py-2">{u.name || "—"}</td>
                  <td className="px-3 py-2">
                    <Badge variant={u.role === "admin" ? "default" : "secondary"}>
                      {u.role}
                    </Badge>
                  </td>
                  <td className="px-3 py-2">{u.cotisations_count}</td>
                  <td className="px-3 py-2 text-zinc-500">
                    {new Date(u.created_at).toLocaleDateString("fr-FR")}
                  </td>
                  <td className="px-3 py-2">
                    {u.role === "admin" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setRole(u.id, "user")}
                      >
                        Retirer admin
                      </Button>
                    ) : (
                      <Button size="sm" onClick={() => setRole(u.id, "admin")}>
                        Promouvoir
                      </Button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
