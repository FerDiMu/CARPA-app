import { NextRequest, NextResponse } from "next/server";

type Environment = "production" | "development" | "other";

export function middleware(request: NextRequest) {
  //const headers = new Headers(request.headers);

  console.log("Weblogger: Method: " + request.method + ". Route: " + request.nextUrl)

  if((request.method == "POST" || request.method == "PUT") && request.nextUrl.href.includes("/api/")){
    /* const newUrl = new URL(request.nextUrl.href.replace("http", "https")); */
   /*  return NextResponse.redirect(newUrl.href, 301); */
  }

  /* const currentEnv = process.env.NODE_ENV as Environment;
  const isHttps = headers.get("x-forwarded-proto")?.split(",")[0] === "https";
  const isLocalhost = request.headers.get("host")?.includes("localhost");

  if (currentEnv === "production" && !isHttps && !isLocalhost) {
    const newUrl = new URL(`http://${headers.get("host")}` || "");
    newUrl.protocol = "https:";
    return NextResponse.redirect(newUrl.href, 301);
  } */
}