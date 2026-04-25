import "./globals.css";
import { PhoneShell } from "@/components/phone-shell";

export const metadata = {
  title: "AI 옷입히기",
  description: "의상을 생성하고 실루엣에 배치해 엄마 AI에게 평가받는 MVP 서비스"
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>
        <PhoneShell>{children}</PhoneShell>
      </body>
    </html>
  );
}
