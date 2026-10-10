/** Phiên đăng nhập ở IdP, lưu trên Redis và trỏ tới bằng cookie `sid`. */
export interface SessionRecord {
  sid: string;
  authId: string;
  userId: string;
  roles: string;
  /** Epoch seconds — đi vào claim `auth_time` của id_token. */
  authTime: number;
  ip: string;
  userAgent: string;
  /** clientId của các app đã lấy token bằng phiên này. */
  clients: string[];
}

export type CreateSessionInput = Omit<SessionRecord, "sid" | "clients">;
