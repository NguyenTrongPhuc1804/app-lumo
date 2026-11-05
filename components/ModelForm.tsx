import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { ACCENT, TEXT_MUTED, styles } from "../lib/theme";
import { useSettings } from "../lib/settings";

// id = "new" thi tao moi, con lai la id model tren server
export function ModelForm({ id, onClose, saving, onSavingChange }: { id: string; onClose: () => void; saving: boolean; onSavingChange: (value: boolean) => void }) {
  const savingRef = useRef(false);
  const testingRef = useRef(false);
  const { serverUrl, adminKey, customModels, reloadAdminModels, reloadModels, setModel } = useSettings();
  const isNew = id === "new";
  const editing = isNew ? null : customModels.find((m) => m.id === id) ?? null;

  const [formName, setFormName] = useState("");
  const [formCode, setFormCode] = useState("");
  const [formBaseUrl, setFormBaseUrl] = useState("");
  const [formApiKey, setFormApiKey] = useState("");
  const [keyTest, setKeyTest] = useState<{ state: "idle" | "loading" | "ok" | "fail"; msg: string }>({ state: "idle", msg: "" });

  // Dien san du lieu khi sua. key da che tu server nen khong dien vao o nhap.
  useEffect(() => {
    setFormName(editing?.name ?? "");
    setFormCode(editing?.code ?? "");
    setFormBaseUrl(editing?.baseUrl ?? "");
    setFormApiKey("");
    setKeyTest({ state: "idle", msg: "" });
  }, [id]);

  const apiBase = serverUrl.trim().replace(/\/+$/, "");
  const adminHeaders = { "Content-Type": "application/json", "x-admin-key": adminKey.trim() };

  // Kiem tra baseUrl + apiKey truoc khi luu. Key de trong thi server dung key da luu.
  const handleTest = async () => {
    if (savingRef.current || testingRef.current) return;
    if (!formCode.trim()) {
      setKeyTest({ state: "fail", msg: "Nhập Mã Model ID trước" });
      return;
    }
    testingRef.current = true;
    setKeyTest({ state: "loading", msg: "Đang kiểm tra..." });
    try {
      const res = await fetch(`${apiBase}/api/admin/models/verify`, {
        method: "POST",
        headers: adminHeaders,
        body: JSON.stringify({
          id: isNew ? undefined : id,
          model: formCode.trim(),
          baseUrl: formBaseUrl.trim(),
          apiKey: formApiKey.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setKeyTest({ state: "fail", msg: data.error || `Lỗi ${res.status}` });
        return;
      }
      setKeyTest({ state: "ok", msg: `OK: ${data.sample}` });
    } catch (err: any) {
      setKeyTest({ state: "fail", msg: err.message });
    } finally {
      testingRef.current = false;
    }
  };

  // Luu len server: tao moi hoac sua. Server tu goi thu model truoc khi luu.
  const handleSave = async () => {
    if (savingRef.current || testingRef.current) return;
    if (!formName.trim() || !formCode.trim()) {
      Alert.alert("Thiếu thông tin", "Vui lòng nhập Tên hiển thị và Mã model.");
      return;
    }
    if (isNew && !adminKey.trim()) {
      Alert.alert("Cần ADMIN_KEY", "Nhập ADMIN_KEY trong tab Cài đặt trước khi thêm model.");
      return;
    }

    savingRef.current = true;
    onSavingChange(true);
    const url = isNew ? `${apiBase}/api/admin/models` : `${apiBase}/api/admin/models/${id}`;
    try {
      const res = await fetch(url, {
        method: isNew ? "POST" : "PUT",
        headers: adminHeaders,
        body: JSON.stringify({
          name: formName.trim(),
          code: formCode.trim(),
          baseUrl: formBaseUrl.trim(),
          // Khong gui key rong: server giu nguyen key cu khi khong co apiKey
          ...(formApiKey.trim() ? { apiKey: formApiKey.trim() } : {}),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        Alert.alert("Không lưu được", data.error || `Server trả về ${res.status}`);
        return;
      }
      if (isNew) setModel(data.model.code);
      onSavingChange(false);
      savingRef.current = false;
      onClose();
      reloadAdminModels();
      reloadModels();
    } catch (err: any) {
      Alert.alert("Lỗi mạng", err.message);
    } finally {
      savingRef.current = false;
      onSavingChange(false);
    }
  };

  return (
    <>
      <Text style={styles.sectionTitle}>{isNew ? "Thêm Model Dịch Mới" : "Chỉnh Sửa Model"}</Text>

      <ScrollView contentContainerStyle={{ gap: 10, paddingVertical: 8 }}>
        <View>
          <Text style={styles.inputLabel}>Tên hiển thị (*)</Text>
          <TextInput
            editable={!saving}
            style={styles.input}
            value={formName}
            onChangeText={setFormName}
            placeholder="Ví dụ: DeepSeek V3, OmniRoute Local"
            placeholderTextColor={TEXT_MUTED}
          />
        </View>

        <View>
          <Text style={styles.inputLabel}>Mã Model ID (*)</Text>
          <TextInput
            editable={!saving}
            style={styles.input}
            value={formCode}
            onChangeText={setFormCode}
            placeholder="Ví dụ: deepseek-chat, gpt-4o-mini"
            placeholderTextColor={TEXT_MUTED}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <View>
          <Text style={styles.inputLabel}>Base URL (tuỳ chọn)</Text>
          <TextInput
            editable={!saving}
            style={styles.input}
            value={formBaseUrl}
            onChangeText={setFormBaseUrl}
            placeholder="Ví dụ: https://api.deepseek.com hoặc http://192.168.1.46:20128"
            placeholderTextColor={TEXT_MUTED}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Text style={styles.hint}>Để trống nếu dùng Base URL mặc định của server.</Text>
        </View>

        <View>
          <Text style={styles.inputLabel}>{isNew ? "API Key (*)" : "API Key (để trống nếu giữ nguyên)"}</Text>
          <TextInput
            editable={!saving}
            style={styles.input}
            value={formApiKey}
            onChangeText={setFormApiKey}
            placeholder="sk-..."
            placeholderTextColor={TEXT_MUTED}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
          />
          {!isNew ? <Text style={styles.hint}>Chỉ nhập khi muốn đổi khóa. App không đọc được key cũ đã lưu.</Text> : null}
        </View>

        <Pressable style={styles.verifyBtn} onPress={handleTest} disabled={saving || keyTest.state === "loading"}>
          <Text style={styles.verifyBtnText}>{keyTest.state === "loading" ? "Đang kiểm tra..." : "Kiểm tra kết nối"}</Text>
        </Pressable>
        {keyTest.state === "ok" || keyTest.state === "fail" ? (
          <Text style={[styles.hint, { color: keyTest.state === "ok" ? ACCENT : "#F87171" }]}>{keyTest.msg}</Text>
        ) : null}

        <Text style={styles.hint}>Server sẽ gọi thử model trước khi lưu. Thất bại thì báo lỗi và không lưu.</Text>

        <View style={styles.modalBtnsRow}>
          <Pressable style={styles.cancelBtn} disabled={saving} onPress={onClose}>
            <Text style={styles.cancelBtnText}>Hủy</Text>
          </Pressable>
          <Pressable style={styles.saveBtn} disabled={saving || keyTest.state === "loading"} onPress={handleSave}>
            {saving ? <ActivityIndicator /> : null}
            <Text style={styles.saveBtnText}>{saving ? "Đang lưu..." : "Lưu Model"}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </>
  );
}
