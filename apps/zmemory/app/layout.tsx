import { Analytics } from '@vercel/analytics/react';

export const metadata = {
  title: 'ZMemory API',
  description: 'ZMemory API Service - Personal Memory and Task Management',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
