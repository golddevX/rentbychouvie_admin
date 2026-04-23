import React from 'react';
import './globals.css';

export const metadata = {
  title: 'Lumiere Operations',
  description: 'Bộ vận hành cao cấp cho hệ thống cho thuê thời trang',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
