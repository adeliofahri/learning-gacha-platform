import { handler, json } from "@/lib/http";
import { leaderboard } from "@/server/services/leaderboard.service";

/** Publik: hanya username, avatar, skor, dan data tie-break non-privat. */
export const GET = handler(async (req) => {
  const url = new URL(req.url);
  const data = await leaderboard(
    url.searchParams.get("period") ?? undefined,
    url.searchParams.get("month") ?? undefined,
  );
  return json(data);
});
