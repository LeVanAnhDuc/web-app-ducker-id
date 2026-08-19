// libs
import { routing } from "./i18n/routing";
import createMiddleware from "next-intl/middleware";
// types
import type { NextRequest } from "next/server";
// others
import CONSTANTS from "./constants";

const { HOME } = CONSTANTS.ROUTES;

const intlMiddleware = createMiddleware(routing);

export const middleware = (request: NextRequest) => {
  if (request.nextUrl.pathname === HOME) {
    // return NextResponse.redirect(new URL(LOGIN, request.url));
  }

  return intlMiddleware(request);
};

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"]
};
