import './globals.css';
import '@flaticon/flaticon-uicons/css/regular/rounded.css';
import { Inter, Manrope } from 'next/font/google';
import { cookies } from 'next/headers';
import { AdminAuthProvider } from '../shared/auth/AuthContext';

const inter = Inter({ subsets: ['latin'] });
const manrope = Manrope({ subsets: ['latin'], variable: '--font-manrope' });

export const metadata = {
  title: 'Chormokar Admin',
  description: 'Admin dashboard for Chormokar',
  icons: {
    icon: [
      { url: '/favicon.ico?v=17', sizes: 'any' },
      { url: '/favicon.svg?v=17', type: 'image/svg+xml' },
    ],
    apple: '/apple-icon.png',
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // The theme lives in a cookie so the server can render the right class on the
  // first paint. A client <script> cannot do this without React 19 warning, and
  // reading localStorage after hydration would flash white for a frame.
  const theme = (await cookies()).get('admin-theme')?.value;
  const isDark = theme === 'dark';

  return (
    <html lang="en" className={isDark ? 'dark' : undefined} suppressHydrationWarning>
      <body className={`${inter.className} ${manrope.variable}`} suppressHydrationWarning>
        <AdminAuthProvider>{children}</AdminAuthProvider>
      </body>
    </html>
  );
}
