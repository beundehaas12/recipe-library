import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/lib/query/provider";
import { RealtimeProvider } from "@/lib/hooks/useRealtime";
import { createClient } from "@/lib/supabase/server";
import MainLayout from "@/components/MainLayout";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Forkify - Alle recepten op 1 plek",
  description: "Jouw persoonlijke kookboek, verrijkt met AI. Scan recepten, zoek slim, en ontdek nieuwe smaken.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let profile = null;
  let role: 'user' | 'author' | 'admin' | null = null;

  if (user) {
    const [{ data: userProfile }, { data: userRole }] = await Promise.all([
      supabase.from('user_profiles').select('*').eq('user_id', user.id).single(),
      supabase.from('user_roles').select('role').eq('user_id', user.id).single(),
    ]);
    profile = userProfile;
    role = (userRole?.role as 'user' | 'author' | 'admin') ?? null;
  }

  return (
    <html lang="nl">
      <body className={`${inter.variable} font-sans`}>
        <QueryProvider>
          <RealtimeProvider>
            {user ? (
              <MainLayout user={user} profile={profile} role={role}>
                {children}
              </MainLayout>
            ) : (
              // If not logged in, we might still want the structure or just children (login page)
              // Assuming login page handles its own layout or is fine without MainLayout wrapper?
              // The current Login Page has no header. So we can conditionally render MainLayout.
              // But wait, if we are NOT logged in, MainLayout might crash or show empty user.
              // MainLayout expects 'user'.
              // If user is null, we pass children directly.
              children
            )}
          </RealtimeProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
