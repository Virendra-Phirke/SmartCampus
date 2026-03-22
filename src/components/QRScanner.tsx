import { useEffect, useMemo, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { motion } from 'framer-motion';
import { Camera, X, AlertCircle } from 'lucide-react';

interface QRScannerProps {
    onScan: (data: string) => void;
    onClose: () => void;
}

const QRScanner = ({ onScan, onClose }: QRScannerProps) => {
    const readerId = useMemo(() => `qr-reader-${Math.random().toString(36).slice(2, 10)}`, []);
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const scanHandledRef = useRef(false);
    const lastScanTsRef = useRef(0);
    const [error, setError] = useState<string | null>(null);
    const [isStarting, setIsStarting] = useState(true);

    useEffect(() => {
        let cancelled = false;
        const scanner = new Html5Qrcode(readerId);
        scannerRef.current = scanner;

        const stopScanner = async () => {
            try {
                if (scanner.isScanning) {
                    await scanner.stop();
                }
            } catch (e) {
                // ignore stop failures
            }
            try {
                await scanner.clear();
            } catch (e) {
                // ignore clear failures
            }
        };

        const startScanner = async () => {
            try {
                await scanner.start(
                    { facingMode: 'environment' },
                    {
                        fps: 6,
                        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
                            const edge = Math.min(viewfinderWidth, viewfinderHeight) * 0.72;
                            const size = Math.max(220, Math.min(340, Math.floor(edge)));
                            return { width: size, height: size };
                        },
                    },
                    async (decodedText) => {
                        const now = Date.now();
                        if (now - lastScanTsRef.current < 1400) return;
                        lastScanTsRef.current = now;
                        if (scanHandledRef.current) return;
                        scanHandledRef.current = true;

                        await stopScanner();
                        onScan(decodedText);
                    },
                    () => { } // ignore failures
                );
                if (!cancelled) setIsStarting(false);
            } catch (err: unknown) {
                const message = err instanceof Error ? err.message : 'Camera access denied. Please allow camera permissions.';
                if (!cancelled) {
                    setError(message);
                    setIsStarting(false);
                }
            }
        };

        startScanner();

        return () => {
            cancelled = true;
            stopScanner();
        };
    }, [onScan, readerId]);

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-[1200] bg-background/95 backdrop-blur-sm flex flex-col"
        >
            {/* Close button */}
            <button
                onClick={onClose}
                title="Close scanner"
                className="absolute top-[max(env(safe-area-inset-top),12px)] right-3 z-20 p-2.5 rounded-full bg-card/90 border border-border/60 hover:bg-card transition-colors"
            >
                <X className="w-4 h-4 text-foreground" />
            </button>

            {/* Scanner container */}
            <div className="relative flex-1 min-h-0 p-3 pt-[max(env(safe-area-inset-top),56px)]">
                <div className="w-full h-full rounded-2xl overflow-hidden border border-border/60 bg-black">
                    <div id={readerId} className="w-full h-full" />
                </div>

                {isStarting && !error && (
                    <div className="absolute inset-3 top-[max(env(safe-area-inset-top),56px)] flex items-center justify-center bg-card/95 rounded-2xl border border-border/60">
                        <div className="flex flex-col items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center animate-pulse">
                                <Camera className="w-6 h-6 text-primary" />
                            </div>
                            <p className="text-sm text-muted-foreground">Starting camera...</p>
                        </div>
                    </div>
                )}

                {error && (
                    <div className="absolute inset-3 top-[max(env(safe-area-inset-top),56px)] flex flex-col items-center justify-center gap-3 p-8 bg-card/95 rounded-2xl border border-border/60">
                        <div className="w-12 h-12 rounded-2xl bg-destructive/20 flex items-center justify-center">
                            <AlertCircle className="w-6 h-6 text-destructive" />
                        </div>
                        <p className="text-sm text-muted-foreground text-center">{error}</p>
                        <button
                            onClick={onClose}
                            className="px-4 py-2 rounded-xl bg-secondary text-secondary-foreground text-sm font-medium hover:bg-secondary/80 transition-colors"
                        >
                            Close Scanner
                        </button>
                    </div>
                )}
            </div>

            {/* Scan label */}
            {!error && (
                <div className="px-4 py-3 pb-[max(env(safe-area-inset-bottom),12px)] text-center">
                    <p className="text-xs text-muted-foreground">
                        Point your camera at a campus QR code to check in
                    </p>
                </div>
            )}
        </motion.div>
    );
};

export default QRScanner;
