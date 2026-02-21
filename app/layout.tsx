import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AI 릴레이 만화',
  description: '그림 실력 없어도 만화 작가가 되는 서비스',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang='ko'>
      <body>{children}</body>
    </html>
  );
}
