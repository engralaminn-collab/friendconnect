import type { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { route, jsonOk } from "@/server/http/errors";
import { assertSameOrigin, clientIp, userAgent } from "@/server/http/guard";
import { logout } from "@/server/services/auth.service";
import { clearSessionCookie, sessionCookieName } from "@/server/auth/cookies";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = route(async (req: NextRequest) => {
  assertSameOrigin(req);
  const jar = await cookies();
  const token = jar.get(sessionCookieName())?.value;
  await logout(token, { ip: clientIp(req), userAgent: userAgent(req) });
  const res = jsonOk({ loggedOut: true });
  clearSessionCookie(res);
  return res;
});
