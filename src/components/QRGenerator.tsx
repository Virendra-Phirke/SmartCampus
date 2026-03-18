import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Building2, Download } from 'lucide-react';
import { useBuildings } from '@/hooks/useBuildings';

export default function QRGenerator({ onClose }: { onClose: () => void }) {
    const { data: buildings } = useBuildings();
    const [selectedBuildingId, setSelectedBuildingId] = useState<string>('');

    const selectedBuilding = buildings?.find(b => b.id === selectedBuildingId);
    const qrValue = selectedBuilding ? selectedBuilding.qr_code || `CAMPUS_${selectedBuilding.id.toUpperCase()}` : '';

    return (
        <div className="fixed inset-0 z-[1000] bg-background/90 backdrop-blur flex flex-col items-center justify-center p-4">
            <div className="absolute top-4 right-4">
                <button onClick={onClose} className="p-3 bg-secondary rounded-full hover:bg-secondary/80 transition-colors">
                    <X className="w-6 h-6" />
                </button>
            </div>

            <div className="bg-card w-full max-w-sm rounded-3xl shadow-2xl border border-border p-6 flex flex-col items-center animate-in zoom-in-95 duration-200">
                <h2 className="text-xl font-heading font-bold mb-1">Generate Session QR</h2>
                <p className="text-sm text-muted-foreground mb-6 text-center">Project this for students to scan</p>

                <div className="w-full mb-6">
                    <label className="text-sm font-medium mb-1.5 flex items-center gap-1.5 w-full">
                        <Building2 className="w-4 h-4 text-primary" />
                        Select Location / Classroom
                    </label>
                    <select
                        value={selectedBuildingId}
                        onChange={(e) => setSelectedBuildingId(e.target.value)}
                        className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none"
                    >
                        <option value="" disabled>Choose a building...</option>
                        {buildings?.map(b => (
                            <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                    </select>
                </div>

                {selectedBuilding ? (
                    <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300">
                        <div className="p-4 bg-white rounded-2xl shadow-sm mb-4">
                            <QRCodeSVG
                                value={qrValue}
                                size={220}
                                level="H"
                                includeMargin={true}
                            />
                        </div>
                        <p className="font-mono text-sm bg-muted px-3 py-1 rounded-full text-foreground/80 break-all mb-4">
                            {qrValue}
                        </p>

                        {/* Note: In a real app, you would add logic to generate an image and download it, or trigger a projection mode */}
                        <button className="flex items-center gap-2 text-primary hover:underline text-sm font-medium">
                            <Download className="w-4 h-4" /> Save QR Code
                        </button>
                    </div>
                ) : (
                    <div className="h-[220px] w-full border-2 border-dashed border-border rounded-2xl flex items-center justify-center text-muted-foreground text-sm p-6 text-center">
                        Select a building above to generate the attendance QR code.
                    </div>
                )}
            </div>
        </div>
    );
}
