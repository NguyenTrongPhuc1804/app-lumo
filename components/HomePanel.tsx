import { useEffect, useState } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withSpring, withTiming } from "react-native-reanimated";
import { LANGS, labelOf, startTranslator, stopTranslator } from "../lib/api";
import { useSettings } from "../lib/settings";
import { useAppearance } from "../lib/appearance";
import StitchIcon from "./StitchIcon";
import ScreenTranslator from "../modules/screen-translator";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Mot dong "ten - hanh dong" trong cac khoi huong dan
function GestureRow({ name, action, last }: { name: string; action: string; last?: boolean }) {
  const { styles } = useAppearance();
  return (
    <View style={[styles.gestureRow, !last && styles.gestureRowBorder]}>
      <Text allowFontScaling={false} style={styles.gestureName}>{name}</Text>
      <Text allowFontScaling={false} style={styles.gestureAction}>{action}</Text>
    </View>
  );
}

export default function HomePanel({ onManageModels }: { onManageModels: () => void }) {
  const { styles, ACCENT, TEXT_DIM } = useAppearance();
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

    const granted = await startTranslator({ serverUrl, sourceLang, targetLang, model, accentColor: "#BDB5FF" });
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
      {/* Khoi bat dau dich: khoi lon nhat, mau nhan */}
      <View style={styles.startHero}>
        <Text allowFontScaling={false} style={styles.heroTitle}>Dịch màn hình</Text>
        <AnimatedPressable
          style={[styles.lensTrigger, startCircleStyle]}
          accessibilityRole="button"
          accessibilityLabel={running ? "Tắt nút dịch nổi" : "Bật nút dịch nổi"}
          onPressIn={() => (pressScale.value = withSpring(0.97))}
          onPressOut={() => (pressScale.value = withSpring(1))}
          onPress={handleToggle}
        >
          <LinearGradient colors={["#10B981", "#38BDF8"]} start={{ x: 0, y: 1 }} end={{ x: 1, y: 0 }} style={styles.lensRing}>
            <View style={styles.lensFace}>
              <LinearGradient colors={["#10B981", "#059669"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.lensCore}>
                <StitchIcon name={running ? "crop_free" : "play_arrow"} size={32} color="#FFFFFF" />
              </LinearGradient>
            </View>
          </LinearGradient>
        </AnimatedPressable>
        <Text allowFontScaling={false} style={styles.lensActionLabel}>{running ? "DỪNG LENS" : "BẬT LENS"}</Text>
        <Text allowFontScaling={false} style={styles.lensStatus}>{running ? "Nút dịch đang bật • Sẵn sàng quét" : "Nút dịch đang tắt"}</Text>
        <Text allowFontScaling={false} style={styles.heroText}>
          {running ? "Mở ứng dụng bạn muốn dịch, rồi nhấn đúp nút nổi." : "Bật nút nổi, rồi mở ứng dụng bạn muốn dịch."}
        </Text>
      </View>
      {!hasOverlayPermission ? (
        <View style={styles.card}>
          <Text allowFontScaling={false} style={styles.warning}>Chưa cấp quyền hiển thị trên ứng dụng khác</Text>
          <Pressable style={styles.secondaryButton} accessibilityRole="button" onPress={() => ScreenTranslator.openOverlaySettings()}>
            <Text allowFontScaling={false} style={styles.secondaryButtonText}>Mở cài đặt để cấp quyền</Text>
          </Pressable>
        </View>
      ) : null}

      {/* Khoi chon ngon ngu */}
      <View style={styles.bentoRow}>
      <View style={styles.bentoTile}>
        <View style={styles.iconLabel}><StitchIcon name="translate" color={ACCENT} /><Text allowFontScaling={false} style={styles.sectionTitle}>Cặp ngôn ngữ</Text></View>
        <View style={styles.langRow}>
          <View style={styles.langColumn}>
            <Text allowFontScaling={false} style={styles.langCaption}>Nguồn</Text>
            <Pressable style={styles.langButton} accessibilityRole="button" onPress={() => setPickerFor("source")}>
              <View style={styles.iconLabel}><Text allowFontScaling={false} style={styles.langButtonText}>{labelOf(sourceLang)}</Text><StitchIcon name="expand_more" size={18} color={TEXT_DIM} /></View>
            </Pressable>
          </View>
          <Pressable style={styles.swapButton} accessibilityRole="button" accessibilityLabel="Hoán đổi ngôn ngữ" onPress={handleSwap}>
            <Animated.View style={swapStyle}><StitchIcon name="sync_alt" color={ACCENT} /></Animated.View>
          </Pressable>
          <View style={styles.langColumn}>
            <Text allowFontScaling={false} style={styles.langCaption}>Dịch sang</Text>
            <Pressable style={styles.langButton} accessibilityRole="button" onPress={() => setPickerFor("target")}>
              <View style={styles.iconLabel}><Text allowFontScaling={false} style={styles.langButtonText}>{labelOf(targetLang)}</Text><StitchIcon name="expand_more" size={18} color={TEXT_DIM} /></View>
            </Pressable>
          </View>
        </View>
      </View>

      {/* Khoi chon model dich: thay ten model dang dung ngay tren khoi */}
      <View style={styles.bentoTile}>
        <View style={styles.iconLabel}><StitchIcon name="memory" color={ACCENT} /><Text allowFontScaling={false} style={styles.sectionTitle}>Model AI</Text></View>
        {modelsLoading ? <View style={styles.rowBetween}><ActivityIndicator /><Text allowFontScaling={false} style={styles.hint}>Đang tải danh sách...</Text></View> : null}
        {modelsError ? <Text allowFontScaling={false} style={styles.hint}>{modelsError}</Text> : null}
        <Text allowFontScaling={false} style={styles.langPairValue}>{currentModelName}</Text>
        <Pressable style={styles.secondaryButton} accessibilityRole="button" accessibilityLabel="Chọn model dịch" onPress={() => setPickerFor("model")}>
          <Text allowFontScaling={false} style={styles.secondaryButtonText}>Chọn model khác</Text>
        </Pressable>
        {running ? <Text allowFontScaling={false} style={styles.hint}>Tắt rồi bật lại nút dịch để áp dụng model mới.</Text> : null}
      </View>
      </View>

      {/* Khoi huong dan cu chi, rut gon hien thi ban dau */}
      <View style={styles.card}>
        <Text allowFontScaling={false} style={styles.sectionTitle}>Nút dịch nổi hoạt động thế nào</Text>
        <GestureRow name="Nhấn đúp" action="Dịch toàn màn hình" />
        <GestureRow name="Nhấn giữ" action="Chọn vùng để dịch" />
        <GestureRow name="Nhấn một lần" action="Mở thanh công cụ" last />
      </View>

      {/* Hop chon ngon ngu hoac model */}
      <Modal visible={pickerFor !== null} transparent animationType="fade" onRequestClose={() => setPickerFor(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setPickerFor(null)}>
          <View style={styles.modalCard}>
            <Text allowFontScaling={false} style={styles.sectionTitle}>
              {pickerFor === "source" ? "Ngôn ngữ nguồn" : pickerFor === "model" ? "Công cụ dịch" : "Dịch sang"}
            </Text>
            {pickerFor === "model" ? (
              <>
                {modelsLoading ? <View style={styles.rowBetween}><ActivityIndicator /><Text allowFontScaling={false} style={styles.hint}>Đang tải danh sách...</Text></View> : null}
                {modelsError ? <View><Text allowFontScaling={false} style={styles.hint}>{modelsError}</Text><Pressable disabled={modelsLoading} onPress={reloadModels}><Text allowFontScaling={false} style={styles.actionBtnText}>Thử lại</Text></Pressable></View> : null}
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
                        <Text allowFontScaling={false} style={[styles.modalItemText, selected && styles.tabActive]}>{m.label}</Text>
                        {selected ? <StitchIcon name="check" size={20} color={ACCENT} /> : null}
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
                  <View style={styles.iconLabel}><StitchIcon name="tune" size={20} color={ACCENT} /><Text allowFontScaling={false} style={[styles.manageQuickText, { flex: 1 }]}>Thêm / Quản lý Model AI riêng</Text><StitchIcon name="chevron_right" size={20} color={ACCENT} /></View>
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
                    <Text allowFontScaling={false} style={[styles.modalItemText, selected && styles.tabActive]}>{lang.label}</Text>
                    {selected ? <StitchIcon name="check" size={20} color={ACCENT} /> : null}
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
