import { create } from "zustand";
import { DEFAULT_MODELS, deleteModel, fetchAdminModels, fetchModels, type CustomModel } from "../lib/api";
import { useAuthStore } from "./authStore";
import { useConfigStore } from "./configStore";

type ModelOption = { code: string; label: string };

type ModelState = {
  modelList: ModelOption[];
  customModels: CustomModel[];
  modelsLoading: boolean;
  adminModelsLoading: boolean;
  modelsError: string | null;
  adminModelsError: string | null;
  deletingIds: string[];

  reloadModels: () => Promise<void>;
  reloadAdminModels: () => Promise<void>;
  removeModel: (id: string) => Promise<string | null>;
};

// Số thứ tự request. Chỉ request mới nhất được quyền cập nhật dữ liệu.
let modelsRequest = 0;
let adminRequest = 0;
// Các id đang xóa, để bấm nhiều lần cũng chỉ gửi một lần.
const deleting = new Set<string>();

// Lấy câu lỗi an toàn: lỗi có thể đến từ realm khác nên không dùng instanceof Error.
const messageOf = (err: unknown) => {
  if (err && typeof err === "object" && "message" in err && typeof err.message === "string" && err.message) {
    return err.message;
  }
  return "Không tải được danh sách model.";
};

export const useModelStore = create<ModelState>()((set) => ({
  modelList: DEFAULT_MODELS,
  customModels: [],
  modelsLoading: true,
  adminModelsLoading: true,
  modelsError: null,
  adminModelsError: null,
  deletingIds: [],

  reloadModels: async () => {
    const { serverUrl } = useConfigStore.getState();
    const request = ++modelsRequest;
    set({ modelsLoading: true, modelsError: null });
    try {
      const list = await fetchModels(serverUrl);
      if (request !== modelsRequest) return;
      set({ modelList: list });
      // Đọc model tại thời điểm này, vì người dùng có thể đã chọn model khác
      // trong lúc chờ server trả về.
      const { model, setModel } = useConfigStore.getState();
      if (!list.some((item) => item.code === model)) setModel(list[0]?.code ?? "");
    } catch (err) {
      if (request === modelsRequest) set({ modelsError: messageOf(err) });
    } finally {
      if (request === modelsRequest) set({ modelsLoading: false });
    }
  },

  reloadAdminModels: async () => {
    // Danh sách đầy đủ giờ cần token của tài khoản admin, không còn ADMIN_KEY.
    const { serverUrl } = useConfigStore.getState();
    const token = useAuthStore.getState().token ?? "";
    const request = ++adminRequest;

    // Người thường và khách chưa đăng nhập không cần gọi server.
    if (!token) {
      set({ customModels: [], adminModelsLoading: false, adminModelsError: null });
      return;
    }

    set({ adminModelsLoading: true, adminModelsError: null });
    try {
      const list = await fetchAdminModels(serverUrl, token);
      if (request === adminRequest) set({ customModels: list });
    } catch (err) {
      if (request === adminRequest) set({ adminModelsError: messageOf(err) });
    } finally {
      if (request === adminRequest) set({ adminModelsLoading: false });
    }
  },

  // Giữ trạng thái xóa trong store để không mất khi chuyển tab.
  removeModel: async (id) => {
    if (deleting.has(id)) return null;
    // Id phải còn trong danh sách của server hiện tại. Nếu người dùng vừa đổi
    // server, danh sách cũ đã bị xóa nên không gửi id của server cũ đi.
    if (!useModelStore.getState().customModels.some((item) => item.id === id)) {
      return "Cấu hình đã thay đổi. Vui lòng thử lại.";
    }
    const { serverUrl } = useConfigStore.getState();
    const token = useAuthStore.getState().token ?? "";
    deleting.add(id);
    set({ deletingIds: [...deleting] });
    try {
      const error = await deleteModel(serverUrl, token, id);
      if (error) return error;
      // Cấu hình đã đổi trong lúc chờ thì bỏ qua; useAppSync sẽ tự tải lại.
      const current = useConfigStore.getState();
      if (current.serverUrl !== serverUrl || (useAuthStore.getState().token ?? "") !== token) return null;
      await Promise.all([useModelStore.getState().reloadAdminModels(), useModelStore.getState().reloadModels()]);
      return null;
    } finally {
      deleting.delete(id);
      set({ deletingIds: [...deleting] });
    }
  },
}));
