import './globals.css';
import { Analytics } from '@vercel/analytics/react';

export const metadata = {
  title: 'Trenches Trainer — React Fast. Trade Faster.',
  description: 'Gamified reaction time training for crypto traders. Train solo or duel 1v1 — identify the right token before the window closes.',
  icons: {
    icon: '/logo.png',
    shortcut: '/logo.png',
    apple: '/logo.png',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
