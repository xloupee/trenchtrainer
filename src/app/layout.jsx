import './globals.css';

export const metadata = {
  title: 'Trenches Trainer — React Fast. Trade Faster.',
  description: 'Gamified reaction time training for crypto traders. Practice solo or duel 1v1 — identify the right token before the window closes.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
