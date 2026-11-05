import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title:"OAATZ Recruitment Outreach", description:"B2B recruitment partnership CRM" };
export default function RootLayout({children}:{children:React.ReactNode}) { return <html lang="en"><body>{children}</body></html>; }
