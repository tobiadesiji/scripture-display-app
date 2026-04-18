import { NextRequest, NextResponse } from "next/server";

const NLT_API_URL = "https://api.nlt.to/api/passages";

export async function GET(request: NextRequest) {
  const reference = request.nextUrl.searchParams.get("ref");
  const version = request.nextUrl.searchParams.get("version") || "NLT";
  const apiKey = process.env.NLT_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing NLT_API_KEY in .env.local" },
      { status: 500 }
    );
  }

  if (!reference) {
    return NextResponse.json(
      { error: "Missing ref query parameter" },
      { status: 400 }
    );
  }

  const url = new URL(NLT_API_URL);
  url.searchParams.set("ref", reference);
  url.searchParams.set("version", version);
  url.searchParams.set("key", apiKey);

  try {
    const response = await fetch(url.toString(), {
      cache: "no-store"
    });

    const text = await response.text();

    if (!response.ok) {
      return NextResponse.json(
        {
          error: `NLT API request failed with status ${response.status}`,
          details: text
        },
        { status: response.status }
      );
    }

    return NextResponse.json({
      ok: true,
      raw: text
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to contact NLT API",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}