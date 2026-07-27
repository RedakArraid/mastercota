"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { formatAmount } from "@/lib/format";

function FeeReturnInner() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const ref =
    searchParams.get("ref") ||
    searchParams.get("reference") ||
    searchParams.get("trxref");
  const [state, setState] = useState<"loading" | "ok" | "pending" | "error">(
    "loading"
  );
  const [message, setMessage] = useState("Vérification du paiement…");
  const [fee, setFee] = useState<number | null>(null);

  useEffect(() => {
    if (!ref) {
      setState("error");
      setMessage("Référence de paiement manquante");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const data = await api<{
          paystack_status?: string;
          payment?: {
            status: string;
            amount: string | number;
            purpose: string;
          };
        }>(`/api/platform-payments/verify/${encodeURIComponent(ref)}`);
        if (cancelled) return;
        if (data.payment?.amount != null) {
          setFee(Number(data.payment.amount));
        }
        if (
          data.paystack_status === "success" ||
          data.payment?.status === "paid"
        ) {
          setState("ok");
          setMessage(
            data.payment?.purpose === "extend"
              ? "Prolongation activée"
              : "Frais réglés — cotisation active"
          );
        } else {
          setState("pending");
          setMessage("Paiement en cours de confirmation…");
        }
      } catch (e) {
        if (cancelled) return;
        setState("error");
        setMessage(e instanceof Error ? e.message : "Vérification impossible");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ref]);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col justify-center gap-4 px-6 py-12 text-center">
      <h1 className="text-2xl font-extrabold text-ink">
        {state === "ok"
          ? "Paiement confirmé"
          : state === "error"
            ? "Paiement"
            : "Vérification…"}
      </h1>
      <p className="text-muted-foreground">{message}</p>
      {fee != null && state === "ok" ? (
        <p className="text-sm font-medium">{formatAmount(fee)}</p>
      ) : null}
      <div className="flex flex-col gap-2">
        {state === "ok" || state === "pending" ? (
          <Button asChild size="lg">
            <Link href={`/cotisation/${id}`}>Voir la cotisation</Link>
          </Button>
        ) : (
          <Button asChild size="lg" variant="secondary">
            <Link href={`/cotisation/${id}`}>Retour</Link>
          </Button>
        )}
        <Button asChild variant="ghost">
          <Link href="/home">Accueil</Link>
        </Button>
      </div>
    </div>
  );
}

export default function FeeReturnPage() {
  return (
    <Suspense
      fallback={
        <div className="py-20 text-center text-muted-foreground">
          Chargement…
        </div>
      }
    >
      <FeeReturnInner />
    </Suspense>
  );
}
