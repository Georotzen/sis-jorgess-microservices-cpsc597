export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <title>Student Information System</title>
        <meta name="description" content="SIS Portal" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body style={{ margin: 0, fontFamily: 'sans-serif' }}>
        {children}
      </body>
    </html>
  );
}
