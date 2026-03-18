import { useState } from "react";
import { useSignUp } from "@clerk/clerk-react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, ArrowRight, Loader2, AlertCircle, KeyRound, CheckCircle2 } from "lucide-react";

export default function SignUpPage() {
    const { isLoaded, signUp, setActive } = useSignUp();
    const [emailAddress, setEmailAddress] = useState("");
    const [password, setPassword] = useState("");
    const [pendingVerification, setPendingVerification] = useState(false);
    const [code, setCode] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isLoaded) return;
        setIsLoading(true);
        setError("");

        try {
            await signUp.create({
                emailAddress,
                password,
            });

            // send the email
            await signUp.prepareEmailAddressVerification({ strategy: "email_code" });

            // switch to the verification UI
            setPendingVerification(true);
        } catch (err: any) {
            console.error(err);
            setError(err.errors?.[0]?.message || "Failed to sign up.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isLoaded) return;
        setIsLoading(true);
        setError("");

        try {
            const completeSignUp = await signUp.attemptEmailAddressVerification({
                code,
            });

            if (completeSignUp.status !== "complete") {
                console.warn(completeSignUp);
                setError("Invalid verification code. Please try again.");
            }

            if (completeSignUp.status === "complete") {
                await setActive({ session: completeSignUp.createdSessionId });
                navigate("/");
                // Note: They will be prompted to complete their profile (ProfileForm) upon hitting the profile tab
            }
        } catch (err: any) {
            console.error(err);
            setError(err.errors?.[0]?.message || "Failed to verify email.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-full flex items-center justify-center bg-background px-4 py-12">
            <AnimatePresence mode="wait">
                {!pendingVerification ? (
                    <motion.div
                        key="signup"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="w-full max-w-md bg-card border border-border/50 rounded-3xl p-8 shadow-2xl relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-[100px] pointer-events-none" />

                        <div className="text-center mb-8 relative z-10">
                            <div className="inline-flex items-center gap-2.5 mb-5">
                                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-inner">
                                    <span className="text-2xl drop-shadow-md">🗺️</span>
                                </div>
                            </div>
                            <h1 className="text-2xl font-heading font-bold text-foreground">Join CampusMate</h1>
                            <p className="text-muted-foreground text-sm mt-1">Create your account to get started</p>
                        </div>

                        {error && (
                            <div className="mb-6 bg-destructive/10 border border-destructive/20 text-destructive text-sm p-3 rounded-xl flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                <p className="flex-1">{error}</p>
                            </div>
                        )}

                        <form onSubmit={handleSignUp} className="space-y-5 relative z-10">
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-foreground pl-1">Email Address</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <input
                                        type="email"
                                        value={emailAddress}
                                        onChange={(e) => setEmailAddress(e.target.value)}
                                        required
                                        className="w-full bg-muted/30 border border-border/60 rounded-xl pl-9 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-foreground"
                                        placeholder="student@college.edu"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-foreground pl-1">Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        className="w-full bg-muted/30 border border-border/60 rounded-xl pl-9 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-foreground"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading || !emailAddress || !password}
                                className="w-full flex items-center justify-center gap-2 py-3.5 mt-2 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none group shadow-lg shadow-primary/20"
                            >
                                {isLoading ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <>
                                        Continue
                                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </button>
                        </form>

                        <div className="mt-8 text-center relative z-10">
                            <p className="text-sm text-muted-foreground">
                                Already have an account?{" "}
                                <Link to="/sign-in" className="text-primary hover:text-primary/80 font-semibold transition-colors">
                                    Sign in
                                </Link>
                            </p>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div
                        key="verify"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="w-full max-w-md bg-card border border-border/50 rounded-3xl p-8 shadow-2xl relative overflow-hidden"
                    >
                        <div className="text-center mb-8 relative z-10">
                            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 mx-auto mb-4">
                                <Mail className="w-8 h-8 text-primary" />
                            </div>
                            <h1 className="text-2xl font-heading font-bold text-foreground">Verify your email</h1>
                            <p className="text-muted-foreground text-sm mt-2">
                                We've sent a code to <span className="font-semibold text-foreground">{emailAddress}</span>.
                            </p>
                        </div>

                        {error && (
                            <div className="mb-6 bg-destructive/10 border border-destructive/20 text-destructive text-sm p-3 rounded-xl flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                <p className="flex-1">{error}</p>
                            </div>
                        )}

                        <form onSubmit={handleVerify} className="space-y-5 relative z-10">
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-foreground pl-1">Verification Code</label>
                                <div className="relative">
                                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <input
                                        value={code}
                                        onChange={(e) => setCode(e.target.value)}
                                        required
                                        className="w-full bg-muted/30 border border-border/60 rounded-xl pl-9 pr-4 py-3 text-center tracking-widest text-lg font-bold focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-foreground"
                                        placeholder="000 000"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading || !code}
                                className="w-full flex items-center justify-center gap-2 py-3.5 mt-2 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none shadow-lg shadow-primary/20"
                            >
                                {isLoading ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <>
                                        Verify & Create Account
                                        <CheckCircle2 className="w-4 h-4 ml-1" />
                                    </>
                                )}
                            </button>
                        </form>

                        <button
                            onClick={() => setPendingVerification(false)}
                            className="mt-6 text-sm text-muted-foreground hover:text-foreground mx-auto block transition-colors"
                        >
                            Wait, I need to change my email
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
