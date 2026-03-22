import { ClerkProvider } from "@clerk/clerk-react";
import { dark } from "@clerk/themes";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import App from "@/App";

const CLERK_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

/**
 * Applies Clerk appearance from next-themes (avoids flash by waiting for resolved theme).
 */
export function ClerkRoot() {
 const { resolvedTheme } = useTheme();
 const [mounted, setMounted] = useState(false);

 useEffect(() => {
 setMounted(true);
 }, []);

 const isDark = !mounted || resolvedTheme !== "light";

 return (
 <ClerkProvider
 publishableKey={CLERK_KEY || "pk_test_placeholder"}
 afterSignOutUrl="/"
 signInUrl="/sign-in"
 signUpUrl="/sign-up"
 appearance={{
 baseTheme: isDark ? dark : undefined,
 variables: isDark
 ? undefined
 : {
 colorPrimary: "hsl(172, 48%, 36%)",
 colorBackground: "hsl(0, 0%, 100%)",
 colorInputBackground: "hsl(210, 25%, 97%)",
 },
 }}
 >
 <App />
 </ClerkProvider>
 );
}
