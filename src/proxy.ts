import { type NextRequest, NextResponse } from "next/server";
import { requireProductionBasicAuth } from "@/lib/security/production-basic-auth";

export function proxy(request: NextRequest) {
  return requireProductionBasicAuth(request) ?? NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)"],
};
