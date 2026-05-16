import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Registro de Normi",
  description: "Registra tu perfil para chatear con Normi, el asistente virtual de la Escuela Normal Superior de Corozal.",
  icons: {
    icon: "/escudo.webp",
    apple: "/escudo.webp",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
