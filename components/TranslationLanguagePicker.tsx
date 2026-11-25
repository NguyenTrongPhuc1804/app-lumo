import { useState } from "react";
import { Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "../hooks/useTheme";
import { translationLanguageLabel } from "../lib/main-interface-labels";
import { findLanguages } from "../lib/translation-languages";

export default function TranslationLanguagePicker({ title, codes, selected, onSelect, onClose }: {
  title: string;
  codes: readonly string[];
  selected: string;
  onSelect: (code: string) => void;
  onClose: () => void;
}) {
  const { t, i18n } = useTranslation();
  const { styles, TEXT_DIM } = useTheme();
  const [query, setQuery] = useState("");
  const locale = i18n.resolvedLanguage;
  const languages = findLanguages(codes, query, locale);

  return <Modal visible transparent animationType="slide" onRequestClose={onClose}>
    <View style={styles.sheetBackdrop}>
      <Pressable style={{ flex: 1 }} onPress={onClose} accessible={false} />
      <View style={styles.modelSheet} accessibilityViewIsModal>
        <View style={styles.sheetHeader}>
          <Text style={[styles.sheetTitle, { flex: 1 }]}>{title}</Text>
          <Pressable style={styles.sheetClose} accessibilityRole="button" accessibilityLabel={t("main.closeLanguagePicker")} onPress={onClose}>
            <Text style={styles.sheetCloseText}>×</Text>
          </Pressable>
        </View>
        <TextInput style={styles.input} placeholderTextColor={TEXT_DIM} placeholder={t("main.searchLanguage")} accessibilityLabel={t("main.searchLanguage")} value={query} onChangeText={setQuery} autoCorrect={false} />
        <ScrollView style={styles.modelPickerList} keyboardShouldPersistTaps="handled">
          {languages.map(({ code }) => <Pressable key={code} style={styles.modalItem} accessibilityRole="radio" accessibilityState={{ checked: selected === code }} onPress={() => onSelect(code)}>
            <Text style={[styles.modalItemText, selected === code && styles.tabActive]}>{translationLanguageLabel(code, t, locale)}</Text>
            {selected === code && <Text style={styles.tabActive} accessible={false}>✓</Text>}
          </Pressable>)}
          {languages.length === 0 && <Text style={styles.hint}>{t("main.noLanguagesFound")}</Text>}
        </ScrollView>
      </View>
    </View>
  </Modal>;
}
