import { NextResponse } from "next/server";

export const maxDuration = 120;

const DEFAULT_MATCHER_URL =
  "https://drivo-matcher-388238658031.europe-west1.run.app";

export async function POST(request: Request) {
  const matcherUrl = (process.env.DRIVO_MATCHER_URL || DEFAULT_MATCHER_URL).replace(
    /\/$/,
    "",
  );

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Le corps de la requête n'est pas un JSON valide." },
      { status: 400 },
    );
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { error: "Le corps de la requête n'est pas un JSON valide." },
      { status: 400 },
    );
  }

  const record = body as Record<string, unknown>;
  const p = Number(record.p);
  const c = record.c;
  const limit =
    record.limit === undefined || record.limit === null
      ? 5
      : Number(record.limit);

  try {
    const response = await fetch(`${matcherUrl}/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        p,
        c,
        limit: Number.isFinite(limit) ? limit : 5,
      }),
    });

    const text = await response.text();
    let data: unknown = {};
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        return NextResponse.json(
          {
            error:
              response.status === 504
                ? "Le matcher a dépassé le délai Cloud Run."
                : "La réponse du matcher n'est pas un JSON valide.",
          },
          { status: response.status === 504 ? 504 : 502 },
        );
      }
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Impossible de joindre le matcher Drivo.";

    return NextResponse.json({ error: message }, { status: 502 });
  }
}
