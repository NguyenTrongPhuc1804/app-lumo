import { StyleSheet } from "react-native";

// Mau cua Lumo Lens (nen xanh dam, nhan xanh ngoc)
export const ACCENT = "#14B8A6";
export const BACKGROUND = "#0B1220";
export const CARD = "#131B2E";
export const BORDER = "#26314A";
export const TEXT_MUTED = "#8E9BB5";

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BACKGROUND },
  title: { color: "#FFFFFF", fontSize: 22, fontWeight: "700", margin: 20 },

  // Man gioi thieu
  onboardBody: { flex: 1, justifyContent: "center", paddingHorizontal: 20, gap: 20 },
  stepBadge: { alignSelf: "center", color: "#C9D3EE", backgroundColor: "#23304D", paddingVertical: 6, paddingHorizontal: 14, borderRadius: 10, fontSize: 13, overflow: "hidden" },
  onboardTitle: { color: "#FFFFFF", fontSize: 28, fontWeight: "700", textAlign: "center" },
  bulletCard: { backgroundColor: CARD, borderColor: BORDER, borderWidth: 1, borderRadius: 16, padding: 16, gap: 14 },
  bulletText: { color: "#DCE3F5", fontSize: 15, lineHeight: 22 },
  onboardFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16 },
  skipButton: { borderColor: TEXT_MUTED, borderWidth: 1, borderRadius: 20, paddingVertical: 10, paddingHorizontal: 18, minHeight: 44, justifyContent: "center" },
  skipText: { color: "#DCE3F5", fontSize: 14 },
  dots: { flexDirection: "row", gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#4A5572" },
  dotActive: { width: 24, backgroundColor: "#FFFFFF" },
  nextButton: { width: 48, height: 48, borderRadius: 24, backgroundColor: ACCENT, alignItems: "center", justifyContent: "center" },
  nextText: { color: BACKGROUND, fontSize: 26, fontWeight: "700" },

  // Header
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingVertical: 12 },
  headerTitle: { color: "#FFFFFF", fontSize: 20, fontWeight: "700" },
  headerHelp: { color: TEXT_MUTED, fontSize: 20, borderColor: TEXT_MUTED, borderWidth: 1, borderRadius: 14, width: 28, height: 28, textAlign: "center", lineHeight: 26 },

  content: { padding: 16, gap: 14 },
  card: { backgroundColor: CARD, borderColor: BORDER, borderWidth: 1, borderRadius: 18, padding: 16, gap: 10 },
  sectionTitle: { color: ACCENT, fontSize: 15, fontWeight: "600" },

  // Nut bat dau
  startCircle: { alignSelf: "center", width: 96, height: 96, borderRadius: 48, backgroundColor: "#2A3556", alignItems: "center", justifyContent: "center", marginTop: 8 },
  startCircleOn: { backgroundColor: ACCENT },
  startIcon: { color: "#FFFFFF", fontSize: 30, fontWeight: "700" },
  centerText: { color: "#DCE3F5", fontSize: 14, textAlign: "center" },
  warning: { color: "#F5A524", fontSize: 13, textAlign: "center" },

  // Chon ngon ngu
  langRow: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  langColumn: { flex: 1, gap: 6 },
  langCaption: { color: "#DCE3F5", fontSize: 13, textAlign: "center" },
  langButton: { backgroundColor: BACKGROUND, borderRadius: 24, paddingVertical: 12, paddingHorizontal: 10, minHeight: 48, alignItems: "center", justifyContent: "center" },
  langButtonText: { color: "#FFFFFF", fontSize: 14 },
  swapButton: { width: 44, height: 48, alignItems: "center", justifyContent: "center" },
  swapText: { color: ACCENT, fontSize: 24 },

  // Cac dong cu chi
  gestureRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12, gap: 12 },
  gestureRowBorder: { borderBottomColor: BORDER, borderBottomWidth: 1 },
  gestureName: { color: "#FFFFFF", fontSize: 14, flexShrink: 1 },
  gestureAction: { color: TEXT_MUTED, fontSize: 13, flexShrink: 1, textAlign: "right" },

  // Cai dat
  input: { backgroundColor: BACKGROUND, color: "#FFFFFF", borderRadius: 12, padding: 12, fontSize: 15, minHeight: 44 },
  hint: { color: TEXT_MUTED, fontSize: 13 },
  ok: { color: ACCENT, fontSize: 15, fontWeight: "600" },
  secondaryButton: { borderWidth: 1, borderColor: ACCENT, borderRadius: 12, padding: 12, alignItems: "center", minHeight: 44, justifyContent: "center" },
  secondaryButtonText: { color: ACCENT, fontSize: 15, fontWeight: "600" },

  // Thanh tab
  tabBar: { flexDirection: "row", backgroundColor: "#0F1626", borderTopColor: BORDER, borderTopWidth: 1 },
  tabItem: { flex: 1, alignItems: "center", paddingVertical: 8, minHeight: 56, justifyContent: "center" },
  tabIcon: { color: TEXT_MUTED, fontSize: 22 },
  tabLabel: { color: TEXT_MUTED, fontSize: 12 },
  tabActive: { color: ACCENT },

  // Hop chon ngon ngu
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", padding: 24 },
  modalCard: { backgroundColor: CARD, borderRadius: 18, padding: 16, gap: 4 },
  modalItem: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 14, minHeight: 48 },
  modalItemText: { color: "#FFFFFF", fontSize: 16 },

  // Quan ly model
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 },
  primaryBtn: { backgroundColor: ACCENT, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10 },
  primaryBtnText: { color: BACKGROUND, fontWeight: "700", fontSize: 13 },
  emptyText: { color: TEXT_MUTED, fontSize: 13, lineHeight: 18, paddingVertical: 4 },
  modelCardItem: { backgroundColor: "#0F1626", borderColor: BORDER, borderWidth: 1, borderRadius: 12, padding: 12, gap: 10 },
  modelCardSelected: { borderColor: ACCENT },
  modelNameText: { color: "#FFFFFF", fontSize: 15, fontWeight: "600" },
  modelCodeText: { color: TEXT_MUTED, fontSize: 13 },
  modelUrlText: { color: "#64748B", fontSize: 12 },
  modelCodeSub: { color: TEXT_MUTED, fontSize: 12, marginTop: 2 },
  activeBadge: { backgroundColor: "rgba(20, 184, 166, 0.15)", paddingVertical: 4, paddingHorizontal: 8, borderRadius: 8 },
  activeBadgeText: { color: ACCENT, fontSize: 12, fontWeight: "600" },
  modelActionsRow: { flexDirection: "row", gap: 8, flexWrap: "wrap", borderTopColor: BORDER, borderTopWidth: 1, paddingTop: 8 },
  actionBtn: { borderColor: BORDER, borderWidth: 1, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10, backgroundColor: CARD },
  actionBtnText: { color: "#E2E8F0", fontSize: 12, fontWeight: "600" },
  actionBtnAccent: { backgroundColor: ACCENT, borderColor: ACCENT },
  actionBtnAccentText: { color: BACKGROUND, fontSize: 12, fontWeight: "700" },
  actionBtnDanger: { borderColor: "#7F1D1D", borderWidth: 1, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10, backgroundColor: "#450A0A" },
  actionBtnDangerText: { color: "#FCA5A5", fontSize: 12, fontWeight: "600" },
  systemModelRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 10, borderBottomColor: BORDER, borderBottomWidth: 1 },
  manageQuickBtn: { borderTopColor: BORDER, borderTopWidth: 1, marginTop: 8, paddingTop: 12, alignItems: "center" },
  manageQuickText: { color: ACCENT, fontSize: 14, fontWeight: "600" },
  modalCardLarge: { backgroundColor: CARD, borderRadius: 18, padding: 18, gap: 8, width: "100%", maxHeight: "85%" },
  inputLabel: { color: "#E2E8F0", fontSize: 13, fontWeight: "600", marginBottom: 4 },
  verifyBtn: { backgroundColor: "#1E293B", borderColor: ACCENT, borderWidth: 1, borderRadius: 10, paddingVertical: 10, alignItems: "center", marginTop: 4 },
  verifyBtnText: { color: ACCENT, fontSize: 14, fontWeight: "600" },
  modalBtnsRow: { flexDirection: "row", justifyContent: "flex-end", gap: 10, marginTop: 8 },
  cancelBtn: { paddingVertical: 10, paddingHorizontal: 18, borderRadius: 10, borderColor: TEXT_MUTED, borderWidth: 1 },
  cancelBtnText: { color: "#CBD5E1", fontSize: 14 },
  saveBtn: { backgroundColor: ACCENT, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10 },
  saveBtnText: { color: BACKGROUND, fontSize: 14, fontWeight: "700" },
});
