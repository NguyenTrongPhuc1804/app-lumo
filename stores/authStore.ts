import * as SecureStore from "expo-secure-store";
import { create } from "zustand";
import { fetchMe, type AuthUser } from "../lib/api";
import { useConfigStore } from "./configStore";

const TOKEN_KEY = "lumo-lens-token";

type AuthState = {
  token: string | null;
  user: AuthUser | null;
  hydrated: boolean; // true khi đã đọc xong token đã lưu
  error: string | null;

  // Gọi sau khi deep link trả token về
  completeLogin: (token: string) => Promise<void>;
  logout: () => Promise<void>;
  reloadMe: () => Promise<void>;
};

// Lấy câu lỗi an toàn: lỗi có thể đến từ realm khác nên không dùng instanceof.
const messageOf = (err: unknown) => {
  if (err && typeof err === "object" && "message" in err && typeof err.message === "string" && err.message) {
    return err.message;
  }
  return "Không tải được thông tin tài khoản.";
};

export const useAuthStore = create<AuthState>()((set, get) => {
  // Đọc token đã lưu, rồi thử lấy thông tin tài khoản.
  // Lỗi đọc token không được làm app treo.
  (async () => {
    let token: string | null = null;
    try {
      token = await SecureStore.getItemAsync(TOKEN_KEY);
    } catch {
      token = null;
    }
    set({ token, hydrated: true });
    if (token) await get().reloadMe().catch(() => {});
  })();

  return {
    token: null,
    user: null,
    hydrated: false,
    error: null,

    completeLogin: async (token) => {
      try {
        await SecureStore.setItemAsync(TOKEN_KEY, token);
      } catch {
        // Không lưu được vào keystore thì vẫn giữ token trong bộ nhớ cho phiên này.
      }
      set({ token, error: null });
      await get().reloadMe();
    },

    logout: async () => {
      try {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
      } catch {
        // Không xoá được thì vẫn xoá trong bộ nhớ, lần mở sau người dùng đăng nhập lại.
      }
      set({ token: null, user: null, error: null });
    },

    reloadMe: async () => {
      const { token } = get();
      if (!token) return;
      const { serverUrl } = useConfigStore.getState();
      try {
        const user = await fetchMe(serverUrl, token);
        set({ user, error: null });
      } catch (err) {
        const message = messageOf(err);
        // Phiên hết hạn hoặc tài khoản bị khoá thì đưa về màn đăng nhập.
        if (/hết hạn|quyền|khoá|bị khoá/i.test(message)) {
          try {
            await SecureStore.deleteItemAsync(TOKEN_KEY);
          } catch {
            // Bỏ qua: đã xoá trong bộ nhớ bên dưới.
          }
          set({ token: null, user: null, error: message });
          throw new Error(message);
        }
        set({ error: message });
        throw new Error(message);
      }
    },
  };
});
