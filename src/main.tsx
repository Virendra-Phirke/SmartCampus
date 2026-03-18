import { createRoot } from "react-dom/client";
import { ClerkProvider } from "@clerk/clerk-react";
import { dark } from "@clerk/themes";
import App from "./App.tsx";
import "./index.css";

const CLERK_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!CLERK_KEY) {
    console.warn(
        "Clerk publishable key missing. Set VITE_CLERK_PUBLISHABLE_KEY in your .env file."
    );
}

createRoot(document.getElementById("root")!).render(
    <ClerkProvider
        publishableKey={CLERK_KEY || "pk_test_placeholder"}
        afterSignOutUrl="/"
        signInUrl="/sign-in"
        signUpUrl="/sign-up"
        appearance={{
            baseTheme: dark
        }}
    >
        <App />
    </ClerkProvider>
);
