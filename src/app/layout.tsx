import type { Metadata, Viewport } from "next";
import { ThemeProvider, IntlProviderWrapper } from "@/components";
import { AuthProvider } from "@/providers/AuthProvider";
import "./globals.css";

// Primary Arabic font is "Glass Flowers 3D 2" loaded via @font-face in globals.css

export const metadata: Metadata = {
  title: "Rasmalak - Your Smart Financial Advisor | راسمالك",
  description: "Rasmalak is your AI-powered personal financial advisor. Budget management, expense tracking, and financial planning in Arabic and English. راسمالك هو مستشارك المالي الشخصي بالذكاء الاصطناعي.",
  keywords: ["rasmalak", "راسمالك", "personal finance", "تمويل شخصي", "budget", "ميزانية", "AI", "ذكاء اصطناعي", "financial management", "إدارة مالية"],
  authors: [{ name: "Rasmalak AI" }],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Rasmalak",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "ar_SA",
    alternateLocale: "en_US",
    siteName: "Rasmalak",
    title: "Rasmalak - Your Smart Financial Advisor",
    description: "AI-powered personal financial advisor for budget management and financial planning",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#1B4D3E",
  viewportFit: "cover",
};

// Inline script to prevent layout shift by setting lang/dir/theme before React hydrates
const initScript = `
(function() {
  try {
    var stored = localStorage.getItem('rasmalak-storage');
    if (!stored) {
      // DEV: default to English for visual review
      stored = JSON.stringify({state:{language:'en',theme:'light'}});
      localStorage.setItem('rasmalak-storage', stored);
    }
    if (stored) {
      var data = JSON.parse(stored);
      var state = data.state || {};
      // Set language direction
      if (state.language) {
        document.documentElement.lang = state.language;
        document.documentElement.dir = state.language === 'ar' ? 'rtl' : 'ltr';
      }
      // Set theme
      if (state.theme) {
        document.documentElement.setAttribute('data-theme', state.theme);
        if (state.theme === 'dark') {
          document.documentElement.classList.add('dark');
          document.body.style.backgroundColor = '#0B0E14';
        } else {
          document.body.style.backgroundColor = '#F9FAFB';
        }
      }
    }
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: initScript }} />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      </head>
      <body className="antialiased">
        {/* Soft mesh gradient background */}
        <div className="mesh-gradient-bg" aria-hidden="true" />
        <AuthProvider>
          <ThemeProvider>
            <IntlProviderWrapper>
              <div className="soft-surface">
                {children}
              </div>
            </IntlProviderWrapper>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
