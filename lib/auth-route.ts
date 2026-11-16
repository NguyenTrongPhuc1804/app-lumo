import { describeAuthError, type AuthLink } from "./auth-link";

export type AuthAction =
  | { type: "login"; token: string; target: string }
  | { type: "error"; message: string | null };

// Quyet dinh man /auth lam gi voi du lieu deep link nhan duoc.
// Tach khoi React de test duoc va de doc de hieu.
export function decideAuthAction(link: AuthLink): AuthAction {
  if (link.token) return { type: "login", token: link.token, target: "/" };
  return { type: "error", message: describeAuthError(link.error) };
}
