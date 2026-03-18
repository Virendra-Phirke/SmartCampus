import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, Building, Info, CheckCircle2, ChevronRight, ChevronLeft } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { BUILDING_TYPES, ENGINEERING_DEPARTMENTS, BUILDING_CATEGORIES } from '@/lib/collegeData';
import { useAddBuilding } from '@/hooks/useBuildings';
import { QRCodeSVG } from 'qrcode.react';

const buildingSchema = z.object({
    name: z.string().min(2, "Name is required"),
    short_name: z.string().min(1, "Short name required"),
    description: z.string().optional(),
    floors: z.number().min(1).max(20),
    departments: z.array(z.string()).optional(),
});

type WizardStep = 'location' | 'type' | 'details' | 'success';

interface CampusWizardProps {
    onClose: () => void;
    initialLocation?: { lat: number; lng: number };
}

export default function CampusWizard({ onClose, initialLocation }: CampusWizardProps) {
    const [step, setStep] = useState<WizardStep>('type');
    const [selectedType, setSelectedType] = useState<typeof BUILDING_TYPES[number] | null>(null);
    const [location, setLocation] = useState(initialLocation);
    const [savedBuildingId, setSavedBuildingId] = useState<string>('');
    const addBuilding = useAddBuilding();

    const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<z.infer<typeof buildingSchema>>({
        resolver: zodResolver(buildingSchema),
        defaultValues: {
            floors: 1,
            departments: [],
        }
    });

    const selectedDepartments = watch('departments') || [];

    const handleTypeSelect = (type: typeof BUILDING_TYPES[number]) => {
        setSelectedType(type);
        setValue('name', type.label);
        const short = type.label.split(' ')[0] + (type.label.includes('Lab') ? ' Lab' : '');
        setValue('short_name', short);
        setStep('details');
    };

    const onSubmit = async (data: z.infer<typeof buildingSchema>) => {
        if (!selectedType || !location) return;

        try {
            const id = `${selectedType.id}-${Date.now().toString().slice(-4)}`;
            const qr_code = `CAMPUS_${id.toUpperCase()}`;

            await addBuilding.mutateAsync({
                id,
                name: data.name,
                short_name: data.short_name,
                category: selectedType.category,
                description: data.description || '',
                floors: data.floors,
                departments: data.departments || [],
                lat: location.lat,
                lng: location.lng,
                qr_code,
            });

            setSavedBuildingId(id);
            setStep('success');
        } catch (error) {
            console.error('Failed to save building:', error);
            alert('Failed to save building. Make sure you ran the disable_rls.sql script!');
        }
    };

    return (
        <div className="fixed inset-0 z-[1000] bg-background/90 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-card w-full max-w-2xl h-[80vh] max-h-[800px] rounded-3xl shadow-2xl border border-border flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
                    <div className="flex items-center gap-3">
                        <div className="bg-primary/10 p-2 rounded-xl text-primary">
                            <Building className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="font-heading font-bold">Add Campus Location</h2>
                            <p className="text-xs text-muted-foreground">
                                {step === 'type' ? 'Step 1: Select Building Type' :
                                    step === 'details' ? 'Step 2: Enter Details' : 'Complete'}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors text-muted-foreground">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
                    <AnimatePresence mode="wait">

                        {/* STEP 1: TYPE SELECTION */}
                        {step === 'type' && (
                            <motion.div
                                key="type"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                className="space-y-6"
                            >
                                {BUILDING_CATEGORIES.map(category => (
                                    <div key={category.id} className="space-y-3">
                                        <h3 className="font-heading font-semibold text-foreground/80 flex items-center gap-2">
                                            <span>{category.icon}</span> {category.label}
                                        </h3>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                            {BUILDING_TYPES.filter(t => t.category === category.id).map(type => (
                                                <button
                                                    key={type.id}
                                                    onClick={() => handleTypeSelect(type)}
                                                    className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border border-border bg-background hover:bg-primary/5 hover:border-primary/50 transition-all text-center group"
                                                >
                                                    <span className="text-3xl group-hover:scale-110 transition-transform">{type.icon}</span>
                                                    <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground">{type.label}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </motion.div>
                        )}

                        {/* STEP 2: DETAILS FORM */}
                        {step === 'details' && (
                            <motion.form
                                key="details"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                onSubmit={handleSubmit(onSubmit)}
                                className="space-y-5"
                            >
                                <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-2xl border border-border">
                                    <span className="text-4xl">{selectedType?.icon}</span>
                                    <div>
                                        <h4 className="font-semibold text-sm">Building Type</h4>
                                        <p className="text-muted-foreground text-xs">{selectedType?.label}</p>
                                    </div>
                                    <button type="button" onClick={() => setStep('type')} className="ml-auto text-xs text-primary font-medium hover:underline">
                                        Change
                                    </button>
                                </div>

                                <div className="grid sm:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-medium pl-1">Building Name</label>
                                        <input {...register('name')} className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                                        {errors.name && <span className="text-[10px] text-destructive pl-1">{errors.name.message}</span>}
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-medium pl-1">Short Name / Code</label>
                                        <input {...register('short_name')} className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                                    </div>
                                </div>

                                <div className="grid sm:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-medium pl-1">Number of Floors</label>
                                        <input type="number" {...register('floors', { valueAsNumber: true })} className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                                    </div>
                                </div>

                                {selectedType?.category === 'academic' && (
                                    <div className="space-y-2">
                                        <label className="text-xs font-medium pl-1">Associated Departments</label>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 border border-border rounded-xl bg-muted/20">
                                            {ENGINEERING_DEPARTMENTS.map(dept => (
                                                <label key={dept} className="flex items-center gap-2 p-2 hover:bg-background rounded-lg cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        value={dept}
                                                        {...register('departments')}
                                                        className="rounded border-border text-primary focus:ring-primary"
                                                    />
                                                    <span className="text-xs">{dept}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium pl-1">Description</label>
                                    <textarea {...register('description')} rows={3} className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none" placeholder="e.g. Contains all 3rd year labs..." />
                                </div>

                                <div className="pt-4 flex gap-3">
                                    <button type="button" onClick={() => setStep('type')} className="flex-1 py-3 bg-muted text-muted-foreground font-semibold rounded-xl text-sm hover:bg-muted/80 transition-colors">
                                        Back
                                    </button>
                                    <button type="submit" className="flex-[2] py-3 bg-primary text-primary-foreground font-semibold rounded-xl text-sm shadow-md hover:opacity-90 transition-opacity">
                                        Save Location to Campus
                                    </button>
                                </div>
                            </motion.form>
                        )}

                        {/* STEP 3: SUCCESS */}
                        {step === 'success' && (
                            <motion.div
                                key="success"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="flex flex-col items-center justify-center h-full space-y-6 text-center"
                            >
                                <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center">
                                    <CheckCircle2 className="w-10 h-10 text-green-500" />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-bold font-heading mb-2">Location Added!</h3>
                                    <p className="text-muted-foreground text-sm max-w-xs mx-auto">
                                        {watch('name')} has been successfully added to the campus map.
                                    </p>
                                </div>

                                <div className="p-4 bg-white rounded-2xl shadow-sm border border-border inline-block mt-4">
                                    <QRCodeSVG value={`CAMPUS_${savedBuildingId.toUpperCase()}`} size={160} />
                                </div>
                                <p className="text-xs text-muted-foreground">Building Check-in QR Generated</p>

                                <button onClick={onClose} className="w-full max-w-xs py-3 bg-primary text-primary-foreground font-semibold rounded-xl text-sm shadow-md mt-6">
                                    Done
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}
