import { NextResponse } from "next/server";

export const maxDuration = 60;

const DEFAULT_API_URL = "https://drivo-api-388238658031.europe-west1.run.app";

export async function POST(request: Request) {
  const apiUrl = (process.env.DRIVO_API_URL || DEFAULT_API_URL).replace(
    /\/$/,
    "",
  );

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { detail: "Le corps de la requête n'est pas un JSON valide." },
      { status: 400 },
    );
  }

  try {
    const response = await fetch(`${apiUrl}/generate-shopping-list`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    });

    const text = await response.text();
    let data: unknown = {};
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        return NextResponse.json(
          { detail: "La réponse de l'API n'est pas un JSON valide." },
          { status: 502 },
        );
      }
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Impossible de joindre l'API Drivo.";

    return NextResponse.json(
      { detail: message },
      { status: 502 },
    );
  }
}
