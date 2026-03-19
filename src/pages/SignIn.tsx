import { useState } from "react";
import { useSignIn } from "@clerk/clerk-react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, ArrowRight, Loader2, AlertCircle, Eye, EyeOff, User, KeyRound } from "lucide-react";

type AuthMode = 'email' | 'username' | 'otp';

export default function SignInPage() {
    const { isLoaded, signIn, setActive } = useSignIn();
    const [mode, setMode] = useState<AuthMode>('email');
    const [identifier, setIdentifier] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [otpCode, setOtpCode] = useState("");
    const [otpSent, setOtpSent] = useState(false);
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    // ── Email + Password / Username + Password ──
    const handlePasswordSignIn = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isLoaded) return;
        setIsLoading(true);
        setError("");

        try {
            const result = await signIn.create({ identifier, password });

            if (result.status === "complete") {
                await setActive({ session: result.createdSessionId });
                navigate("/");
            } else if (result.status === "needs_first_factor") {
                // Multi-factor: try completing with password
                const firstFactor = result.supportedFirstFactors?.find(
                    (f) => f.strategy === "password"
                );
                if (firstFactor) {
                    const attempt = await signIn.attemptFirstFactor({ strategy: "password", password });
                    if (attempt.status === "complete") {
                        await setActive({ session: attempt.createdSessionId });
                        navigate("/");
                    } else {
                        setError("Additional verification required. Try email OTP.");
                    }
                } else {
                    setError("Password sign-in not available. Try email OTP.");
                }
            } else {
                setError(`Sign-in status: ${result.status}. Try another method.`);
            }
        } catch (err: any) {
            console.error(err);
            setError(err.errors?.[0]?.message || "Failed to sign in. Check your credentials.");
        } finally {
            setIsLoading(false);
        }
    };

    // ── Email OTP — Step 1: Send Code ──
    const handleSendOTP = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isLoaded) return;
        setIsLoading(true);
        setError("");

        try {
            const result = await signIn.create({ identifier });

            // Find email_code strategy
            const emailFactor = result.supportedFirstFactors?.find(
                (f) => f.strategy === "email_code"
            );

            if (emailFactor && 'emailAddressId' in emailFactor) {
                await signIn.prepareFirstFactor({
                    strategy: "email_code",
                    emailAddressId: emailFactor.emailAddressId,
                });
                setOtpSent(true);
            } else {
                setError("Email OTP is not available for this account. Try password sign-in.");
            }
        } catch (err: any) {
            console.error(err);
            setError(err.errors?.[0]?.message || "Failed to send OTP.");
        } finally {
            setIsLoading(false);
        }
    };

    // ── Email OTP — Step 2: Verify Code ──
    const handleVerifyOTP = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isLoaded) return;
        setIsLoading(true);
        setError("");

        try {
            const result = await signIn.attemptFirstFactor({
                strategy: "email_code",
                code: otpCode,
            });

            if (result.status === "complete") {
                await setActive({ session: result.createdSessionId });
                navigate("/");
            } else {
                setError(`Verification status: ${result.status}`);
            }
        } catch (err: any) {
            console.error(err);
            setError(err.errors?.[0]?.message || "Invalid code.");
        } finally {
            setIsLoading(false);
        }
    };

    const resetState = () => {
        setIdentifier("");
        setPassword("");
        setOtpCode("");
        setOtpSent(false);
        setError("");
    };

    const modes: { id: AuthMode; label: string; icon: typeof Mail }[] = [
        { id: 'email', label: 'Email', icon: Mail },
        { id: 'username', label: 'Username', icon: User },
        { id: 'otp', label: 'Email OTP', icon: KeyRound },
    ];

    return (
        <div className="min-h-full flex items-center justify-center bg-background px-4 py-12">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md bg-card border border-border/50 rounded-3xl p-8 shadow-2xl relative overflow-hidden"
            >
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-[100px] pointer-events-none" />

                <div className="text-center mb-6 relative z-10">
                    <div className="inline-flex items-center gap-2.5 mb-4">
                        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-inner">
                            <span className="text-2xl drop-shadow-md">🗺️</span>
                        </div>
                    </div>
                    <h1 className="text-2xl font-heading font-bold text-foreground">Welcome Back</h1>
                    <p className="text-muted-foreground text-sm mt-1">Sign in to navigate your campus</p>
                </div>

                {/* ─── Auth Mode Tabs ─── */}
                <div className="flex gap-1 bg-muted/50 rounded-xl p-1 mb-6">
                    {modes.map((m) => (
                        <button
                            key={m.id}
                            onClick={() => { setMode(m.id); resetState(); }}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${mode === m.id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            <m.icon className="w-3.5 h-3.5" />
                            {m.label}
                        </button>
                    ))}
                </div>

                {error && (
                    <div className="mb-5 bg-destructive/10 border border-destructive/20 text-destructive text-sm p-3 rounded-xl flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <p className="flex-1">{error}</p>
                    </div>
                )}

                <AnimatePresence mode="wait">
                    {/* ─── Email/Password or Username/Password ─── */}
                    {(mode === 'email' || mode === 'username') && (
                        <motion.form
                            key="password-form"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 10 }}
                            onSubmit={handlePasswordSignIn}
                            className="space-y-4 relative z-10"
                        >
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-foreground pl-1">
                                    {mode === 'email' ? 'Email Address' : 'Username'}
                                </label>
                                <div className="relative">
                                    {mode === 'email' ? (
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    ) : (
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    )}
                                    <input
                                        type={mode === 'email' ? 'email' : 'text'}
                                        value={identifier}
                                        onChange={(e) => setIdentifier(e.target.value)}
                                        required
                                        className="w-full bg-muted/30 border border-border/60 rounded-xl pl-9 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-foreground"
                                        placeholder={mode === 'email' ? 'student@college.edu' : 'your_username'}
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-foreground pl-1">Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        className="w-full bg-muted/30 border border-border/60 rounded-xl pl-9 pr-10 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-foreground"
                                        placeholder="••••••••"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                                    >
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading || !identifier || !password}
                                className="w-full flex items-center justify-center gap-2 py-3.5 mt-2 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none group shadow-lg shadow-primary/20"
                            >
                                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                                    <>Sign In<ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></>
                                )}
                            </button>
                        </motion.form>
                    )}

                    {/* ─── Email OTP ─── */}
                    {mode === 'otp' && !otpSent && (
                        <motion.form
                            key="otp-send"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 10 }}
                            onSubmit={handleSendOTP}
                            className="space-y-4 relative z-10"
                        >
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-foreground pl-1">Email Address</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <input
                                        type="email"
                                        value={identifier}
                                        onChange={(e) => setIdentifier(e.target.value)}
                                        required
                                        className="w-full bg-muted/30 border border-border/60 rounded-xl pl-9 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-foreground"
                                        placeholder="student@college.edu"
                                    />
                                </div>
                                <p className="text-[10px] text-muted-foreground pl-1 mt-1">
                                    We'll send a one-time code to your email
                                </p>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading || !identifier}
                                className="w-full flex items-center justify-center gap-2 py-3.5 mt-2 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none group shadow-lg shadow-primary/20"
                            >
                                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                                    <>Send Code<KeyRound className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></>
                                )}
                            </button>
                        </motion.form>
                    )}

                    {/* ─── Email OTP — Verify ─── */}
                    {mode === 'otp' && otpSent && (
                        <motion.form
                            key="otp-verify"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            onSubmit={handleVerifyOTP}
                            className="space-y-4 relative z-10"
                        >
                            <div className="text-center mb-2">
                                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 mx-auto mb-3">
                                    <Mail className="w-6 h-6 text-primary" />
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    Code sent to <span className="font-semibold text-foreground">{identifier}</span>
                                </p>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-foreground pl-1">Verification Code</label>
                                <div className="relative">
                                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <input
                                        value={otpCode}
                                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                                        maxLength={6}
                                        required
                                        className="w-full bg-muted/30 border border-border/60 rounded-xl pl-9 pr-4 py-3 text-center tracking-widest text-lg font-bold focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-foreground"
                                        placeholder="000000"
                                        autoFocus
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading || !otpCode}
                                className="w-full flex items-center justify-center gap-2 py-3.5 mt-2 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none shadow-lg shadow-primary/20"
                            >
                                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify & Sign In"}
                            </button>

                            <button
                                type="button"
                                onClick={() => { setOtpSent(false); setOtpCode(""); setError(""); }}
                                className="text-sm text-muted-foreground hover:text-foreground mx-auto block transition-colors mt-2"
                            >
                                Use a different email
                            </button>
                        </motion.form>
                    )}
                </AnimatePresence>

                <div className="mt-6 text-center relative z-10">
                    <p className="text-sm text-muted-foreground">
                        Don't have an account?{" "}
                        <Link to="/sign-up" className="text-primary hover:text-primary/80 font-semibold transition-colors">
                            Sign up
                        </Link>
                    </p>
                </div>
            </motion.div>
        </div>
    );
}
