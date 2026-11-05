import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withSpring, withTiming } from "react-native-reanimated";
import { LANGS, labelOf, startTranslator, stopTranslator } from "../lib/api";
import { useSettings } from "../lib/settings";
import { ACCENT, styles } from "../lib/theme";
import ScreenTranslator from "../modules/screen-translator";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Mot dong "ten - hanh dong" trong cac khoi huong dan
function GestureRow({ name, action, last }: { name: string; action: string; last?: boolean }) {
  return (
    <View style={[styles.gestureRow, !last && styles.gestureRowBorder]}>
      <Text style={styles.gestureName}>{name}</Text>
      <Text style={styles.gestureAction}>{action}</Text>
    </View>
  );
}

export default function HomePanel({ onManageModels }: { onManageModels: () => void }) {
  const {
    serverUrl,
    sourceLang,
    targetLang,
    model,
    modelList,
    customModels,
    setModel,
    chooseLanguage,
    swapLanguages,
    running,
    setRunning,
    hasOverlayPermission,
    modelsLoading,
    modelsError,
    reloadModels,
  } = useSettings();
  const [pickerFor, setPickerFor] = useState<"source" | "target" | "model" | null>(null);

  // Hieu ung: nut tron co lai khi nhan, phap phong khi dang bat; nut doi ngon ngu xoay 180 do
  const pressScale = useSharedValue(1);
  const pulse = useSharedValue(1);
  const swapRotation = useSharedValue(0);

  useEffect(() => {
    pulse.value = running ? withRepeat(withTiming(1.06, { duration: 900 }), -1, true) : withTiming(1);
  }, [running]);

  const startCircleStyle = useAnimatedStyle(() => ({ transform: [{ scale: pressScale.value * pulse.value }] }));
  const swapStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${swapRotation.value}deg` }] }));

  const handleSwap = () => {
    swapRotation.value = withSpring(swapRotation.value + 180);
    swapLanguages();
  };

  // Nut tron lon: bat hoac tat widget dich
  const handleToggle = async () => {
    if (running) {
      stopTranslator();
      setRunning(false);
      return;
    }
    if (!hasOverlayPermission) {
      Alert.alert("Cần quyền hiển thị", "Cho phép hiển thị trên ứng dụng khác để nút dịch nổi lên được.", [
        { text: "Để sau", style: "cancel" },
        { text: "Mở cài đặt", onPress: () => ScreenTranslator.openOverlaySettings() },
      ]);
      return;
    }
    if (!serverUrl.trim()) {
      Alert.alert("Thiếu địa chỉ server", "Vào tab Cài đặt để nhập địa chỉ server trước khi bắt đầu.");
      return;
    }

    const granted = await startTranslator({ serverUrl, sourceLang, targetLang, model, accentColor: ACCENT });
    if (granted) {
      setRunning(true);
    } else {
      Alert.alert("Chưa được cấp quyền", "Bạn cần cho phép chụp màn hình để dịch.");
    }
  };

  const currentModelName =
    customModels.find((c) => c.code === model)?.name != null
      ? `${customModels.find((c) => c.code === model)?.name} (Cá nhân)`
      : modelList.find((item) => item.code === model)?.label || model;

  return (
    <>
      {/* Khoi bat dau */}
      <View style={styles.card}>
        <AnimatedPressable
          style={[styles.startCircle, running && styles.startCircleOn, startCircleStyle]}
          accessibilityRole="button"
          accessibilityLabel={running ? "Tắt nút dịch nổi" : "Bật nút dịch nổi"}
          onPressIn={() => (pressScale.value = withSpring(0.9))}
          onPressOut={() => (pressScale.value = withSpring(1))}
          onPress={handleToggle}
        >
          <Text style={styles.startIcon}>{running ? "■" : "文A"}</Text>
        </AnimatedPressable>
        <Text style={styles.centerText}>
          {running ? "Nút dịch đang bật. Nhấn để tắt." : "Nhấn để bắt đầu [Nút dịch nổi]."}
        </Text>
        {!hasOverlayPermission ? <Text style={styles.warning}>Chưa cấp quyền hiển thị trên ứng dụng khác</Text> : null}
      </View>

      {/* Khoi chon ngon ngu */}
      <View style={styles.card}>
        <View style={styles.langRow}>
          <View style={styles.langColumn}>
            <Text style={styles.langCaption}>Nguồn</Text>
            <Pressable style={styles.langButton} accessibilityRole="button" onPress={() => setPickerFor("source")}>
              <Text style={styles.langButtonText}>{labelOf(sourceLang)} ▾</Text>
            </Pressable>
          </View>
          <Pressable style={styles.swapButton} accessibilityRole="button" accessibilityLabel="Hoán đổi ngôn ngữ" onPress={handleSwap}>
            <Animated.Text style={[styles.swapText, swapStyle]}>⇄</Animated.Text>
          </Pressable>
          <View style={styles.langColumn}>
            <Text style={styles.langCaption}>Của tôi</Text>
            <Pressable style={styles.langButton} accessibilityRole="button" onPress={() => setPickerFor("target")}>
              <Text style={styles.langButtonText}>{labelOf(targetLang)} ▾</Text>
            </Pressable>
          </View>
        </View>
      </View>

      {/* Khoi chon model dich */}
      <View style={styles.card}>
        <Text style={styles.langCaption}>Công cụ dịch</Text>
        {modelsLoading ? <View style={styles.rowBetween}><ActivityIndicator /><Text style={styles.hint}>Đang tải danh sách...</Text></View> : null}
        {modelsError ? <Text style={styles.hint}>{modelsError}</Text> : null}
        <Pressable style={styles.langButton} accessibilityRole="button" accessibilityLabel="Chọn model dịch" onPress={() => setPickerFor("model")}>
          <Text style={styles.langButtonText}>{currentModelName} ▾</Text>
        </Pressable>
        {running ? <Text style={styles.hint}>Tắt rồi bật lại nút dịch để áp dụng model mới.</Text> : null}
      </View>

      {/* Khoi huong dan cu chi, giong muc "Hanh dong" cua app goc */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>[Nút dịch nổi] Hành động</Text>
        <GestureRow name="Nhấn một lần" action="Mở thanh công cụ" />
        <GestureRow name="Nhấn đúp" action="Dịch toàn màn hình" />
        <GestureRow name="Nhấn giữ" action="Dịch khu vực" />
        <GestureRow name="Kéo nút" action="Di chuyển nút" last />
      </View>

      {/* Khoi giai thich thanh cong cu */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Thanh công cụ</Text>
        <GestureRow name="Dịch toàn màn hình" action="Chụp và dịch tất cả chữ" />
        <GestureRow name="Dịch tự động" action="Tự dịch lại mỗi 3 giây" />
        <GestureRow name="Dịch khu vực cố định" action="Nhấn giữ để chọn lại vùng" />
        <GestureRow name="Dịch khu vực" action="Kéo để chọn vùng cần dịch" />
        <GestureRow name="Tắt nút dịch" action="Đóng nút nổi" last />
      </View>

      {/* Hop chon ngon ngu hoac model */}
      <Modal visible={pickerFor !== null} transparent animationType="fade" onRequestClose={() => setPickerFor(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setPickerFor(null)}>
          <View style={styles.modalCard}>
            <Text style={styles.sectionTitle}>
              {pickerFor === "source" ? "Ngôn ngữ nguồn" : pickerFor === "model" ? "Công cụ dịch" : "Dịch sang"}
            </Text>
            {pickerFor === "model" ? (
              <>
                {modelsLoading ? <View style={styles.rowBetween}><ActivityIndicator /><Text style={styles.hint}>Đang tải danh sách...</Text></View> : null}
                {modelsError ? <View><Text style={styles.hint}>{modelsError}</Text><Pressable disabled={modelsLoading} onPress={reloadModels}><Text style={styles.actionBtnText}>Thử lại</Text></Pressable></View> : null}
                <ScrollView style={{ maxHeight: 320 }}>
                  {modelList.map((m) => {
                    const selected = model === m.code;
                    return (
                      <Pressable
                        key={m.code}
                        style={styles.modalItem}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        onPress={() => {
                          setModel(m.code);
                          setPickerFor(null);
                        }}
                      >
                        <Text style={[styles.modalItemText, selected && styles.tabActive]}>{m.label}</Text>
                        {selected ? <Text style={styles.tabActive}>✓</Text> : null}
                      </Pressable>
                    );
                  })}
                </ScrollView>

                <Pressable
                  style={styles.manageQuickBtn}
                  onPress={() => {
                    setPickerFor(null);
                    onManageModels();
                  }}
                >
                  <Text style={styles.manageQuickText}>⚙ Thêm / Quản lý Model AI riêng ›</Text>
                </Pressable>
              </>
            ) : (
              LANGS.map((lang) => {
                const selected = (pickerFor === "source" ? sourceLang : targetLang) === lang.code;
                return (
                  <Pressable
                    key={lang.code}
                    style={styles.modalItem}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => {
                      chooseLanguage(pickerFor === "source" ? "source" : "target", lang.code);
                      setPickerFor(null);
                    }}
                  >
                    <Text style={[styles.modalItemText, selected && styles.tabActive]}>{lang.label}</Text>
                    {selected ? <Text style={styles.tabActive}>✓</Text> : null}
                  </Pressable>
                );
              })
            )}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}
