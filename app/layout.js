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
    default: 'Beautyx — Il gestionale AI per centri estetici',
    template: '%s | Beautyx',
  },
  description: "Beautyx affianca il tuo centro estetico con intelligenza artificiale e consulenti HPA dedicati: analisi dei dati, ottimizzazione dei ricavi e strategia di crescita in un'unica piattaforma.",
  keywords: ['gestionale centro estetico', 'software centro estetico', 'intelligenza artificiale beauty', 'consulenza centro estetico', 'prenotazioni online centro estetico', 'gestione salone bellezza', 'CRM centro estetico', 'beautyx'],
  authors: [{ name: 'Beautyx' }],
  creator: 'Beautyx',
  openGraph: {
    type: 'website',
    locale: 'it_IT',
    url: siteUrl,
    siteName: 'Beautyx',
    title: 'Beautyx — Il gestionale AI per centri estetici',
    description: "AI e consulenti HPA dedicati per far crescere il tuo centro estetico. Analisi dati, ottimizzazione ricavi e strategia in un'unica piattaforma.",
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Beautyx — Gestionale AI per centri estetici' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Beautyx — Il gestionale AI per centri estetici',
    description: 'AI e consulenti HPA dedicati per far crescere il tuo centro estetico.',
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
    {
      '@type': 'SoftwareApplication',
      name: 'Beautyx',
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR', description: 'Piano demo gratuito disponibile' },
      description: 'Piattaforma SaaS con AI e consulenti HPA per la gestione e crescita dei centri estetici italiani.',
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
