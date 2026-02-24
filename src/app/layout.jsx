import './globals.css';
import "@solana/wallet-adapter-react-ui/styles.css";
import { Analytics } from '@vercel/analytics/react';
import SolanaWalletProvider from '../components/wallet/SolanaWalletProvider';

export const metadata = {
  title: 'Trenches Trainer',
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
        <SolanaWalletProvider>{children}</SolanaWalletProvider>
        <Analytics />
      </body>
    </html>
  );
}
