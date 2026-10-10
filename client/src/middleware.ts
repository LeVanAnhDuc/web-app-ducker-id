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
  // `oauth` và `.well-known` PHẢI được loại trừ: chúng là endpoint OIDC được
  // rewrite thẳng sang Express, không phải route của Next. Để middleware i18n
  // chạm vào là nó gắn tiền tố locale (/vi/oauth/authorize) và phá hợp đồng
  // redirect_uri mà app vệ tinh đã đăng ký.
  //
  // Dấu chấm viết bằng character class `[.]` thay vì `\.` — trong chuỗi JS thì
  // `\.` chỉ là `.` (escape thừa, ESLint chặn), còn `[.]` khớp đúng dấu chấm.
  matcher: [
    "/((?!api|oauth|[.]well-known|_next/static|_next/image|favicon.ico).*)"
  ]
};
