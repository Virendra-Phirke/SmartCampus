import { motion } from 'framer-motion';
import { useUser, useClerk } from '@clerk/clerk-react';
import {
    User, Mail, LogOut, MapPin, CheckCircle, Calendar, TrendingUp,
    Shield, GraduationCap, Clock, ChevronRight, Settings, BookOpen, Users
} from 'lucide-react';
import { useAttendance } from '@/hooks/useAttendance';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { format, subDays, startOfDay, isSameDay } from 'date-fns';
import { useProfile } from '@/hooks/useProfile';
import ProfileForm from '@/components/ProfileForm';

const Profile = () => {
    const { user } = useUser();
    const { signOut } = useClerk();
    const { records, todayCount, weekCount, totalCount } = useAttendance();
    const { profile, isLoading } = useProfile();

    // Compute attendance data for last 7 days chart
    const chartData = Array.from({ length: 7 }, (_, i) => {
        const day = subDays(new Date(), 6 - i);
        const dayStart = startOfDay(day);
        const count = records.filter((r) =>
            isSameDay(new Date(r.checked_in_at), dayStart)
        ).length;
        return {
            day: format(day, 'EEE'),
            count,
        };
    });

    // Recent locations
    const recentLocations = records.slice(0, 5);

    return (
        <div className="flex flex-col h-full px-4 pt-2 pb-4 overflow-y-auto">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-5 flex items-center justify-between"
            >
                <div>
                    <h1 className="text-2xl font-heading font-bold text-foreground">Profile</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">Your campus dashboard</p>
                </div>
                {profile?.full_name && (
                    <button onClick={() => signOut()} className="p-2 bg-destructive/10 text-destructive rounded-full hover:bg-destructive/20 transition-colors">
                        <LogOut className="w-5 h-5" />
                    </button>
                )}
            </motion.div>

            {/* Onboarding State */}
            {!isLoading && !profile?.full_name ? (
                <div className="flex-1 flex items-center justify-center py-4">
                    <ProfileForm onComplete={() => { }} initialData={profile} />
                </div>
            ) : (
                <>

                    {/* User Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.05 }}
                        className="bg-card rounded-2xl p-5 border border-border/50 mb-5 relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full -z-0"></div>

                        <div className="relative z-10 flex items-center gap-4">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                                {user?.imageUrl ? (
                                    <img src={user.imageUrl} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                    <User className="w-8 h-8 text-primary-foreground" />
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h2 className="text-lg font-heading font-bold text-foreground truncate">
                                    {profile?.full_name || 'Loading...'}
                                </h2>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                    <Mail className="w-3 h-3 text-muted-foreground" />
                                    <p className="text-xs text-muted-foreground">
                                        {profile?.role_id || user?.primaryEmailAddress?.emailAddress}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2 mt-2">
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold uppercase tracking-wider flex items-center gap-1">
                                        {profile?.role === 'student' && <GraduationCap className="w-3 h-3" />}
                                        {profile?.role === 'faculty' && <Users className="w-3 h-3" />}
                                        {profile?.role === 'admin' && <Shield className="w-3 h-3" />}
                                        {profile?.role}
                                    </span>
                                    {profile?.department_id && (
                                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent/10 text-accent font-bold uppercase tracking-wider flex items-center gap-1 truncate max-w-[100px]">
                                            {profile.department_id}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Stats */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="grid grid-cols-3 gap-3 mb-5"
                    >
                        <div className="bg-card rounded-2xl p-3 border border-border/50 text-center">
                            <CheckCircle className="w-4 h-4 text-primary mx-auto mb-1" />
                            <p className="text-lg font-bold text-foreground">{todayCount}</p>
                            <p className="text-[10px] text-muted-foreground">Today</p>
                        </div>
                        <div className="bg-card rounded-2xl p-3 border border-border/50 text-center">
                            <Calendar className="w-4 h-4 text-accent mx-auto mb-1" />
                            <p className="text-lg font-bold text-foreground">{weekCount}</p>
                            <p className="text-[10px] text-muted-foreground">This Week</p>
                        </div>
                        <div className="bg-card rounded-2xl p-3 border border-border/50 text-center">
                            <TrendingUp className="w-4 h-4 text-blue-400 mx-auto mb-1" />
                            <p className="text-lg font-bold text-foreground">{totalCount}</p>
                            <p className="text-[10px] text-muted-foreground">Total</p>
                        </div>
                    </motion.div>

                    {/* Weekly Chart */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15 }}
                        className="bg-card rounded-2xl p-4 border border-border/50 mb-5"
                    >
                        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                            <BarChart className="w-3.5 h-3.5" />
                            Weekly Activity
                        </h3>
                        <div className="h-[140px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData} barCategoryGap="30%">
                                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(200, 15%, 18%)" />
                                    <XAxis
                                        dataKey="day"
                                        tick={{ fill: 'hsl(200, 10%, 55%)', fontSize: 10 }}
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <YAxis
                                        tick={{ fill: 'hsl(200, 10%, 55%)', fontSize: 10 }}
                                        axisLine={false}
                                        tickLine={false}
                                        allowDecimals={false}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            background: 'hsl(200, 20%, 10%)',
                                            border: '1px solid hsl(200, 15%, 18%)',
                                            borderRadius: '12px',
                                            color: 'hsl(180, 10%, 94%)',
                                            fontSize: '12px',
                                        }}
                                    />
                                    <Bar dataKey="count" fill="hsl(174, 62%, 47%)" radius={[6, 6, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </motion.div>

                    {/* Recent Locations */}
                    {recentLocations.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="bg-card rounded-2xl border border-border/50 mb-5 overflow-hidden"
                        >
                            <div className="px-4 py-3 border-b border-border/30">
                                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                                    <Clock className="w-3.5 h-3.5" />
                                    Recent Locations
                                </h3>
                            </div>
                            {recentLocations.map((record, i) => (
                                <div
                                    key={record.id}
                                    className={`flex items-center gap-3 px-4 py-3 ${i < recentLocations.length - 1 ? 'border-b border-border/20' : ''
                                        }`}
                                >
                                    <MapPin className="w-4 h-4 text-primary shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-foreground truncate">
                                            {record.building_name || record.building_id}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground">
                                            {format(new Date(record.checked_in_at), 'MMM dd, hh:mm a')}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </motion.div>
                    )}

                    {/* Quick Links */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.25 }}
                        className="space-y-2 mb-5"
                    >
                        {[
                            { icon: BookOpen, label: 'Campus Directory', desc: 'Browse all locations' },
                            { icon: Settings, label: 'Preferences', desc: 'Notification & accessibility settings' },
                        ].map((link) => (
                            <button
                                key={link.label}
                                className="w-full flex items-center gap-3 p-3 bg-card rounded-xl border border-border/40 hover:border-border/60 transition-colors text-left"
                            >
                                <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center">
                                    <link.icon className="w-4 h-4 text-foreground" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-foreground">{link.label}</p>
                                    <p className="text-[10px] text-muted-foreground">{link.desc}</p>
                                </div>
                                <ChevronRight className="w-4 h-4 text-muted-foreground" />
                            </button>
                        ))}
                    </motion.div>

                    {/* Sign Out (Moved to top right, so just empty placeholder or remove this) */}
                </>
            )}
        </div>
    );
};

export default Profile;
