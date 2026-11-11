import { apiRequest } from "@/services/http";
import { toSession } from "@/services/mappers";
import type { AuthResponseDto, LoginRequestDto, RegisterRequestDto } from "@/services/dto";
import type { AuthSession } from "@/lib/types";

export const authService = {
  /** POST /api/auth/login */
  async login(body: LoginRequestDto): Promise<AuthSession> {
    const res = await apiRequest<AuthResponseDto>("/api/auth/login", { method: "POST", body, auth: false });
    const session = toSession(res);
    return { ...session, user: session.user ?? { id: null, name: null, email: body.email } };
  },
  /** POST /api/auth/register — returns a session when the backend signs the user in directly. */
  async register(body: RegisterRequestDto): Promise<AuthSession | null> {
    const res = await apiRequest<AuthResponseDto>("/api/auth/register", { method: "POST", body, auth: false });
    if (!res?.token && !res?.accessToken) return null;
    const session = toSession(res);
    return { ...session, user: session.user ?? { id: null, name: body.name, email: body.email } };
  },
};
