import { Geist, Geist_Mono, Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import ClientLayout from "@/components/providers/ClientLayout";
import CookieNotice from "@/components/common/CookieNotice";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap" });
const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["700", "900"],
  style: ["normal", "italic"],
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://beautyx.it'

export const metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Beautyx — Newsletter gratuita per centri estetici',
    template: '%s | Beautyx',
  },
  description: "Beautyx: newsletter gratuita per centri estetici. AI e consulente umano selezionano contenuti dal mondo e li rendono operativi in Italia. Miniguida omaggio.",
  keywords: ['newsletter centri estetici', 'gestione centro estetico', 'consulenza centro estetico', 'errori gestione centro estetico', 'intelligenza artificiale beauty', 'gestione salone bellezza', 'beautyx'],
  authors: [{ name: 'Beautyx' }],
  creator: 'Beautyx',
  openGraph: {
    type: 'website',
    locale: 'it_IT',
    url: siteUrl,
    siteName: 'Beautyx',
    title: 'Beautyx — La newsletter gratuita per chi ha (o vuole aprire) un centro estetico',
    description: "Un'intelligenza artificiale cerca nel mondo i migliori contenuti sulla gestione dei centri estetici, un consulente umano li rende operativi in Italia. In omaggio la miniguida 10 errori comuni.",
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Beautyx — Newsletter gratuita per centri estetici' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Beautyx — La newsletter gratuita per chi ha (o vuole aprire) un centro estetico',
    description: "L'AI seleziona i migliori contenuti sulla gestione dei centri estetici nel mondo, un consulente umano li rende operativi per l'Italia. Iscriviti e ricevi la miniguida gratuita.",
    images: ['/og-image.png'],
  },
  robots: { index: true, follow: true },
  alternates: { canonical: siteUrl },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      name: 'Beautyx',
      url: siteUrl,
    },
  ],
}

export default function RootLayout({ children }) {
  const plausibleDomain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN
  return (
    <html lang="it">
      <head>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        {plausibleDomain && (
          <script defer data-domain={plausibleDomain} src="https://plausible.io/js/script.js" />
        )}
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} ${playfair.variable} antialiased`}>
        <AuthProvider>
          <ClientLayout>
            {children}
          </ClientLayout>
        </AuthProvider>
        <CookieNotice />
      </body>
    </html>
  )
}
