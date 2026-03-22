import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SignedIn, SignedOut } from "@clerk/clerk-react";
import { Navigate } from "react-router-dom";
import { AppDialogProvider } from "@/components/AppDialogProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import { useGlobalNotifications } from "@/hooks/useGlobalNotifications";
import NotificationEnforcer from "@/components/NotificationEnforcer";
import { AuthProvider } from "@/components/AuthProvider";
import { isLocalAdminAuthenticated } from "@/lib/adminAuth";

const GlobalNotifier = () => {
  useGlobalNotifications();
  return null;
};

const Index = lazy(() => import("./pages/Index"));
const NotFound = lazy(() => import("./pages/NotFound"));
const SignInPage = lazy(() => import("./pages/SignIn"));
const SignUpPage = lazy(() => import("./pages/SignUp"));
const QrSessionDetails = lazy(() => import("./pages/QrSessionDetails"));
const AdminCampusWorkspace = lazy(() => import("./components/admin/AdminCampusWorkspace"));
const AdminCampusData = lazy(() => import("./components/admin/AdminCampusData"));
const AdminCampusPeople = lazy(() => import("./components/admin/AdminCampusPeople"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const AppLoading = () => (
  <div className="min-h-screen w-full bg-background flex items-center justify-center">
    <div className="h-8 w-8 rounded-full border-2 border-primary/40 border-t-primary animate-spin" />
  </div>
);

const App = () => (
  <ThemeProvider defaultTheme="system">
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <GlobalNotifier />
        <NotificationEnforcer />
        <TooltipProvider>
          <AppDialogProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Suspense fallback={<AppLoading />}>
                {(() => {
                  const localAdminAuthenticated = isLocalAdminAuthenticated();
                  return (
                <Routes>
                {/* Public auth routes */}
                <Route path="/sign-in/*" element={<SignInPage />} />
                <Route path="/sign-up/*" element={<SignUpPage />} />

                {/* Protected routes */}
                <Route
                  path="/"
                  element={
                    localAdminAuthenticated ? (
                      <Index />
                    ) : (
                      <>
                        <SignedIn>
                          <Index />
                        </SignedIn>
                        <SignedOut>
                          <Navigate to="/sign-in" replace />
                        </SignedOut>
                      </>
                    )
                  }
                />

                <Route
                  path="/attendance/session/:sessionId"
                  element={
                    <>
                      <SignedIn>
                        <QrSessionDetails />
                      </SignedIn>
                      <SignedOut>
                        <Navigate to="/sign-in" replace />
                      </SignedOut>
                    </>
                  }
                />

                <Route
                  path="/admin/campus/:campusId"
                  element={
                    localAdminAuthenticated ? (
                      <AdminCampusWorkspace />
                    ) : (
                      <>
                        <SignedIn>
                          <AdminCampusWorkspace />
                        </SignedIn>
                        <SignedOut>
                          <Navigate to="/sign-in" replace />
                        </SignedOut>
                      </>
                    )
                  }
                />

                <Route
                  path="/admin/campus/:campusId/map"
                  element={
                    localAdminAuthenticated ? (
                      <AdminCampusWorkspace />
                    ) : (
                      <>
                        <SignedIn>
                          <AdminCampusWorkspace />
                        </SignedIn>
                        <SignedOut>
                          <Navigate to="/sign-in" replace />
                        </SignedOut>
                      </>
                    )
                  }
                />

                <Route
                  path="/admin/campus/:campusId/data"
                  element={
                    localAdminAuthenticated ? (
                      <AdminCampusData />
                    ) : (
                      <>
                        <SignedIn>
                          <AdminCampusData />
                        </SignedIn>
                        <SignedOut>
                          <Navigate to="/sign-in" replace />
                        </SignedOut>
                      </>
                    )
                  }
                />

                <Route
                  path="/admin/campus/:campusId/people"
                  element={
                    localAdminAuthenticated ? (
                      <AdminCampusPeople />
                    ) : (
                      <>
                        <SignedIn>
                          <AdminCampusPeople />
                        </SignedIn>
                        <SignedOut>
                          <Navigate to="/sign-in" replace />
                        </SignedOut>
                      </>
                    )
                  }
                />

                {/* Catch-all */}
                <Route path="*" element={<NotFound />} />
                </Routes>
                  );
                })()}
              </Suspense>
            </BrowserRouter>
          </AppDialogProvider>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
