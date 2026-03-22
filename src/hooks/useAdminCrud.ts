import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface Department {
  id: string;
  name: string;
  head_id: string | null;
  created_at: string;
}

export interface Course {
  id: string;
  name: string;
  department_id: string | null;
  duration_years: number;
  created_at: string;
}

export interface StaffMember {
  id: string;
  user_id: string | null;
  name: string;
  type: string;
  role_id: string;
  department_id: string | null;
  created_at: string;
}

export interface StudentRecord {
  id: string;
  user_id: string | null;
  name: string;
  roll_no: string;
  course_id: string | null;
  year: string;
  section_id: string | null;
  created_at: string;
}

export const useDepartmentsCrud = () => {
  const qc = useQueryClient();

  const list = useQuery<Department[]>({
    queryKey: ['admin-departments'],
    queryFn: async () => {
      const { data, error } = await supabase.from('departments').select('*').order('name');
      if (error) throw error;
      return data || [];
    },
  });

  const create = useMutation({
    mutationFn: async (payload: Omit<Department, 'created_at'>) => {
      const { data, error } = await supabase.from('departments').insert(payload).select().single();
      if (error) throw error;
      return data as Department;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-departments'] }),
  });

  const update = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Department> }) => {
      const { data, error } = await supabase.from('departments').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data as Department;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-departments'] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('departments').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-departments'] }),
  });

  return { list, create, update, remove };
};

export const useCoursesCrud = () => {
  const qc = useQueryClient();

  const list = useQuery<Course[]>({
    queryKey: ['admin-courses'],
    queryFn: async () => {
      const { data, error } = await supabase.from('courses').select('*').order('name');
      if (error) throw error;
      return data || [];
    },
  });

  const create = useMutation({
    mutationFn: async (payload: Omit<Course, 'created_at'>) => {
      const { data, error } = await supabase.from('courses').insert(payload).select().single();
      if (error) throw error;
      return data as Course;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-courses'] }),
  });

  const update = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Course> }) => {
      const { data, error } = await supabase.from('courses').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data as Course;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-courses'] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('courses').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-courses'] }),
  });

  return { list, create, update, remove };
};

export const useStaffCrud = () => {
  const qc = useQueryClient();

  const list = useQuery<StaffMember[]>({
    queryKey: ['admin-staff'],
    queryFn: async () => {
      const { data, error } = await supabase.from('staff').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const create = useMutation({
    mutationFn: async (payload: Omit<StaffMember, 'id' | 'created_at'>) => {
      const { data, error } = await supabase.from('staff').insert(payload).select().single();
      if (error) throw error;
      return data as StaffMember;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-staff'] }),
  });

  const update = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<StaffMember> }) => {
      const { data, error } = await supabase.from('staff').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data as StaffMember;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-staff'] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('staff').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-staff'] }),
  });

  return { list, create, update, remove };
};

export const useStudentsCrud = () => {
  const qc = useQueryClient();

  const list = useQuery<StudentRecord[]>({
    queryKey: ['admin-students'],
    queryFn: async () => {
      const { data, error } = await supabase.from('students').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const create = useMutation({
    mutationFn: async (payload: Omit<StudentRecord, 'id' | 'created_at'>) => {
      const { data, error } = await supabase.from('students').insert(payload).select().single();
      if (error) throw error;
      return data as StudentRecord;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-students'] }),
  });

  const update = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<StudentRecord> }) => {
      const { data, error } = await supabase.from('students').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data as StudentRecord;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-students'] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('students').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-students'] }),
  });

  return { list, create, update, remove };
};
