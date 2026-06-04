import { NextResponse } from "next/server";

export async function GET() {
  const token = process.env.FOOTBALL_DATA_TOKEN;

  if (!token) {
    console.error("[API /matches] ❌ FOOTBALL_DATA_TOKEN não encontrada nas variáveis de ambiente.");
    return NextResponse.json(
      { error: "FOOTBALL_DATA_TOKEN não configurada no servidor." },
      { status: 500 }
    );
  }

  try {
    const url = "https://api.football-data.org/v4/competitions/BSA/matches";

    console.log("[API /matches] 🔍 URL da requisição:", url);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "X-Auth-Token": token,
      },
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("[API /matches] ❌ Erro na API:", response.status, response.statusText);
      console.error("[API /matches] ❌ Corpo da resposta:", errorBody);
      return NextResponse.json(
        { error: "Falha na API", status: response.status },
        { status: response.status }
      );
    }

    const data = await response.json();

    console.log("[API /matches] ✅ Partidas recebidas:", data.matches?.length ?? 0);

    return NextResponse.json(data);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    console.error("[API /matches] ❌ Erro no fetch:", message);

    return NextResponse.json(
      { error: "Falha ao buscar as partidas da Copa do Mundo.", detail: message },
      { status: 500 }
    );
  }
}
