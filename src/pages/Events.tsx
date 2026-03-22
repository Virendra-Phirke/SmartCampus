import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Calendar, Clock, MapPin, Bell, AlertTriangle,
    Megaphone, GraduationCap, Music, Trophy, Lightbulb,
    Wrench, Star, Plus, Trash2, Pencil, ChevronDown, ChevronUp,
} from 'lucide-react';
import { useEvents } from '@/hooks/useEvents';
import { useAnnouncements } from '@/hooks/useAnnouncements';
import { format, formatDistanceToNow } from 'date-fns';
import type { Event, Announcement } from '@/lib/types';
import { EventForm } from '@/components/EventForm';
import { useUser } from '@clerk/clerk-react';
import { useDeleteEvent, useDeleteAnnouncement } from '@/hooks/useAddEvent';
import { useAppDialog } from '@/hooks/useAppDialog';
import { useProfile } from '@/hooks/useProfile';
import { getLocalAdminCampusId, isLocalAdminAuthenticated } from '@/lib/adminAuth';

// ─── Configs ──────────────────────────────────────────────────────────────────

const eventCategoryConfig: Record<string, { icon: any; color: string; label: string }> = {
    academic: { icon: GraduationCap, color: 'text-blue-400 bg-blue-400/15',    label: 'Academic' },
    cultural:  { icon: Music,         color: 'text-purple-400 bg-purple-400/15', label: 'Cultural' },
    sports:    { icon: Trophy,        color: 'text-green-400 bg-green-400/15',   label: 'Sports'   },
    seminar:   { icon: Lightbulb,     color: 'text-yellow-400 bg-yellow-400/15', label: 'Seminar'  },
    workshop:  { icon: Wrench,        color: 'text-orange-400 bg-orange-400/15', label: 'Workshop' },
    other:     { icon: Star,          color: 'text-gray-400 bg-gray-400/15',     label: 'Other'    },
};

const priorityConfig: Record<string, { bg: string; border: string; text: string; icon: any; label: string }> = {
    urgent: { bg: 'bg-red-500/10',    border: 'border-red-500/25',    text: 'text-red-400',    icon: AlertTriangle, label: 'Urgent' },
    high:   { bg: 'bg-orange-500/10', border: 'border-orange-500/25', text: 'text-orange-400', icon: Bell,          label: 'High'   },
    medium: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/25', text: 'text-yellow-400', icon: Megaphone,     label: 'Medium' },
    low:    { bg: 'bg-blue-500/10',   border: 'border-blue-500/25',   text: 'text-blue-400',   icon: Bell,          label: 'Low'    },
};

const CATEGORIES = ['all', 'academic', 'cultural', 'sports', 'seminar', 'workshop'];

// ─── EventCard ────────────────────────────────────────────────────────────────

