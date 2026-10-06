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
  const [state, setState] = useState<"loading" | "ok" | "pending" | "error" | "failed" | "review" | "reviewed">(
    "loading"
  );
  const [message, setMessage] = useState("Vérification du paiement…");
  const [attempt, setAttempt] = useState(0);
  const [fee, setFee] = useState<number | null>(null);
  const [resolutionNote, setResolutionNote] = useState<string | null>(null);

  useEffect(() => { setAttempt(0); setFee(null); setResolutionNote(null); }, [ref]);

  useEffect(() => {
    setState("loading");
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
            application_status?: "pending" | "applied" | "review_required";
            review_reason?: string | null;
            review_resolved_at?: string | null;
            review_resolution_note?: string | null;
          };
        }>(`/api/platform-payments/verify/${encodeURIComponent(ref)}`);
        if (cancelled) return;
        if (data.payment?.amount != null) {
          setFee(Number(data.payment.amount));
        }
        if (
          data.payment?.status === "paid" && data.payment.application_status === "applied"
        ) {
          setState("ok");
          setMessage(
            data.payment?.purpose === "extend"
              ? "Prolongation activée"
              : "Frais réglés, cotisation active"
          );
        } else if (data.payment?.status === "paid" && data.payment.application_status === "review_required" && data.payment.review_resolved_at) {
          setState("reviewed");
          setResolutionNote(data.payment.review_resolution_note ?? null);
          setMessage("Le support a terminé l’examen de ce paiement. Le service n’a pas été appliqué par ce paiement. Suivez la conclusion du support avant d’effectuer un nouveau paiement.");
        } else if (data.payment?.status === "paid" && data.payment.application_status === "review_required") {
          setState("review");
          setMessage("Votre paiement a été reçu, mais le service n’a pas pu être appliqué. Ne payez pas une seconde fois. Contactez le support avec la référence ci-dessous pour régulariser ce paiement.");
        } else if (["failed", "abandoned", "reversed"].includes(data.paystack_status ?? "") || data.payment?.status === "failed") {
          setState("failed");
          setMessage("Paiement non effectué. Vous pouvez reprendre le paiement depuis la cotisation.");
        } else {
          setState("pending");
          setMessage(data.payment?.status === "paid" ? "Paiement reçu. L’application du service reste à confirmer : ne payez pas une seconde fois." : "Paiement en cours de confirmation…");
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
  }, [ref, attempt]);

  useEffect(() => {
    if (state !== "pending" || attempt >= 10) return;
    const timer = setTimeout(() => setAttempt(n => n + 1), 3000);
    return () => clearTimeout(timer);
  }, [state, attempt]);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col justify-center gap-4 px-6 py-12 text-center">
      <h1 className="text-2xl font-extrabold text-ink">
        {state === "ok"
          ? "Paiement confirmé"
          : state === "reviewed" ? "Examen terminé"
            : state === "review" ? "Paiement à régulariser"
            : state === "failed" ? "Paiement non effectué"
              : state === "error" ? "Paiement"
                : state === "pending" && attempt >= 10 ? "Confirmation en attente" : "Vérification…"}
      </h1>
      <p className="text-muted-foreground">{message}</p>
      {state === "reviewed" && resolutionNote ? <div className="rounded-xl bg-secondary/50 p-4 text-left text-sm"><p className="mb-2 font-medium">Conclusion du support</p><p className="whitespace-pre-wrap break-words">{resolutionNote}</p></div> : null}
      {state === "pending" && attempt >= 10 ? <p className="text-sm text-muted-foreground">La confirmation prend plus de temps que prévu. Vous pouvez revenir plus tard et vérifier à nouveau.</p> : null}
      {ref ? <p className="break-all text-xs text-muted-foreground">Référence : {ref}</p> : null}
      {fee != null && (state === "ok" || state === "review" || state === "reviewed") ? (
        <p className="text-sm font-medium">{formatAmount(fee)}</p>
      ) : null}
      <div className="flex flex-col gap-2">
        {state !== "ok" && state !== "loading" ? <Button onClick={() => { setState("loading"); setAttempt(n => n + 1); }}>Vérifier à nouveau</Button> : null}
        {state === "review" || state === "reviewed" ? <Button asChild><Link href="/profile#support">Contacter le support</Link></Button> : null}
        {state === "ok" || state === "pending" || state === "review" || state === "reviewed" || state === "failed" ? (
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
