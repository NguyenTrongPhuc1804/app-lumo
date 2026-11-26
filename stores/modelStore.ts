import { create } from "zustand";
import { DEFAULT_MODELS, fetchModels, type ModelConnectionError, type ModelOption } from "../lib/api";
import { useConfigStore } from "./configStore";

type ModelState = {
  modelList: ModelOption[];
  modelsLoading: boolean;
  modelsError: string | null;
  connection: "connected" | ModelConnectionError | null;
  reloadModels: () => Promise<void>;
};

// Số thứ tự request. Chỉ request mới nhất được quyền cập nhật dữ liệu.
let modelsRequest = 0;

// Lấy câu lỗi an toàn: lỗi có thể đến từ realm khác nên không dùng instanceof Error.
const messageOf = (err: unknown) => {
  if (err && typeof err === "object" && "message" in err && typeof err.message === "string" && err.message) {
    return err.message;
  }
  return "Không tải được danh sách model.";
};

export const useModelStore = create<ModelState>()((set) => ({
  modelList: DEFAULT_MODELS,
  modelsLoading: true,
  modelsError: null,
  connection: null,

  reloadModels: async () => {
    const { serverUrl } = useConfigStore.getState();
    const request = ++modelsRequest;
    set({ modelsLoading: true, modelsError: null, connection: null });
    try {
      const list = await fetchModels(serverUrl);
      if (request !== modelsRequest) return;
      set({ modelList: list, connection: "connected" });
      // Đọc model tại thời điểm này, vì người dùng có thể đã chọn model khác
      // trong lúc chờ server trả về.
      const { model, setModel } = useConfigStore.getState();
      if (model !== "ml-kit" && !list.some((item) => item.code === model)) setModel(list[0]?.code ?? "");
    } catch (err) {
      if (request !== modelsRequest) return;
      const connection = err && typeof err === "object" && "reason" in err
        ? err as ModelConnectionError : { reason: "network" } as const;
      const modelsError = connection.reason === "http" ? `Không tải được model: HTTP ${connection.status}` : messageOf(err);
      set({ modelsError, connection });
    } finally {
      if (request === modelsRequest) set({ modelsLoading: false });
    }
  },
}));
