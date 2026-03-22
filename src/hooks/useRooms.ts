import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface Room {
 id: string;
 building_id: string | null;
 floor: number;
 room_number: string;
 name: string;
 type: 'classroom' | 'lab' | 'office' | 'canteen' | 'library' | 'other';
 capacity: number | null;
 department: string | null;
 created_at: string;
}

export const useRooms = (buildingId?: string) => {
 return useQuery<Room[]>({
 queryKey: ['rooms', buildingId],
 queryFn: async () => {
 let query = supabase.from('rooms').select('*').order('floor').order('room_number');
 if (buildingId) {
 query = query.eq('building_id', buildingId);
 }
 const { data, error } = await query;
 if (error) throw error;
 return data || [];
 },
 });
};

export const useAddRoom = () => {
 const qc = useQueryClient();
 return useMutation({
 mutationFn: async (room: Omit<Room, 'id' | 'created_at'>) => {
 const { data, error } = await supabase.from('rooms').insert([room]).select().single();
 if (error) throw error;
 return data;
 },
 onSuccess: (_data, variables) => {
 qc.invalidateQueries({ queryKey: ['rooms'] });
 qc.invalidateQueries({ queryKey: ['rooms', variables.building_id] });
 },
 });
};

export const useUpdateRoom = () => {
 const qc = useQueryClient();
 return useMutation({
 mutationFn: async ({ id, updates }: { id: string; updates: Partial<Room> }) => {
 const { data, error } = await supabase.from('rooms').update(updates).eq('id', id).select().single();
 if (error) throw error;
 return data;
 },
 onSuccess: () => { qc.invalidateQueries({ queryKey: ['rooms'] }); },
 });
};

export const useDeleteRoom = () => {
 const qc = useQueryClient();
 return useMutation({
 mutationFn: async (id: string) => {
 const { error } = await supabase.from('rooms').delete().eq('id', id);
 if (error) throw error;
 },
 onSuccess: () => { qc.invalidateQueries({ queryKey: ['rooms'] }); },
 });
};
