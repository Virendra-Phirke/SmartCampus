import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { GraduationCap, Users, UserCog, Send, CheckCircle2 } from 'lucide-react';
import { ENGINEERING_DEPARTMENTS, STAFF_TYPES, STUDENT_YEARS, CLASS_SECTIONS } from '@/lib/collegeData';
import { useProfile } from '@/hooks/useProfile';
import type { UserProfile } from '@/lib/types';

const profileSchema = z.object({
    role: z.enum(['student', 'faculty', 'admin', 'visitor']),
    full_name: z.string().min(2, 'Full name is required'),
    mobile_no: z.string().min(10, 'Valid mobile number requried'),
    address: z.string().min(5, 'Address is required'),

    // Conditional fields will be validated ad-hoc or marked optional
    role_id: z.string().optional(),
    department_id: z.string().optional(),
    course_id: z.string().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

interface ProfileFormProps {
    onComplete: () => void;
    initialData?: UserProfile | null;
}

export default function ProfileForm({ onComplete, initialData }: ProfileFormProps) {
    const { upsertProfile } = useProfile();
    const [selectedRole, setSelectedRole] = useState<ProfileFormData['role']>(initialData?.role || 'student');

    const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<ProfileFormData>({
        resolver: zodResolver(profileSchema),
        defaultValues: {
            role: initialData?.role || 'student',
            full_name: initialData?.full_name || '',
            mobile_no: initialData?.mobile_no || '',
            address: initialData?.address || '',
            role_id: initialData?.role_id || '',
            department_id: initialData?.department_id || '',
            course_id: initialData?.course_id || '',
        }
    });

    const onSubmit = async (data: ProfileFormData) => {
        try {
            if (selectedRole === 'student') {
                data.department_id = undefined; // Students use course_id mapping to dept
            } else if (selectedRole === 'faculty' || selectedRole === 'admin') {
                data.course_id = undefined; // Staff use department_id directly
            }

            await upsertProfile.mutateAsync({
                role: data.role,
                full_name: data.full_name,
                mobile_no: data.mobile_no,
                address: data.address,
                role_id: data.role_id,
                department_id: data.department_id,
                course_id: data.course_id,
            });

            onComplete();
        } catch (err) {
            console.error('Failed to submit profile', err);
        }
    };

    const handleRoleChange = (role: ProfileFormData['role']) => {
        setSelectedRole(role);
    };

    return (
        <div className="bg-card border border-border rounded-3xl p-6 shadow-xl max-w-lg mx-auto w-full">
            <div className="text-center mb-6">
                <h2 className="text-2xl font-heading font-bold mb-1">Complete Your Profile</h2>
                <p className="text-sm text-muted-foreground">Setup your campus identity to unlock features.</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

                {/* Role Selection */}
                <div className="space-y-3">
                    <label className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">I am a...</label>
                    <div className="grid grid-cols-3 gap-2">
                        <label className={`flex flex-col items-center gap-2 p-3 rounded-xl border border-border cursor-pointer transition-all ${selectedRole === 'student' ? 'bg-primary/10 border-primary text-primary shadow-sm' : 'hover:bg-muted bg-background'}`}>
                            <input type="radio" value="student" {...register('role')} onChange={() => handleRoleChange('student')} className="hidden" />
                            <GraduationCap className="w-5 h-5" />
                            <span className="text-xs font-bold">Student</span>
                        </label>
                        <label className={`flex flex-col items-center gap-2 p-3 rounded-xl border border-border cursor-pointer transition-all ${selectedRole === 'faculty' ? 'bg-emerald-500/10 border-emerald-500 text-emerald-600 shadow-sm' : 'hover:bg-muted bg-background'}`}>
                            <input type="radio" value="faculty" {...register('role')} onChange={() => handleRoleChange('faculty')} className="hidden" />
                            <Users className="w-5 h-5" />
                            <span className="text-xs font-bold">Faculty</span>
                        </label>
                        <label className={`flex flex-col items-center gap-2 p-3 rounded-xl border border-border cursor-pointer transition-all ${selectedRole === 'admin' ? 'bg-accent/10 border-accent text-accent shadow-sm' : 'hover:bg-muted bg-background'}`}>
                            <input type="radio" value="admin" {...register('role')} onChange={() => handleRoleChange('admin')} className="hidden" />
                            <UserCog className="w-5 h-5" />
                            <span className="text-xs font-bold">Admin</span>
                        </label>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium pl-1">Full Legal Name</label>
                        <input {...register('full_name')} className="w-full bg-muted/50 border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" placeholder="e.g. John Doe" />
                        {errors.full_name && <span className="text-[10px] text-destructive pl-1">{errors.full_name.message}</span>}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium pl-1">Mobile Number</label>
                            <input {...register('mobile_no')} type="tel" className="w-full bg-muted/50 border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" placeholder="+91..." />
                            {errors.mobile_no && <span className="text-[10px] text-destructive pl-1">{errors.mobile_no.message}</span>}
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-medium pl-1">Permanent Address</label>
                        <textarea {...register('address')} rows={2} className="w-full bg-muted/50 border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none" placeholder="City, State" />
                        {errors.address && <span className="text-[10px] text-destructive pl-1">{errors.address.message}</span>}
                    </div>
                </div>

                {/* ROLE SPECIFIC FIELDS */}
                <AnimatePresence mode="wait">
                    {selectedRole === 'student' && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-4 pt-4 border-t border-border">
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium pl-1">Course / Department</label>
                                <select {...register('course_id')} className="w-full bg-muted/50 border border-border rounded-xl px-4 py-3 text-sm focus:outline-none ">
                                    <option value="">Select Course...</option>
                                    {ENGINEERING_DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium pl-1">Roll / PRN No.</label>
                                    <input {...register('role_id')} className="w-full bg-muted/50 border border-border rounded-xl px-4 py-3 text-sm focus:outline-none " placeholder="e.g. CS2024..." />
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {(selectedRole === 'faculty' || selectedRole === 'admin') && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-4 pt-4 border-t border-border">
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium pl-1">Staff Role</label>
                                <select {...register('department_id')} className="w-full bg-muted/50 border border-border rounded-xl px-4 py-3 text-sm focus:outline-none ">
                                    <option value="">Select Primary Role...</option>
                                    {STAFF_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium pl-1">Employee ID</label>
                                    <input {...register('role_id')} className="w-full bg-muted/50 border border-border rounded-xl px-4 py-3 text-sm focus:outline-none " placeholder="e.g. EMP102" />
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-foreground text-background font-bold text-sm shadow-xl active:scale-95 transition-all disabled:opacity-50"
                >
                    {isSubmitting ? 'Saving Profile...' : 'Complete Profile'}
                    <CheckCircle2 className="w-4 h-4 ml-1" />
                </button>

            </form>
        </div>
    );
}
