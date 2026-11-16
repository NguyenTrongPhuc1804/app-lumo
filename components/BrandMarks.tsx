import Svg, { Path } from "react-native-svg";

// Dung dung path SVG cua Google va Facebook trong thiet ke Stitch,
// thay vi ve tay hay dung chu cai lam bieu tuong.

export function GoogleMark({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessible={false} importantForAccessibility="no">
      <Path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <Path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <Path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
        fill="#FBBC05"
      />
      <Path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
        fill="#EA4335"
      />
    </Svg>
  );
}

// Bieu tuong Facebook dang dia tron dac; mau truyen vao de dung duoc tren nen xanh lan nen trang.
export function FacebookMark({ size = 20, color = "#FFFFFF" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessible={false} importantForAccessibility="no">
      <Path
        d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"
        fill={color}
      />
    </Svg>
  );
}

// Van tay ve bang duong cong long nhau, doc ro o co 14-16px.
// Font icon da sub-set khong co glyph van tay nen ve rieng thay vi tai them font.
export function FingerprintMark({ size = 16, color = "#059669" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" accessible={false} importantForAccessibility="no">
      <Path d="M4.6 10a8.7 8.7 0 0 1 14.8 0" stroke={color} strokeWidth={1.7} strokeLinecap="round" />
      <Path d="M7 11.2a5.9 5.9 0 0 1 10 0" stroke={color} strokeWidth={1.7} strokeLinecap="round" />
      <Path d="M9.5 12.3a3.1 3.1 0 0 1 5 0" stroke={color} strokeWidth={1.7} strokeLinecap="round" />
      <Path d="M12 12.9v4.4" stroke={color} strokeWidth={1.7} strokeLinecap="round" />
      <Path d="M7.7 16.8c.6 1.2 1.5 2.1 2.4 2.6" stroke={color} strokeWidth={1.7} strokeLinecap="round" />
      <Path d="M16.3 16.8c-.6 1.2-1.5 2.1-2.4 2.6" stroke={color} strokeWidth={1.7} strokeLinecap="round" />
    </Svg>
  );
}
