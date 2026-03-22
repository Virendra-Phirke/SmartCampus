import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, X, CheckCircle, AlertCircle } from 'lucide-react';

interface QRScannerProps {
    onScan: (data: string) => void;
    onClose: () => void;
}

const QRScanner = ({ onScan, onClose }: QRScannerProps) => {
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const scanHandledRef = useRef(false);
    const [error, setError] = useState<string | null>(null);
    const [isStarting, setIsStarting] = useState(true);

    useEffect(() => {
        const scanner = new Html5Qrcode('qr-reader');
        scannerRef.current = scanner;

        const startScanner = async () => {
            try {
                await scanner.start(
                    { facingMode: 'environment' },
                    {
                        fps: 10,
                        qrbox: { width: 250, height: 250 },
                        aspectRatio: 1,
                    },
                    (decodedText) => {
                        if (scanHandledRef.current) return;
                        scanHandledRef.current = true;
                        onScan(decodedText);
                        try {
                            if (scanner.isScanning) {
                                scanner.stop().catch(() => {});
                            }
                        } catch (e) {}
                    },
                    () => { } // ignore failures
                );
                setIsStarting(false);
            } catch (err: unknown) {
                const message = err instanceof Error ? err.message : 'Camera access denied. Please allow camera permissions.';
                setError(message);
                setIsStarting(false);
            }
        };

        startScanner();

        return () => {
            try {
                if (scanner.isScanning) {
                    scanner.stop().catch(() => {});
                }
            } catch (e) {}
        };
    }, [onScan]);

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative bg-card rounded-2xl border border-border overflow-hidden"
        >
            {/* Close button */}
            <button
                onClick={onClose}
                title="Close scanner"
                className="absolute top-3 right-3 z-10 p-2 rounded-full bg-background/80  hover:bg-background transition-colors"
            >
                <X className="w-4 h-4 text-foreground" />
            </button>

            {/* Scanner container */}
            <div className="relative">
                <div id="qr-reader" className="w-full" />

                {isStarting && !error && (
                    <div className="absolute inset-0 flex items-center justify-center bg-card">
                        <div className="flex flex-col items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center animate-pulse">
                                <Camera className="w-6 h-6 text-primary" />
                            </div>
                            <p className="text-sm text-muted-foreground">Starting camera...</p>
                        </div>
                    </div>
                )}

                {error && (
                    <div className="flex flex-col items-center gap-3 p-8">
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
                <div className="px-4 py-3 text-center">
                    <p className="text-xs text-muted-foreground">
                        Point your camera at a campus QR code to check in
                    </p>
                </div>
            )}
        </motion.div>
    );
};

export default QRScanner;
