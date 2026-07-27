"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { formatAmount } from "@/lib/format";

type VerifyResult = {
  paystack_status: string;
  contribution: {
    amount: number;
    status: string;
    contributor_name: string;
    cotisation_title?: string;
    slug?: string;
  } | null;
};

function RetourInner() {
  const { slug } = useParams<{ slug: string }>();
  const search = useSearchParams();
  const ref =
    search.get("ref") ||
    search.get("reference") ||
    search.get("trxref") ||
    "";
  const [state, setState] = useState<"loading" | "ok" | "fail">("loading");
  const [data, setData] = useState<VerifyResult | null>(null);

  useEffect(() => {
    if (!ref) {
      setState("fail");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await api<VerifyResult>(
          `/api/paystack/verify/${encodeURIComponent(ref)}`
        );
        if (cancelled) return;
        setData(res);
        setState(
          res.paystack_status === "success" ||
            res.contribution?.status === "paid"
            ? "ok"
            : "fail"
        );
      } catch {
        if (!cancelled) setState("fail");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ref]);

  if (state === "loading") {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center px-6 py-20 text-center">
        <Loader2 className="size-10 animate-spin text-primary" />
        <h1 className="mt-6 text-2xl font-extrabold text-ink">
          Vérification du paiement…
        </h1>
        <p className="mt-2 text-muted-foreground">
          Merci de patienter quelques secondes.
        </p>
      </div>
    );
  }

  if (state === "ok") {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center px-6 py-16 text-center">
        <CheckCircle2 className="size-14 text-emerald-600" />
        <h1 className="mt-6 text-3xl font-extrabold text-ink">Merci !</h1>
        <p className="mt-3 text-muted-foreground">
          Votre contribution
          {data?.contribution?.amount
            ? ` de ${formatAmount(Number(data.contribution.amount))}`
            : ""}{" "}
          a bien été enregistrée
          {data?.contribution?.cotisation_title
            ? ` pour « ${data.contribution.cotisation_title} »`
            : ""}
          .
        </p>
        <div className="mt-8 flex w-full flex-col gap-2">
          <Button asChild size="lg">
            <Link href={`/c/${slug}`}>Retour à la cotisation</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/">Accueil Mastercota</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-6 py-16 text-center">
      <XCircle className="size-14 text-destructive" />
      <h1 className="mt-6 text-3xl font-extrabold text-ink">
        Paiement non confirmé
      </h1>
      <p className="mt-3 text-muted-foreground">
        Le paiement n&apos;a pas pu être validé. Vous pouvez réessayer ou
        revenir à la page de la cotisation.
      </p>
      <div className="mt-8 flex w-full flex-col gap-2">
        <Button asChild size="lg">
          <Link href={`/c/${slug}`}>Réessayer</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href="/">Accueil</Link>
        </Button>
      </div>
    </div>
  );
}

export default function PaymentReturnPage() {
  return (
    <Suspense
      fallback={
        <div className="py-20 text-center text-muted-foreground">
          Chargement…
        </div>
      }
    >
      <RetourInner />
    </Suspense>
  );
}
