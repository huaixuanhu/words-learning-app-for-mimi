import { type NextRequest, NextResponse } from "next/server";
import { requireProductionBasicAuth } from "@/lib/security/production-basic-auth";
import { requireV2ProductionClientContract } from "@/lib/security/production-client-contract";

export function proxy(request: NextRequest) {
  return (
    requireProductionBasicAuth(request) ??
    requireV2ProductionClientContract(request) ??
    NextResponse.next()
  );
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)"],
};
