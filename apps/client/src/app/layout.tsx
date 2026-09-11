import { ReactNode } from 'react';
import RootLayoutClient from './layout-client';

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <title>Student Information System</title>
        <meta name="description" content="SIS Portal" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body style={{ margin: 0, fontFamily: 'sans-serif' }}>
        <RootLayoutClient>{children}</RootLayoutClient>
      </body>
    </html>
  );
}
