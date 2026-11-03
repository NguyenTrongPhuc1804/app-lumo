import { Stack, router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useSettings } from "../lib/settings";
import { styles } from "../lib/theme";

const ONBOARDING = [
  {
    title: "Dịch màn hình\nChỉ cần nhấn đúp",
    bullets: [
      "🌐 Dịch chữ trong mọi ứng dụng, trò chơi, truyện tranh",
      "🚀 Chụp, đọc chữ và dịch chỉ trong vài giây",
      "🏆 Bản dịch bằng AI, có lưu sẵn để dịch lại nhanh hơn",
      "✅ Bản dịch phủ lên đúng vị trí chữ gốc",
      "⌛ Có chế độ dịch tự động, rảnh tay",
    ],
  },
  {
    step: "Bước đầu tiên",
    title: "Cho phép hiển thị trên ứng dụng khác",
    bullets: ["Cần quyền này để nút dịch nổi lên trên mọi ứng dụng.", "Bạn cấp quyền ở trang chủ của ứng dụng."],
  },
  {
    step: "Bước thứ hai",
    title: "Cho phép chụp màn hình",
    bullets: ["Khi bấm nút bắt đầu, Android sẽ hỏi quyền ghi màn hình.", "Ảnh chụp chỉ dùng để đọc chữ, không được lưu lại."],
  },
  {
    step: "Bước cuối cùng",
    title: "Dùng nút dịch nổi",
    bullets: [
      "Nhấn một lần: mở thanh công cụ",
      "Nhấn đúp: dịch toàn màn hình",
      "Nhấn giữ: kéo chọn vùng để dịch",
      "Kéo nút để đổi vị trí",
    ],
  },
];

export default function OnboardingScreen() {
  const { onboarded, finishOnboarding } = useSettings();
  const [page, setPage] = useState(0);
  const current = ONBOARDING[page];

  // Da xem gioi thieu roi thi vao thang trang chinh
  useEffect(() => {
    if (onboarded) router.replace("/");
  }, [onboarded]);

  const next = () => {
    if (page < ONBOARDING.length - 1) {
      setPage(page + 1);
    } else {
      finishOnboarding();
      router.replace("/");
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.onboardBody}>
        {current.step ? <Text style={styles.stepBadge}>{current.step}</Text> : null}
        <Text style={styles.onboardTitle}>{current.title}</Text>
        <View style={styles.bulletCard}>
          {current.bullets.map((text) => (
            <Text key={text} style={styles.bulletText}>
              {text}
            </Text>
          ))}
        </View>
      </View>

      <View style={styles.onboardFooter}>
        <Pressable style={styles.skipButton} accessibilityRole="button" onPress={next}>
          <Text style={styles.skipText}>Bỏ qua</Text>
        </Pressable>
        <View style={styles.dots}>
          {ONBOARDING.map((item, index) => (
            <View key={item.title} style={[styles.dot, index === page && styles.dotActive]} />
          ))}
        </View>
        <Pressable
          style={styles.nextButton}
          accessibilityRole="button"
          accessibilityLabel={page === ONBOARDING.length - 1 ? "Bắt đầu" : "Trang tiếp theo"}
          onPress={next}
        >
          <Text style={styles.nextText}>{page === ONBOARDING.length - 1 ? "✓" : "›"}</Text>
        </Pressable>
      </View>
    </View>
  );
}
