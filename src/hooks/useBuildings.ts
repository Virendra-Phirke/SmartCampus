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
                    qr_code: `CAMPUS_${newBuilding.id?.toUpperCase()}`,
                    created_by: newBuilding.created_by,
                    college_id: newBuilding.college_id,
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

export const useDeleteBuilding = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (input: string | { id: string; force?: boolean }) => {
            const id = typeof input === 'string' ? input : input.id;
            const force = typeof input === 'string' ? true : (input.force ?? true);

            if (force) {
                // Remove dependent data to satisfy FK constraints before deleting building.
                // attendance_records.building_id -> buildings.id
                await supabase.from('attendance_records').delete().eq('building_id', id);

                // events.building_id -> buildings.id
                await supabase.from('events').delete().eq('building_id', id);

                // rooms.building_id -> buildings.id
                const { data: roomRows } = await supabase.from('rooms').select('id').eq('building_id', id);
                const roomIds = (roomRows || []).map((r: any) => r.id).filter(Boolean);

                // navigation_nodes.building_id -> buildings.id
                const { data: nodeRows } = await supabase.from('navigation_nodes').select('id').eq('building_id', id);
                const nodeIds = (nodeRows || []).map((n: any) => n.id).filter(Boolean);

                if (nodeIds.length > 0) {
                    await supabase.from('navigation_edges').delete().in('from_node_id', nodeIds);
                    await supabase.from('navigation_edges').delete().in('to_node_id', nodeIds);
                    await supabase.from('navigation_nodes').delete().in('id', nodeIds);
                }

                if (roomIds.length > 0) {
                    await supabase.from('class_sections').delete().in('room_id', roomIds);
                    await supabase.from('seating_arrangements').delete().in('room_id', roomIds);
                    await supabase.from('rooms').delete().in('id', roomIds);
                } else {
                    await supabase.from('rooms').delete().eq('building_id', id);
                }
            }

            const { error } = await supabase
                .from('buildings')
                .delete()
                .eq('id', id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['buildings'] });
        },
    });
};
