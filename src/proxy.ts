import { NextResponse, type NextRequest } from "next/server";

// Sadece hızlı bir ön kontrol: çerez yoksa girişe yönlendir.
// Asıl oturum doğrulaması sayfalarda ve action'larda yapılır.
export function proxy(request: NextRequest) {
  if (!request.cookies.has("sp_session")) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/rooms/:path*", "/explore/:path*", "/join/:path*"],
};
