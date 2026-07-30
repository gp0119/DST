import cookbook from "../data/cookbook.json";

export function GET() {
  return new Response(JSON.stringify(cookbook), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}