const EventCard = ({
    event, onEdit, currentUserId, isAdmin = false,
}: {
    event: Event; onEdit: (e: Event) => void; currentUserId?: string; isAdmin?: boolean;
}) => {
    const [expanded, setExpanded] = useState(false);
    const deleteEvent  = useDeleteEvent();
    const { confirm }  = useAppDialog();
    const cfg          = eventCategoryConfig[event.category] || eventCategoryConfig.other;
    const Icon         = cfg.icon;
    const startDate    = new Date(event.start_time);
    const endDate      = new Date(event.end_time);
    const isUpcoming   = startDate > new Date();
    const isOwner      = (event.created_by && event.created_by === currentUserId) || isAdmin;

    return (
        <motion.div layout className="bg-card rounded-2xl border border-border/50 overflow-hidden transition-colors">
            <div className="p-4 cursor-pointer" onClick={() => setExpanded((v) => !v)}>
                <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${cfg.color}`}>
                        <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                            {isUpcoming && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/15 text-primary font-medium">
                                    Upcoming
                                </span>
                            )}
                            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${cfg.color}`}>
                                {cfg.label}
                            </span>
                        </div>
                        <h3 className="text-sm font-semibold text-foreground leading-tight break-all">{event.title}</h3>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2">
                            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                                <Calendar className="w-3 h-3" />{format(startDate, 'MMM dd, yyyy')}
                            </span>
                            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                                <Clock className="w-3 h-3" />{format(startDate, 'hh:mm a')} – {format(endDate, 'hh:mm a')}
                            </span>
                            {event.location && (
                                <span className="text-[11px] text-muted-foreground flex items-center gap-1 break-all">
                                    <MapPin className="w-3 h-3 shrink-0" />{event.location}
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="shrink-0 mt-0.5 text-muted-foreground/40">
                        {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </div>
                </div>

                {isOwner && (
                    <div className="flex gap-2 justify-end mt-3 pt-3 border-t border-border/20">
                        <button
                            onClick={(e) => { e.stopPropagation(); onEdit(event); }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium bg-secondary text-foreground active:scale-95 transition-all"
                        >
                            <Pencil className="w-3 h-3" /> Edit
                        </button>
                        <button
                            onClick={async (e) => {
                                e.stopPropagation();
                                const ok = await confirm({
                                    title: 'Delete event?',
                                    description: 'This will permanently remove the event from all users.',
                                    confirmText: 'Delete', cancelText: 'Cancel', destructive: true,
                                });
                                if (ok) deleteEvent.mutate(event.id);
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium bg-red-500/10 text-red-400 active:scale-95 transition-all"
                        >
                            <Trash2 className="w-3 h-3" /> Delete
                        </button>
                    </div>
                )}
            </div>

            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <div className="px-4 pb-4 border-t border-border/30">
                            <p className="text-sm text-muted-foreground leading-relaxed mt-3 break-all whitespace-pre-wrap">
                                {event.description}
                            </p>
                            <p className="text-[10px] text-muted-foreground/60 mt-2">
                                {isUpcoming
                                    ? `Starts ${formatDistanceToNow(startDate, { addSuffix: true })}`
                                    : `Started ${formatDistanceToNow(startDate, { addSuffix: true })}`}
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

// ─── AnnouncementBanner ───────────────────────────────────────────────────────

const AnnouncementBanner = ({
    announcement, onEdit, currentUserId, isAdmin = false,
}: {
    announcement: Announcement; onEdit: (a: Announcement) => void; currentUserId?: string; isAdmin?: boolean;
}) => {
    const pcfg    = priorityConfig[announcement.priority] || priorityConfig.low;
    const PIcon   = pcfg.icon;
    const deleteAnnouncement = useDeleteAnnouncement();
    const { confirm } = useAppDialog();
    const isOwner = (announcement.created_by && announcement.created_by === currentUserId) || isAdmin;

    return (
        <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-2xl border overflow-hidden ${pcfg.bg} ${pcfg.border}`}
        >
            <div className="p-3.5 flex items-start gap-3">
                <PIcon className={`w-4 h-4 mt-0.5 shrink-0 ${pcfg.text}`} />
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <p className={`text-xs font-semibold leading-tight break-all ${pcfg.text}`}>
                            {announcement.title}
                        </p>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold border ${pcfg.bg} ${pcfg.border} ${pcfg.text}`}>
                            {pcfg.label}
                        </span>
                    </div>
                    <p className="text-[11px] text-foreground/70 mt-0.5 leading-snug break-all whitespace-pre-wrap">
                        {announcement.body}
                    </p>
                </div>
            </div>

            {isOwner && (
                <div className="flex gap-2 justify-end px-3.5 py-2.5 border-t border-current/10">
                    <button
                        onClick={() => onEdit(announcement)}
                        aria-label="Edit alert"
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium bg-white/10 ${pcfg.text} active:scale-95 transition-all`}
                    >
                        <Pencil className="w-3 h-3" /> Edit
                    </button>
                    <button
                        onClick={async () => {
                            const ok = await confirm({
                                title: 'Delete alert?',
                                description: 'This alert will be removed and users will no longer see it.',
                                confirmText: 'Delete', cancelText: 'Cancel', destructive: true,
                            });
                            if (ok) deleteAnnouncement.mutate(announcement.id);
                        }}
                        aria-label="Delete alert"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium bg-red-500/20 text-red-400 active:scale-95 transition-all"
                    >
                        <Trash2 className="w-3 h-3" /> Delete
                    </button>
                </div>
            )}
        </motion.div>
    );
};

// ─── Empty State ──────────────────────────────────────────────────────────────

const EmptyState = ({ icon: Icon, message, sub }: { icon: any; message: string; sub?: string }) => (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center py-16 px-6">
        <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center mb-3">
            <Icon className="w-7 h-7 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground font-medium text-center">{message}</p>
        {sub && <p className="text-xs text-muted-foreground/60 mt-1 text-center">{sub}</p>}
    </motion.div>
);

// ─── Main Page ────────────────────────────────────────────────────────────────

type TabId = 0 | 1;

const Events = () => {
    const { user }    = useUser();
    const { profile } = useProfile();

    // Original auth / permissions
    const isLocalAdmin      = isLocalAdminAuthenticated();
    const isAdmin           = isLocalAdmin || profile?.role === 'admin';
    const campusId          = profile?.college_id || getLocalAdminCampusId() || null;
    const canViewCampusFeed = Boolean(campusId);
    const canPostCampusFeed = canViewCampusFeed;

    const [activeTab, setActiveTab]               = useState<TabId>(0);
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [showEventForm, setShowEventForm]         = useState(false);
    const [editingItem, setEditingItem]             = useState<{ data: any; isAnnouncement: boolean } | null>(null);

    const { events, isLoading } = useEvents(selectedCategory, campusId);
    const { announcements }     = useAnnouncements(campusId);

    const sliderRef = useRef<HTMLDivElement>(null);

    const switchTab = (id: TabId) => {
        setActiveTab(id);
        sliderRef.current?.scrollTo({ left: id * (sliderRef.current.offsetWidth), behavior: 'smooth' });
    };

    const handleSliderScroll = () => {
        if (!sliderRef.current) return;
        const idx = Math.round(sliderRef.current.scrollLeft / sliderRef.current.offsetWidth);
        if (idx === 0 || idx === 1) setActiveTab(idx as TabId);
    };

    return (
        <div className="flex flex-col h-full overflow-hidden">

            {/* ── Sticky header ── */}
            <div className="shrink-0 px-4 pt-3 bg-background border-b border-border/30">

                {/* Title + add button */}
                <div className="flex items-center justify-between mb-3">
                    <div>
                        <h1 className="text-xl font-heading font-bold text-foreground">Events & Alerts</h1>
                        <p className="text-xs text-muted-foreground mt-0.5">Stay updated with campus happenings</p>
                    </div>
                    {canPostCampusFeed && (
                        <button
                            onClick={() => setShowEventForm(true)}
                            aria-label="Add event or alert"
                            className="w-9 h-9 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-md active:scale-95 transition-transform"
                        >
                            <Plus className="w-4 h-4" />
                        </button>
                    )}
                </div>

                {/* Tab pills */}
                <div className="flex gap-1 bg-secondary rounded-xl p-1">
                    {([
                        { id: 0 as TabId, icon: Bell,     label: 'Announcements', count: announcements.length },
                        { id: 1 as TabId, icon: Calendar, label: 'Events',        count: events.length        },
                    ] as const).map(({ id, icon: Icon, label, count }) => (
                        <button
                            key={id}
                            onClick={() => switchTab(id)}
                            className={`relative flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-semibold transition-all active:scale-[0.97]
                                ${activeTab === id
                                    ? 'bg-card text-foreground shadow-sm'
                                    : 'text-muted-foreground'}`}
                        >
                            <Icon className="w-3.5 h-3.5 shrink-0" />
                            <span>{label}</span>
                            {count > 0 && (
                                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold leading-none
                                    ${activeTab === id
                                        ? 'bg-primary/15 text-primary'
                                        : 'bg-muted-foreground/15 text-muted-foreground'}`}>
                                    {count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Sliding indicator bar */}
                <div className="relative h-0.5 bg-border/20 mt-2 rounded-full overflow-hidden">
                    <motion.div
                        className="absolute top-0 h-full w-1/2 bg-primary rounded-full"
                        animate={{ x: activeTab === 0 ? '0%' : '100%' }}
                        transition={{ type: 'spring', stiffness: 420, damping: 38 }}
                    />
                </div>

                {/* Category pills — only visible on Events tab */}
                <AnimatePresence initial={false}>
                    {activeTab === 1 && (
                        <motion.div
                            key="cats"
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.18 }}
                            className="overflow-hidden"
                        >
                            <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-2.5">
                                {CATEGORIES.map((cat) => (
                                    <button
                                        key={cat}
                                        onClick={() => setSelectedCategory(cat)}
                                        className={`px-3 py-1.5 rounded-full text-[11px] font-medium whitespace-nowrap shrink-0 transition-all active:scale-95
                                            ${selectedCategory === cat
                                                ? 'bg-primary/15 text-primary border border-primary/30'
                                                : 'bg-secondary text-muted-foreground border border-transparent'}`}
                                    >
                                        {cat === 'all' ? 'All' : cat.charAt(0).toUpperCase() + cat.slice(1)}
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* ── Content area ── */}
            {!canViewCampusFeed ? (
                <EmptyState icon={Bell} message="Events and alerts are visible only to users mapped to a campus." />
            ) : (
                <div
                    ref={sliderRef}
                    onScroll={handleSliderScroll}
                    className="flex-1 flex overflow-x-auto snap-x snap-mandatory"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
                >
                    {/* Panel 0 — Announcements */}
                    <div className="w-full shrink-0 snap-start overflow-y-auto pb-32 px-4 pt-4">
                        {announcements.length === 0 ? (
                            <EmptyState icon={Bell} message="No active announcements" sub="Campus alerts will appear here" />
                        ) : (
                            <div className="space-y-2.5">
                                {announcements.map((a, i) => (
                                    <motion.div
                                        key={a.id}
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.04 }}
                                    >
                                        <AnnouncementBanner
                                            announcement={a}
                                            currentUserId={user?.id}
                                            isAdmin={isAdmin}
                                            onEdit={(ann) => setEditingItem({ data: ann, isAnnouncement: true })}
                                        />
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Panel 1 — Events */}
                    <div className="w-full shrink-0 snap-start overflow-y-auto pb-32 px-4 pt-4">
                        {isLoading ? (
                            <div className="flex items-center justify-center py-16">
                                <div className="w-8 h-8 rounded-xl bg-primary/20 animate-pulse" />
                            </div>
                        ) : events.length === 0 ? (
                            <EmptyState icon={Calendar} message="No upcoming events" sub="Check back later for new events" />
                        ) : (
                            <div className="space-y-3">
                                {events.map((event, i) => (
                                    <motion.div
                                        key={event.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.04 }}
                                    >
                                        <EventCard
                                            event={event}
                                            currentUserId={user?.id}
                                            isAdmin={isAdmin}
                                            onEdit={(evt) => setEditingItem({ data: evt, isAnnouncement: false })}
                                        />
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── FAB ──
            {canPostCampusFeed && (
                <div className="absolute bottom-24 right-4 z-[400]">
                    <button
                        onClick={() => setShowEventForm(true)}
                        title="Add event or alert"
                        aria-label="Add event or alert"
                        className="w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.4)] flex items-center justify-center active:scale-95 transition-transform border-2 border-primary/20"
                    >
                        <Plus className="w-6 h-6" />
                    </button>
                </div>
            )} */}

            {/* ── EventForm Modal ── */}
            {(showEventForm || editingItem) && (
                <EventForm
                    onClose={() => { setShowEventForm(false); setEditingItem(null); }}
                    initialData={editingItem?.data}
                    isAnnouncement={editingItem?.isAnnouncement}
                />
            )}
        </div>
    );
};

export default Events;