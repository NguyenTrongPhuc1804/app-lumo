import { StyleSheet } from "react-native";

// Bang mau Bento Light theo thiet ke Stitch: nen sach, emerald lam mau hanh dong.
export const ACCENT = "#059669";
export const ACCENT_ON = "#FFFFFF";
export const BACKGROUND = "#F8FAFC";
export const CARD = "#FFFFFF";
export const CARD_ALT = "#F1F5F9";
export const BORDER = "#E2E8F0";
export const TEXT = "#0F172A";
export const TEXT_DIM = "#475569";
export const TEXT_MUTED = "#64748B";
export const DANGER = "#DC2626";
export const SECONDARY = "#0284C7";

// Be Vietnam Pro ho tro day du dau tieng Viet; ten phai khop app/_layout.tsx
export const FONT = "BeVietnamPro_400Regular";
export const FONT_MEDIUM = "BeVietnamPro_500Medium";
export const FONT_BOLD = "BeVietnamPro_700Bold";

// Bo goc va khoang cach dung chung cho cac khoi Bento
export const RADIUS = 22;
export const RADIUS_SM = 14;
export const GAP = 12;

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BACKGROUND },

  // Man gioi thieu
  onboardBody: { flex: 1, justifyContent: "center", paddingHorizontal: 20, gap: 20 },
  stepBadge: { alignSelf: "center", color: TEXT, backgroundColor: CARD_ALT, paddingVertical: 6, paddingHorizontal: 14, borderRadius: RADIUS_SM, fontSize: 13, fontFamily: FONT_MEDIUM, overflow: "hidden" },
  onboardTitle: { color: TEXT, fontSize: 28, fontFamily: FONT_BOLD, textAlign: "center", lineHeight: 36 },
  bulletCard: { backgroundColor: CARD, borderRadius: RADIUS, padding: 20, gap: 14 },
  bulletText: { color: TEXT_DIM, fontSize: 15, lineHeight: 22, fontFamily: FONT },
  onboardFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16 },
  skipButton: { borderColor: BORDER, borderWidth: 1, borderRadius: RADIUS_SM, paddingVertical: 10, paddingHorizontal: 18, minHeight: 48, justifyContent: "center" },
  skipText: { color: TEXT_DIM, fontSize: 14, fontFamily: FONT_MEDIUM },
  dots: { flexDirection: "row", gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: BORDER },
  dotActive: { width: 24, backgroundColor: ACCENT },
  nextButton: { width: 52, height: 52, borderRadius: 26, backgroundColor: ACCENT, alignItems: "center", justifyContent: "center" },
  nextText: { color: ACCENT_ON, fontSize: 26, fontFamily: FONT_BOLD },

  // Header
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingVertical: 14 },
  headerTitle: { color: TEXT, fontSize: 20, fontFamily: FONT_BOLD },
  headerHelp: { color: TEXT_DIM, fontSize: 18, fontFamily: FONT_MEDIUM, borderColor: BORDER, borderWidth: 1, borderRadius: RADIUS_SM, width: 48, height: 48, textAlign: "center", lineHeight: 46, overflow: "hidden" },

  content: { padding: 16, paddingBottom: 24, gap: GAP },
  card: { backgroundColor: CARD, borderRadius: RADIUS, borderColor: BORDER, borderWidth: 1, padding: 18, gap: 10 },
  bentoRow: { flexDirection: "row", flexWrap: "wrap", gap: GAP },
  bentoTile: { flexGrow: 1, flexBasis: 155, minWidth: 0, backgroundColor: CARD, borderColor: BORDER, borderWidth: 1, borderRadius: RADIUS, padding: 16, gap: 10 },
  pageTitle: { color: TEXT, fontSize: 24, lineHeight: 32, fontFamily: FONT_BOLD },
  statusBadge: { color: "#047857", backgroundColor: "#ECFDF5", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, fontSize: 12, fontFamily: FONT_MEDIUM, overflow: "hidden", alignSelf: "center" },
  infoBox: { backgroundColor: "#F0F9FF", borderRadius: RADIUS_SM, padding: 14, gap: 6 },
  sectionTitle: { color: TEXT, fontSize: 15, fontFamily: FONT_BOLD },
  caption: { color: TEXT_MUTED, fontSize: 12, fontFamily: FONT },
  hint: { color: TEXT_MUTED, fontSize: 13, lineHeight: 19, fontFamily: FONT },
  ok: { color: ACCENT, fontSize: 15, fontFamily: FONT_MEDIUM },
  warning: { color: "#92400E", fontSize: 13, textAlign: "center", fontFamily: FONT_MEDIUM },

  // Khoi bat dau dich
  startHero: { backgroundColor: CARD, borderColor: BORDER, borderWidth: 1, borderRadius: 24, padding: 20, gap: 10, alignItems: "center" },
  heroKicker: { color: ACCENT, fontSize: 12, fontFamily: FONT_BOLD },
  heroTitle: { color: TEXT, fontSize: 20, lineHeight: 28, fontFamily: FONT_BOLD, textAlign: "center" },
  heroText: { color: TEXT_MUTED, fontSize: 13, lineHeight: 20, fontFamily: FONT, textAlign: "center" },
  lensTrigger: { marginTop: 12, marginBottom: 4, borderRadius: 60, shadowColor: ACCENT, shadowOpacity: 0.18, shadowRadius: 16, shadowOffset: { width: 0, height: 10 }, elevation: 5, backgroundColor: CARD },
  lensRing: { width: 120, height: 120, borderRadius: 60, padding: 4 },
  lensFace: { flex: 1, borderRadius: 56, backgroundColor: CARD, borderColor: "#F1F5F9", borderWidth: 1, alignItems: "center", justifyContent: "center" },
  lensCore: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center", shadowColor: ACCENT, shadowOpacity: 0.25, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  lensActionLabel: { color: "#047857", backgroundColor: "#ECFDF5", borderColor: "#A7F3D0", borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4, fontSize: 11, letterSpacing: 0.8, fontFamily: FONT_BOLD },
  lensStatus: { color: TEXT, fontSize: 14, fontFamily: FONT_BOLD, textAlign: "center", marginTop: 2 },
  startCircle: { alignSelf: "center", width: 96, height: 96, borderRadius: 48, backgroundColor: CARD_ALT, alignItems: "center", justifyContent: "center", marginTop: 8 },
  startCircleOn: { backgroundColor: ACCENT },
  startIcon: { color: TEXT, fontSize: 30, fontFamily: FONT_BOLD },
  centerText: { color: TEXT_DIM, fontSize: 14, textAlign: "center", fontFamily: FONT },

  // Chon ngon ngu
  langPairCard: { backgroundColor: CARD, borderColor: BORDER, borderWidth: 1, borderRadius: RADIUS, padding: 18, gap: 10 },
  langRow: { gap: 8 },
  langColumn: { gap: 4 },
  langCaption: { color: TEXT_DIM, fontSize: 13, fontFamily: FONT_MEDIUM },
  langButton: { backgroundColor: "#F8FAFC", borderRadius: RADIUS_SM, paddingVertical: 12, paddingHorizontal: 12, minHeight: 48, alignItems: "center", justifyContent: "center" },
  langButtonText: { color: TEXT, fontSize: 14, fontFamily: FONT_MEDIUM },
  langPairValue: { color: TEXT, fontSize: 18, fontFamily: FONT_BOLD },
  swapButton: { alignSelf: "center", width: 48, height: 48, borderRadius: 24, backgroundColor: "#F0F9FF", alignItems: "center", justifyContent: "center" },
  swapText: { color: ACCENT, fontSize: 22 },

  // Cac dong cu chi
  gestureRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12, gap: 12 },
  gestureRowBorder: { borderBottomColor: BORDER, borderBottomWidth: 1 },
  gestureName: { color: TEXT, fontSize: 14, flexShrink: 1, fontFamily: FONT_MEDIUM },
  gestureAction: { color: TEXT_MUTED, fontSize: 13, flexShrink: 1, textAlign: "right", fontFamily: FONT },

  // Cai dat
  input: { backgroundColor: "#F8FAFC", color: TEXT, borderRadius: RADIUS_SM, padding: 14, fontSize: 15, minHeight: 48, fontFamily: FONT },
  inputLabel: { color: TEXT_DIM, fontSize: 13, fontFamily: FONT_MEDIUM, marginBottom: 6 },
  secondaryButton: { borderWidth: 1, borderColor: ACCENT, borderRadius: RADIUS_SM, padding: 13, alignItems: "center", minHeight: 48, justifyContent: "center" },
  secondaryButtonText: { color: ACCENT, fontSize: 15, fontFamily: FONT_MEDIUM },

  // Thanh tab
  tabBar: { flexDirection: "row", backgroundColor: CARD, borderColor: BORDER, borderWidth: 1, borderRadius: 36, margin: 16, marginTop: 0, padding: 6 },
  tabItem: { flex: 1, alignItems: "center", paddingVertical: 8, minHeight: 56, justifyContent: "center", borderRadius: 28, gap: 2 },
  tabItemActive: { backgroundColor: ACCENT },
  tabSelected: { color: ACCENT_ON },
  tabIcon: { color: TEXT_MUTED, fontSize: 20, fontFamily: FONT_MEDIUM },
  tabLabel: { color: TEXT_MUTED, fontSize: 12, fontFamily: FONT_MEDIUM },
  tabActive: { color: ACCENT },

  // Hop chon ngon ngu
  modalBackdrop: { flex: 1, backgroundColor: "rgba(8,9,14,0.72)", justifyContent: "center", padding: 24 },
  modalCard: { backgroundColor: CARD, borderRadius: RADIUS, padding: 18, gap: 4 },
  modalItem: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 14, minHeight: 48 },
  modalItemText: { color: TEXT, fontSize: 16, fontFamily: FONT },

  // Quan ly model
  iconLabel: { flexDirection: "row", alignItems: "center", gap: 8, flexShrink: 1 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 },
  primaryBtn: { backgroundColor: ACCENT, paddingVertical: 10, paddingHorizontal: 16, borderRadius: RADIUS_SM, minHeight: 48, justifyContent: "center" },
  primaryBtnText: { color: ACCENT_ON, fontFamily: FONT_BOLD, fontSize: 13 },
  emptyText: { color: TEXT_MUTED, fontSize: 13, lineHeight: 18, paddingVertical: 4, fontFamily: FONT },
  modelCardItem: { backgroundColor: CARD_ALT, borderRadius: RADIUS, padding: 14, gap: 10 },
  modelCardSelected: { backgroundColor: "#ECFDF5", borderColor: ACCENT, borderWidth: 1 },
  modelNameText: { color: TEXT, fontSize: 16, fontFamily: FONT_BOLD },
  modelCodeText: { color: TEXT_MUTED, fontSize: 13, fontFamily: FONT },
  modelUrlText: { color: TEXT_MUTED, fontSize: 12, fontFamily: FONT },
  modelCodeSub: { color: TEXT_MUTED, fontSize: 12, marginTop: 2, fontFamily: FONT },
  activeBadge: { backgroundColor: "#D1FAE5", paddingVertical: 4, paddingHorizontal: 10, borderRadius: RADIUS_SM },
  activeBadgeText: { color: ACCENT, fontSize: 12, fontFamily: FONT_BOLD },
  modelActionsRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  actionBtn: { borderRadius: RADIUS_SM, paddingVertical: 8, paddingHorizontal: 12, backgroundColor: "#F8FAFC", minHeight: 48, justifyContent: "center" },
  actionBtnText: { color: TEXT_DIM, fontSize: 12, fontFamily: FONT_MEDIUM },
  actionBtnAccent: { backgroundColor: ACCENT },
  actionBtnAccentText: { color: ACCENT_ON, fontSize: 12, fontFamily: FONT_BOLD },
  actionBtnDanger: { backgroundColor: "#FEF2F2", borderRadius: RADIUS_SM, paddingVertical: 8, paddingHorizontal: 12, minHeight: 48, justifyContent: "center" },
  actionBtnDangerText: { color: DANGER, fontSize: 12, fontFamily: FONT_MEDIUM },
  systemModelRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12, borderBottomColor: BORDER, borderBottomWidth: 1 },
  manageQuickBtn: { backgroundColor: CARD_ALT, borderRadius: RADIUS_SM, paddingVertical: 14, alignItems: "center", minHeight: 48, justifyContent: "center" },
  manageQuickText: { color: ACCENT, fontSize: 14, fontFamily: FONT_MEDIUM },
  modalCardLarge: { backgroundColor: CARD, borderRadius: RADIUS, padding: 20, gap: 8, width: "100%", maxHeight: "85%" },
  verifyBtn: { backgroundColor: CARD_ALT, borderColor: ACCENT, borderWidth: 1, borderRadius: RADIUS_SM, paddingVertical: 12, alignItems: "center", marginTop: 4, minHeight: 48, justifyContent: "center" },
  verifyBtnText: { color: ACCENT, fontSize: 14, fontFamily: FONT_MEDIUM },
  modalBtnsRow: { flexDirection: "row", justifyContent: "flex-end", gap: 10, marginTop: 8 },
  cancelBtn: { paddingVertical: 12, paddingHorizontal: 18, borderRadius: RADIUS_SM, borderColor: BORDER, borderWidth: 1, minHeight: 48, justifyContent: "center" },
  cancelBtnText: { color: TEXT_DIM, fontSize: 14, fontFamily: FONT_MEDIUM },
  saveBtn: { backgroundColor: ACCENT, paddingVertical: 12, paddingHorizontal: 20, borderRadius: RADIUS_SM, minHeight: 48, justifyContent: "center" },
  saveBtnText: { color: ACCENT_ON, fontSize: 14, fontFamily: FONT_BOLD },
});
