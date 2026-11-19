export type LegalPage = "privacy" | "terms" | "deletion";

const FILES: Record<LegalPage, string> = {
  privacy: "privacy.html",
  terms: "terms.html",
  deletion: "account-deletion.html",
};

export function legalUrl(serverUrl: string, page: LegalPage): string {
  const base = serverUrl.trim().replace(/\/+$/, "");
  if (!base) return "";
  return `${base}/legal/${FILES[page]}`;
}
