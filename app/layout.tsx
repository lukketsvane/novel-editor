import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Markdown Editor',
  description: 'A powerful Markdown editor built with Next.js and Tiptap',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} h-full overflow-auto`}>
        <div className="min-h-full">
          {children}
        </div>
      </body>
    </html>
  )
}