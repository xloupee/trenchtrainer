import './globals.css';

export const metadata = {
  title: 'Trenches Trainer',
  description: 'Reaction trainer',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
