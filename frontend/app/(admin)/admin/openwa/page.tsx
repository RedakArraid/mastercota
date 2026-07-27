"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

type OpenWaSettings = {
  enabled: boolean;
  baseUrl: string;
  sessionId: string;
  hasApiKey: boolean;
  configured: boolean;
  source: "db" | "env" | "none";
  updatedAt: string | null;
};

type OpenWaStatus = {
  reachable: boolean;
  configured: boolean;
  message?: string;
  session?: {
    status?: string;
    phone?: string | null;
    connected?: boolean;
  };
};

export default function AdminOpenWaPage() {
  const [settings, setSettings] = useState<OpenWaSettings | null>(null);
  const [status, setStatus] = useState<OpenWaStatus | null>(null);
  const [form, setForm] = useState({
    enabled: false,
    baseUrl: "",
    apiKey: "",
    sessionId: "",
  });
  const [testPhone, setTestPhone] = useState("+225");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [{ openwa }, st] = await Promise.all([
        api<{ openwa: OpenWaSettings }>("/api/admin/openwa"),
        api<OpenWaStatus>("/api/admin/openwa/status").catch(() => ({
          reachable: false,
          configured: false,
          message: "Statut indisponible",
        })),
      ]);
      setSettings(openwa);
      setStatus(st);
      setForm({
        enabled: openwa.enabled,
        baseUrl: openwa.baseUrl || "",
        apiKey: "",
        sessionId: openwa.sessionId || "",
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Chargement impossible");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const { openwa } = await api<{ openwa: OpenWaSettings }>(
        "/api/admin/openwa",
        {
          method: "PATCH",
          body: JSON.stringify({
            enabled: form.enabled,
            baseUrl: form.baseUrl,
            sessionId: form.sessionId,
            ...(form.apiKey ? { apiKey: form.apiKey } : {}),
          }),
        }
      );
      setSettings(openwa);
      setForm((f) => ({ ...f, apiKey: "" }));
      toast.success("Configuration enregistrée");
      const st = await api<OpenWaStatus>("/api/admin/openwa/status");
      setStatus(st);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Échec enregistrement");
    } finally {
      setSaving(false);
    }
  }

  async function sendTest() {
    setTesting(true);
    try {
      const res = await api<{ message: string }>("/api/admin/openwa/test", {
        method: "POST",
        body: JSON.stringify({ phone: testPhone }),
      });
      toast.success(res.message);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Échec du test");
    } finally {
      setTesting(false);
    }
  }

  const sourceLabel =
    settings?.source === "db"
      ? "Base de données"
      : settings?.source === "env"
        ? "Variables d’environnement"
        : "Non configuré";

  const canTest = Boolean(
    settings?.configured && settings?.enabled && status?.session?.connected
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          WhatsApp / OTP (OpenWA)
        </h2>
        <p className="text-sm text-muted-foreground">
          Configurez la session utilisée pour envoyer les codes de connexion —
          comme sur Geneamap.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Intégration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-semibold">
              {loading
                ? "…"
                : settings?.enabled && settings?.configured
                  ? "Active"
                  : settings?.configured
                    ? "Configurée (off)"
                    : "Incomplète"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{sourceLabel}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Session WhatsApp
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-semibold">
              {status?.session?.connected
                ? "Connectée"
                : status?.session?.status || status?.message || "—"}
            </p>
            {status?.session?.phone && (
              <p className="mt-1 text-xs text-muted-foreground">
                +{status.session.phone}
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Mise à jour
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-semibold">
              {settings?.updatedAt
                ? new Date(settings.updatedAt).toLocaleString("fr-FR")
                : "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Connexion OpenWA</CardTitle>
          <CardDescription>
            URL API, clé et identifiant de session (créée après scan QR dans
            OpenWA). Laisser la clé vide pour conserver l’existante.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={save} className="max-w-xl space-y-4">
            <div className="flex items-center gap-3">
              <Switch
                checked={form.enabled}
                onCheckedChange={(enabled) => setForm({ ...form, enabled })}
                id="openwa-enabled"
              />
              <Label htmlFor="openwa-enabled">Activer l’envoi OTP WhatsApp</Label>
            </div>
            <div className="space-y-2">
              <Label htmlFor="baseUrl">URL de base</Label>
              <Input
                id="baseUrl"
                placeholder="http://openwa-api:2785"
                value={form.baseUrl}
                onChange={(e) =>
                  setForm({ ...form, baseUrl: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sessionId">Session ID</Label>
              <Input
                id="sessionId"
                placeholder="UUID ou nom de session"
                value={form.sessionId}
                onChange={(e) =>
                  setForm({ ...form, sessionId: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="apiKey">Clé API</Label>
                {settings?.hasApiKey && (
                  <Badge variant="secondary">déjà enregistrée</Badge>
                )}
              </div>
              <Input
                id="apiKey"
                type="password"
                autoComplete="new-password"
                placeholder="••••••••"
                value={form.apiKey}
                onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={saving}>
                {saving ? "Enregistrement…" : "Enregistrer"}
              </Button>
              <Button type="button" variant="outline" onClick={load}>
                Actualiser le statut
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Message de test</CardTitle>
          <CardDescription>
            Envoie un WhatsApp de test via la session configurée.
          </CardDescription>
        </CardHeader>
        <CardContent className="max-w-xl space-y-4">
          <div className="space-y-2">
            <Label htmlFor="testPhone">Numéro de test</Label>
            <Input
              id="testPhone"
              placeholder="+2250700000000"
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value)}
            />
          </div>
          {!canTest && (
            <p className="text-sm text-amber-700">
              { !settings?.configured
                ? "Complétez et enregistrez la configuration."
                : !settings?.enabled
                  ? "Activez OpenWA pour tester."
                  : "La session WhatsApp n’est pas connectée (scan QR côté OpenWA)." }
            </p>
          )}
          <Button onClick={sendTest} disabled={!canTest || testing}>
            {testing ? "Envoi…" : "Envoyer un test"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
