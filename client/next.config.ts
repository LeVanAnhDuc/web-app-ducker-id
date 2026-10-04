import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: `${process.env.NEXT_PUBLIC_API_PREFIX}/:path*`,
        destination: `${process.env.API_SERVER_URL}${process.env.NEXT_PUBLIC_API_PREFIX}/:path*`
      },
      // Endpoint OIDC phải nằm cùng origin với màn hình đăng nhập.
      //
      // /oauth/authorize là một navigation THẬT của trình duyệt, không phải
      // XHR — nó chỉ đọc được cookie `sid` nếu cookie đó thuộc origin đang
      // duyệt. Không proxy ở đây thì cookie thuộc :5000 còn trang login ở
      // :3000, và hai bên không bao giờ thấy phiên của nhau.
      {
        source: "/oauth/:path*",
        destination: `${process.env.API_SERVER_URL}/oauth/:path*`
      },
      // Discovery bắt buộc nằm ở gốc origin — app vệ tinh đọc từ đây để tự
      // cấu hình, nên đường dẫn này là hợp đồng công khai.
      {
        source: "/.well-known/:path*",
        destination: `${process.env.API_SERVER_URL}/.well-known/:path*`
      }
    ];
  }
};

const withNextIntl = createNextIntlPlugin();

export default withNextIntl(nextConfig);
