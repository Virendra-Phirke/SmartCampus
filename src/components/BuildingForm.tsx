import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { X, MapPin, Building2, CheckCircle2 } from 'lucide-react';
import { useAddBuilding, useUpdateBuilding } from '@/hooks/useBuildings';
import type { Building } from '@/lib/types';

const buildingSchema = z.object({
    name: z.string().min(3, "Name must be at least 3 characters"),
    short_name: z.string().min(2, "Short name is required"),
    category: z.enum(['academic', 'admin', 'facility', 'sports', 'hostel']),
    description: z.string().optional(),
});

type FormValues = z.infer<typeof buildingSchema>;

interface BuildingFormProps {
    initialLat: number;
    initialLng: number;
    existingBuilding?: Building | null;
    onClose: () => void;
}

export const BuildingForm = ({ initialLat, initialLng, existingBuilding, onClose }: BuildingFormProps) => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const addBuilding = useAddBuilding();
    const updateBuilding = useUpdateBuilding();

    const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
        resolver: zodResolver(buildingSchema),
        defaultValues: {
            name: existingBuilding?.name || '',
            short_name: existingBuilding?.short_name || '',
            category: (existingBuilding?.category as any) || 'academic',
            description: existingBuilding?.description || '',
        }
    });

    const onSubmit = async (data: FormValues) => {
        setIsSubmitting(true);
        try {
            if (existingBuilding) {
                await updateBuilding.mutateAsync({
                    id: existingBuilding.id,
                    updates: { ...data }
                });
            } else {
                const id = data.short_name.toLowerCase().replace(/[^a-z0-9]/g, '-');
                await addBuilding.mutateAsync({
                    id,
                    lat: initialLat,
                    lng: initialLng,
                    ...data
                });
            }
            onClose();
        } catch (error) {
            console.error(error);
            alert('Failed to save location.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[1000] bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-card w-full max-w-md rounded-2xl shadow-2xl border border-border p-5 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-heading font-bold text-foreground flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-primary" />
                        {existingBuilding ? 'Edit Location' : 'Add New Location'}
                    </h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-muted text-muted-foreground transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {!existingBuilding && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg border border-border/50 mb-5">
                        <MapPin className="w-4 h-4 text-primary" />
                        <span>Capturing coordinate: {initialLat.toFixed(4)}, {initialLng.toFixed(4)}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div>
                        <label className="text-sm font-medium text-foreground mb-1.5 block">Full Name</label>
                        <input
                            {...register('name')}
                            placeholder="e.g. Electrical Engineering Block"
                            className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                        {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium text-foreground mb-1.5 block">Short Name</label>
                            <input
                                {...register('short_name')}
                                placeholder="e.g. EE Block"
                                className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                            />
                            {errors.short_name && <p className="text-xs text-destructive mt-1">{errors.short_name.message}</p>}
                        </div>
                        <div>
                            <label className="text-sm font-medium text-foreground mb-1.5 block">Category</label>
                            <select
                                {...register('category')}
                                className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                            >
                                <option value="academic">Academic</option>
                                <option value="admin">Administrative</option>
                                <option value="facility">Facility</option>
                                <option value="sports">Sports</option>
                                <option value="hostel">Hostel</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="text-sm font-medium text-foreground mb-1.5 block">Description</label>
                        <textarea
                            {...register('description')}
                            placeholder="Tap to add description..."
                            rows={3}
                            className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-2.5 rounded-xl transition-all shadow-md active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
                    >
                        {isSubmitting ? 'Saving...' : (
                            <>
                                <CheckCircle2 className="w-5 h-5" />
                                {existingBuilding ? 'Update Location' : 'Save Location'}
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};
