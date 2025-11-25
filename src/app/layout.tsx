import './globals.css';

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={
          'antialiased bg-gradient-to-b from-white to-gray-100 dark:from-gray-900 dark:to-gray-800'
        }
      >
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
