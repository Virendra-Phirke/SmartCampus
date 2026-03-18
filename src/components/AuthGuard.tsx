import { useAuth } from "@clerk/clerk-react";
import { Navigate } from "react-router-dom";

interface AuthGuardProps {
    children: React.ReactNode;
}

const AuthGuard = ({ children }: AuthGuardProps) => {
    const { isLoaded, isSignedIn } = useAuth();

    if (!isLoaded) {
        return (
            <div className="min-h-full flex items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center animate-pulse">
                        <span className="text-xl">🗺️</span>
                    </div>
                    <p className="text-muted-foreground text-sm">Loading CampusMate...</p>
                </div>
            </div>
        );
    }

    if (!isSignedIn) {
        return <Navigate to="/sign-in" replace />;
    }

    return <>{children}</>;
};

export default AuthGuard;
