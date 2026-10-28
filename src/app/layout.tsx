import "./globals.css";
export const metadata = {
  title: "DataDrift",
  description: "데이터와 모델 관리",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
