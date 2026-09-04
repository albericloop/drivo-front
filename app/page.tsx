"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  CatalogHit,
  MatchResult,
  formatNeed,
  normalizeResults,
  parseShoppingList,
} from "@/lib/shopping";

type Status = "idle" | "loading" | "error" | "success";

function formatApiError(payload: unknown, status: number): string {
  if (payload && typeof payload === "object") {
    const record = payload as { error?: unknown; detail?: unknown };
    for (const value of [record.error, record.detail]) {
      if (typeof value === "string" && value.trim()) {
        return value;
      }
      if (value && typeof value === "object") {
        return JSON.stringify(value);
      }
    }
  }
  return `Le matcher a renvoyé une erreur (${status}).`;
}

function Barcode({ code }: { code: string }) {
  const bars = useMemo(() => {
    const chars = code || "0";
    return chars.split("").flatMap((char, index) => {
      const n = Number(/\d/.test(char) ? char : char.charCodeAt(0) % 10);
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
      <p className="mt-1 text-center font-mono text-sm tracking-[0.18em] text-[#1a1916]">
        {code}
      </p>
    </div>
  );
}

function CatalogCard({
  hit,
  variant,
}: {
  hit: CatalogHit;
  variant: "primary" | "alt";
}) {
  return (
    <div
      className={
        variant === "primary"
          ? "rounded-2xl border border-[#e6dfd2] bg-white p-4"
          : "rounded-xl border border-[#eee8dc] bg-[#fffdf8] px-3 py-3"
      }
    >
      <p
        className={
          variant === "primary"
            ? "text-base font-semibold leading-snug text-[#1a1916]"
            : "text-sm font-medium leading-snug text-[#1a1916]"
        }
      >
        {hit.name || "Produit catalogue"}
      </p>
      <p className="mt-1 text-sm text-[#5e5a52]">
        {hit.quantity ? `Pack : ${hit.quantity}` : "Conditionnement inconnu"}
        {" · "}
        {hit.units_to_buy} à acheter
      </p>
      {hit.ean ? (
        variant === "primary" ? (
          <Barcode code={hit.ean} />
        ) : (
          <p className="mt-1 font-mono text-xs tracking-widest text-[#5e5a52]">{hit.ean}</p>
        )
      ) : (
        <p className="mt-2 font-mono text-sm tracking-widest text-[#9a9488]">
          Code indisponible
        </p>
      )}
    </div>
  );
}

export default function HomePage() {
  const [people, setPeople] = useState(2);
  const [list, setList] = useState("pâtes\ntomates\nbasilic\nparmesan");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [results, setResults] = useState<MatchResult[]>([]);

  const parsed = parseShoppingList(list);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const p = Number(people);
    if (!Number.isInteger(p) || p < 1) {
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
        body: JSON.stringify({ p, c: parsed, limit: 5 }),
      });

      const payload = await response.json();

      if (!response.ok) {
        setStatus("error");
        setError(formatApiError(payload, response.status));
        return;
      }

      setResults(normalizeResults(payload));
      setStatus("success");
    } catch {
      setStatus("error");
      setError("Impossible de contacter le matcher Drivo.");
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-5 py-8 sm:px-8 sm:py-12">
      <header className="mb-10 flex items-end justify-between gap-4">
        <div>
          <h1
            className="text-5xl tracking-tight text-[#1a1916] sm:text-6xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            QUEECH
          </h1>
          <p className="mt-2 text-sm font-medium tracking-[0.08em] text-[#1f6b45]">
            Ta liste de course augmentée
          </p>
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
              step={1}
              value={people}
              onChange={(event) => {
                const next = parseInt(event.target.value, 10);
                setPeople(Number.isFinite(next) ? next : 1);
              }}
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
                {results.length} résultat{results.length > 1 ? "s" : ""}
              </span>
            ) : null}
          </div>

          {status === "idle" ? (
            <p className="text-[#5e5a52]">
              La liste générée apparaîtra ici, avec l&apos;intitulé catalogue et le code EAN de chaque article.
            </p>
          ) : null}

          {status === "loading" ? (
            <p className="text-[#5e5a52]">Analyse de votre liste… cela peut prendre quelques secondes.</p>
          ) : null}

          {status === "success" && results.length === 0 ? (
            <p className="text-[#5e5a52]">Aucun article n&apos;a été renvoyé.</p>
          ) : null}

          <ul className="grid gap-4">
            {results.map((item, index) => {
              const selected = item.products[0];
              const alternatives = item.products.slice(1);
              const need = formatNeed(item.quantity, item.unit);

              return (
                <li
                  key={`${item.product}-${index}`}
                  className="rounded-2xl border border-[#e6dfd2] bg-white/70 p-4"
                >
                  <p className="text-lg font-semibold leading-snug text-[#1a1916]">
                    {item.product || "Ingrédient"}
                  </p>
                  {need ? (
                    <p className="mt-1 text-sm text-[#5e5a52]">{need}</p>
                  ) : null}

                  {selected ? (
                    <div className="mt-3">
                      <CatalogCard hit={selected} variant="primary" />
                    </div>
                  ) : (
                    <p className="mt-3 rounded-xl bg-[#f7f3ea] px-3 py-2 text-sm text-[#5e5a52]">
                      Aucun produit catalogue pour cet ingrédient.
                    </p>
                  )}

                  {alternatives.length > 0 ? (
                    <details className="mt-3">
                      <summary className="cursor-pointer text-sm font-medium text-[#1f6b45]">
                        {alternatives.length} alternative{alternatives.length > 1 ? "s" : ""}
                      </summary>
                      <div className="mt-2 grid gap-2">
                        {alternatives.map((hit, altIndex) => (
                          <CatalogCard
                            key={`${hit.ean}-${hit.name}-${altIndex}`}
                            hit={hit}
                            variant="alt"
                          />
                        ))}
                      </div>
                    </details>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </main>
  );
}
