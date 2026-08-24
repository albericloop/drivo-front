"use client";

import { FormEvent, useMemo, useState } from "react";
import { DisplayItem, normalizeItems, parseShoppingList } from "@/lib/shopping";

type Status = "idle" | "loading" | "error" | "success";

function formatApiError(payload: unknown, status: number): string {
  if (payload && typeof payload === "object" && "detail" in payload) {
    const detail = (payload as { detail: unknown }).detail;
    if (typeof detail === "string") {
      return detail;
    }
    if (detail && typeof detail === "object") {
      return JSON.stringify(detail);
    }
  }
  return `L'API a renvoyé une erreur (${status}).`;
}

function Barcode({ code }: { code: string }) {
  const bars = useMemo(() => {
    const digits = code.padEnd(13, "0").slice(0, 13);
    return digits.split("").flatMap((digit, index) => {
      const n = Number(digit);
      const width = 1 + (n % 3);
      const gap = 1 + ((n + index) % 2);
      return [
        { key: `${index}-bar`, type: "bar" as const, width },
        { key: `${index}-gap`, type: "gap" as const, width: gap },
      ];
    });
  }, [code]);

  return (
    <div className="mt-3 rounded-xl bg-[#f7f3ea] px-3 py-2">
      <div className="flex h-10 items-end gap-px" aria-hidden>
        {bars.map((part) => (
          <span
            key={part.key}
            className={part.type === "bar" ? "bg-[#1a1916]" : "bg-transparent"}
            style={{ width: part.width, height: part.type === "bar" ? "100%" : "70%" }}
          />
        ))}
      </div>
      <p className="mt-1 text-center font-mono text-sm tracking-[0.28em] text-[#1a1916]">
        {code}
      </p>
    </div>
  );
}

export default function HomePage() {
  const [people, setPeople] = useState(2);
  const [list, setList] = useState("pâtes\ntomates\nbasilic\nparmesan");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [items, setItems] = useState<DisplayItem[]>([]);

  const parsed = parseShoppingList(list);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (people < 1) {
      setStatus("error");
      setError("Indiquez au moins une personne.");
      return;
    }

    if (parsed.length === 0) {
      setStatus("error");
      setError("Ajoutez au moins un produit ou une recette.");
      return;
    }

    setStatus("loading");

    try {
      const response = await fetch("/api/generate-shopping-list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ p: people, c: parsed }),
      });

      const payload = await response.json();

      if (!response.ok) {
        setStatus("error");
        setError(formatApiError(payload, response.status));
        return;
      }

      const nextItems = normalizeItems(payload);
      setItems(nextItems);
      setStatus("success");
    } catch {
      setStatus("error");
      setError("Impossible de contacter l'API Drivo.");
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-5 py-8 sm:px-8 sm:py-12">
      <header className="mb-10 flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium tracking-[0.22em] text-[#1f6b45] uppercase">
            Liste intelligente
          </p>
          <h1
            className="mt-1 text-5xl tracking-tight text-[#1a1916] sm:text-6xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Drivo
          </h1>
        </div>
        <p className="hidden max-w-xs text-right text-sm leading-6 text-[#5e5a52] sm:block">
          Entrez vos produits ou recettes, le nombre de convives, et récupérez les articles identifiés.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <form
          onSubmit={onSubmit}
          className="rounded-3xl border border-[#d8d0c2] bg-[#fffdf8] p-6 shadow-[0_20px_50px_rgba(26,25,22,0.06)] sm:p-8"
        >
          <label className="block text-sm font-semibold text-[#1a1916]">
            Nombre de personnes
          </label>
          <div className="mt-3 flex items-center gap-3">
            <button
              type="button"
              onClick={() => setPeople((value) => Math.max(1, value - 1))}
              className="h-11 w-11 rounded-full border border-[#d8d0c2] text-xl leading-none transition hover:border-[#1f6b45]"
              aria-label="Diminuer"
            >
              −
            </button>
            <input
              type="number"
              min={1}
              value={people}
              onChange={(event) => setPeople(Number(event.target.value) || 1)}
              className="h-11 w-20 rounded-2xl border border-[#d8d0c2] bg-white text-center text-lg outline-none focus:border-[#1f6b45]"
            />
            <button
              type="button"
              onClick={() => setPeople((value) => value + 1)}
              className="h-11 w-11 rounded-full border border-[#d8d0c2] text-xl leading-none transition hover:border-[#1f6b45]"
              aria-label="Augmenter"
            >
              +
            </button>
          </div>

          <label htmlFor="list" className="mt-7 block text-sm font-semibold text-[#1a1916]">
            Liste de courses
          </label>
          <p className="mt-1 text-sm text-[#5e5a52]">
            Un produit ou une recette par ligne.
          </p>
          <textarea
            id="list"
            value={list}
            onChange={(event) => setList(event.target.value)}
            rows={10}
            className="mt-3 w-full resize-y rounded-2xl border border-[#d8d0c2] bg-white px-4 py-3 text-base leading-7 outline-none focus:border-[#1f6b45]"
            placeholder={"pâtes\nsauce tomate\nsalade César"}
          />

          <button
            type="submit"
            disabled={status === "loading"}
            className="mt-6 w-full rounded-full bg-[#1f6b45] px-5 py-3.5 text-base font-semibold text-white transition hover:bg-[#154e32] disabled:cursor-wait disabled:opacity-70"
          >
            {status === "loading" ? "Génération en cours…" : "Générer la liste"}
          </button>

          {status === "error" ? (
            <p className="mt-4 rounded-2xl bg-[#fde8e4] px-4 py-3 text-sm text-[#9b2c16]">
              {error}
            </p>
          ) : null}
        </form>

        <section className="rounded-3xl border border-[#d8d0c2] bg-[#fffdf8]/80 p-6 sm:p-8">
          <div className="mb-5 flex items-baseline justify-between gap-3">
            <h2
              className="text-2xl text-[#1a1916]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Articles
            </h2>
            {status === "success" ? (
              <span className="text-sm text-[#5e5a52]">
                {items.length} résultat{items.length > 1 ? "s" : ""}
              </span>
            ) : null}
          </div>

          {status === "idle" ? (
            <p className="text-[#5e5a52]">
              La liste générée apparaîtra ici, avec l&apos;intitulé et le code à 13 chiffres de chaque article.
            </p>
          ) : null}

          {status === "loading" ? (
            <p className="text-[#5e5a52]">Analyse de votre liste…</p>
          ) : null}

          {status === "success" && items.length === 0 ? (
            <p className="text-[#5e5a52]">Aucun article n&apos;a été renvoyé.</p>
          ) : null}

          <ul className="grid gap-3">
            {items.map((item, index) => (
              <li
                key={`${item.code}-${item.intitule}-${index}`}
                className="rounded-2xl border border-[#e6dfd2] bg-white p-4"
              >
                <p className="text-lg font-semibold leading-snug text-[#1a1916]">
                  {item.intitule || "Article sans intitulé"}
                </p>
                {item.quantity && item.unit ? (
                  <p className="mt-1 text-sm text-[#5e5a52]">
                    {item.quantity} {item.unit}
                  </p>
                ) : null}
                {item.code ? (
                  <Barcode code={item.code} />
                ) : (
                  <p className="mt-2 font-mono text-sm tracking-widest text-[#9a9488]">
                    Code indisponible
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
