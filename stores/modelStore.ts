import { create } from "zustand";
import { DEFAULT_MODELS, deleteModel, fetchAdminModels, fetchModels, type CustomModel } from "../lib/api";
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
    const { serverUrl, model, setModel } = useConfigStore.getState();
    const request = ++modelsRequest;
    set({ modelsLoading: true, modelsError: null });
    try {
      const list = await fetchModels(serverUrl);
      if (request !== modelsRequest) return;
      set({ modelList: list });
      // Model đang chọn không còn trên server thì chọn model đầu tiên.
      if (!list.some((item) => item.code === model)) setModel(list[0]?.code ?? "");
    } catch (err) {
      if (request === modelsRequest) set({ modelsError: messageOf(err) });
    } finally {
      if (request === modelsRequest) set({ modelsLoading: false });
    }
  },

  reloadAdminModels: async () => {
    const { serverUrl, adminKey } = useConfigStore.getState();
    const request = ++adminRequest;
    set({ adminModelsLoading: true, adminModelsError: null });
    try {
      const list = await fetchAdminModels(serverUrl, adminKey);
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
    const { serverUrl, adminKey } = useConfigStore.getState();
    deleting.add(id);
    set({ deletingIds: [...deleting] });
    try {
      const error = await deleteModel(serverUrl, adminKey, id);
      if (error) return error;
      // Cấu hình đã đổi trong lúc chờ thì bỏ qua; useAppSync sẽ tự tải lại.
      const current = useConfigStore.getState();
      if (current.serverUrl !== serverUrl || current.adminKey !== adminKey) return null;
      await Promise.all([useModelStore.getState().reloadAdminModels(), useModelStore.getState().reloadModels()]);
      return null;
    } finally {
      deleting.delete(id);
      set({ deletingIds: [...deleting] });
    }
  },
}));
