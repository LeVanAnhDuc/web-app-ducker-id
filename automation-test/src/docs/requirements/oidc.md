# OIDC — đăng nhập một lần cho app vệ tinh

- **REQ-OIDC-01** Discovery tại `/.well-known/openid-configuration` và public key tại `/.well-known/jwks.json`.
- **REQ-OIDC-02** `/oauth/authorize` triển khai Authorization Code với PKCE S256, bắt buộc với mọi client.
- **REQ-OIDC-03** Authorization code sống 60 giây và chỉ dùng được một lần.
- **REQ-OIDC-04** `/oauth/token` đổi code lấy ID token và access token ký RS256; client confidential xác thực bằng secret, client public thì không.
- **REQ-OIDC-05** Khi đã có session Ducker ID, người dùng quay thẳng về app, không qua màn hình nào ở giữa.
- **REQ-OIDC-06** `prompt=none` kiểm tra session mà không bao giờ hiện màn hình đăng nhập.
- **REQ-OIDC-07** `/oauth/userinfo` trả claim của người dùng với access token hợp lệ.
- **REQ-OIDC-08** Client, redirect URI, scope hoặc verifier không hợp lệ bị từ chối mà không redirect tới URI chưa đăng ký.
- **REQ-OIDC-09** `/oauth/logout` kết thúc session của identity provider.
- **REQ-OIDC-10** `/oauth/authorize` chỉ cho người dùng vào app khi họ được phép mở app đó — theo mặc định của role, theo quyền admin cấp thêm ngoài role, không bao giờ sau khi bị thu hồi (`access_denied`); admin đủ điều kiện với mọi app.
- **REQ-OIDC-11** `/oauth/authorize` và `/oauth/token` bị giới hạn theo IP, dùng chung ngân sách với đăng nhập mật khẩu (30 request / 15 phút, mọi request đều bị đếm); vượt ngưỡng trả 429 `TOO_MANY_REQUESTS`.
