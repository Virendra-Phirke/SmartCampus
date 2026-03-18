import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Building } from '@/lib/types';
import { buildings as staticBuildings, type CampusBuilding } from '@/data/campusData';

// Fetch buildings from Supabase, fallback to static data
export const useBuildings = () => {
    return useQuery<Building[]>({
        queryKey: ['buildings'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('buildings')
                .select('*')
                .order('name');

            if (error || !data || data.length === 0) {
                // Fallback to static data
                return staticBuildings.map((b) => ({
                    id: b.id,
                    name: b.name,
                    short_name: b.shortName,
                    category: b.category,
                    lat: b.lat,
                    lng: b.lng,
                    description: b.description,
                    floors: b.floors || 1,
                    departments: b.departments || [],
                    qr_code: null,
                    created_at: new Date().toISOString(),
                }));
            }

            return data;
        },
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
};

// Convert Building (Supabase) to CampusBuilding (legacy map format)
export const toBuildingLegacy = (b: Building): CampusBuilding => ({
    id: b.id,
    name: b.name,
    shortName: b.short_name,
    category: b.category,
    lat: b.lat,
    lng: b.lng,
    description: b.description,
    floors: b.floors,
    departments: b.departments,
});

export const useAddBuilding = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (newBuilding: Partial<Building>) => {
            const { data, error } = await supabase
                .from('buildings')
                .insert([{
                    id: newBuilding.id,
                    name: newBuilding.name,
                    short_name: newBuilding.short_name,
                    category: newBuilding.category,
                    lat: newBuilding.lat,
                    lng: newBuilding.lng,
                    description: newBuilding.description,
                    floors: newBuilding.floors || 1,
                    departments: newBuilding.departments || [],
                    qr_code: `CAMPUS_${newBuilding.id?.toUpperCase()}`
                }])
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['buildings'] });
        },
    });
};

export const useUpdateBuilding = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, updates }: { id: string; updates: Partial<Building> }) => {
            const { data, error } = await supabase
                .from('buildings')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['buildings'] });
        },
    });
};
