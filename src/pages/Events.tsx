import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Calendar, Clock, MapPin, Filter, X, Bell, AlertTriangle,
    Megaphone, GraduationCap, Music, Trophy, Lightbulb, Wrench, Star, Plus
} from 'lucide-react';
import { useEvents } from '@/hooks/useEvents';
import { useAnnouncements } from '@/hooks/useAnnouncements';
import { format, formatDistanceToNow } from 'date-fns';
import type { Event, Announcement } from '@/lib/types';
import { EventForm } from '@/components/EventForm';

const eventCategoryConfig: Record<string, { icon: any; color: string; label: string }> = {
    academic: { icon: GraduationCap, color: 'text-blue-400 bg-blue-400/15', label: 'Academic' },
    cultural: { icon: Music, color: 'text-purple-400 bg-purple-400/15', label: 'Cultural' },
    sports: { icon: Trophy, color: 'text-green-400 bg-green-400/15', label: 'Sports' },
    seminar: { icon: Lightbulb, color: 'text-yellow-400 bg-yellow-400/15', label: 'Seminar' },
    workshop: { icon: Wrench, color: 'text-orange-400 bg-orange-400/15', label: 'Workshop' },
    other: { icon: Star, color: 'text-gray-400 bg-gray-400/15', label: 'Other' },
};

const priorityConfig: Record<string, { color: string; icon: any }> = {
    urgent: { color: 'bg-red-500/15 border-red-500/30 text-red-400', icon: AlertTriangle },
    high: { color: 'bg-orange-500/15 border-orange-500/30 text-orange-400', icon: Bell },
    medium: { color: 'bg-yellow-500/15 border-yellow-500/30 text-yellow-400', icon: Megaphone },
    low: { color: 'bg-blue-500/15 border-blue-500/30 text-blue-400', icon: Bell },
};

const EventCard = ({ event }: { event: Event }) => {
    const [expanded, setExpanded] = useState(false);
    const cfg = eventCategoryConfig[event.category] || eventCategoryConfig.other;
    const Icon = cfg.icon;
    const startDate = new Date(event.start_time);
    const endDate = new Date(event.end_time);
    const isUpcoming = startDate > new Date();

    return (
        <motion.div
            layout
            onClick={() => setExpanded(!expanded)}
            className="bg-card rounded-2xl border border-border/50 overflow-hidden hover:border-border/70 transition-colors cursor-pointer"
        >
            <div className="p-4">
                <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${cfg.color}`}>
                        <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            {isUpcoming && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/15 text-primary font-medium">
                                    Upcoming
                                </span>
                            )}
                            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${cfg.color}`}>
                                {cfg.label}
                            </span>
                        </div>
                        <h3 className="text-sm font-semibold text-foreground leading-tight">{event.title}</h3>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2">
                            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {format(startDate, 'MMM dd, yyyy')}
                            </span>
                            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {format(startDate, 'hh:mm a')} – {format(endDate, 'hh:mm a')}
                            </span>
                            {event.location && (
                                <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                                    <MapPin className="w-3 h-3" />
                                    {event.location}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
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
                        <div className="px-4 pb-4 pt-0 border-t border-border/30">
                            <p className="text-sm text-muted-foreground leading-relaxed mt-3">{event.description}</p>
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

const AnnouncementBanner = ({ announcement }: { announcement: Announcement }) => {
    const pcfg = priorityConfig[announcement.priority] || priorityConfig.low;
    const PIcon = pcfg.icon;

    return (
        <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-xl border p-3 flex items-start gap-3 ${pcfg.color}`}
        >
            <PIcon className="w-4 h-4 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold leading-tight">{announcement.title}</p>
                <p className="text-[11px] opacity-80 mt-0.5 leading-snug">{announcement.body}</p>
            </div>
        </motion.div>
    );
};

const categories = ['all', 'academic', 'cultural', 'sports', 'seminar', 'workshop'];

const Events = () => {
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [showEventForm, setShowEventForm] = useState(false);
    const { events, isLoading } = useEvents(selectedCategory);
    const { announcements } = useAnnouncements();

    return (
        <div className="flex flex-col h-full px-4 pt-2 pb-32 overflow-y-auto">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4"
            >
                <h1 className="text-2xl font-heading font-bold text-foreground">Events & Alerts</h1>
                <p className="text-sm text-muted-foreground mt-0.5">Stay updated with campus happenings</p>
            </motion.div>

            {/* Announcements */}
            {announcements.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 }}
                    className="space-y-2 mb-5"
                >
                    <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <Bell className="w-3.5 h-3.5" />
                        Announcements
                    </h2>
                    {announcements.slice(0, 3).map((a) => (
                        <AnnouncementBanner key={a.id} announcement={a} />
                    ))}
                </motion.div>
            )}

            {/* Category Filters */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar mb-4">
                {categories.map((cat) => (
                    <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${selectedCategory === cat
                            ? 'bg-primary/15 text-primary border border-primary/30'
                            : 'bg-secondary text-muted-foreground border border-transparent hover:bg-secondary/80'
                            }`}
                    >
                        {cat === 'all' ? 'All Events' : cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </button>
                ))}
            </div>

            {/* Events List */}
            <div className="flex-1 space-y-3">
                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="w-8 h-8 rounded-xl bg-primary/20 animate-pulse" />
                    </div>
                ) : events.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-center py-12"
                    >
                        <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-3">
                            <Calendar className="w-7 h-7 text-muted-foreground" />
                        </div>
                        <p className="text-sm text-muted-foreground">No upcoming events</p>
                        <p className="text-xs text-muted-foreground/60 mt-1">Check back later for new events</p>
                    </motion.div>
                ) : (
                    events.map((event, i) => (
                        <motion.div
                            key={event.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.04 }}
                        >
                            <EventCard event={event} />
                        </motion.div>
                    ))
                )}
            </div>

            {/* Floating Action Button for Adding Events/Announcements */}
            <div className="absolute bottom-24 right-4 z-[400]">
                <button
                    onClick={() => setShowEventForm(true)}
                    className="w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.4)] flex items-center justify-center hover:scale-105 transition-transform active:scale-95 border-2 border-primary/20"
                >
                    <Plus className="w-6 h-6" />
                </button>
            </div>

            {/* Event Form Modal */}
            {showEventForm && <EventForm onClose={() => setShowEventForm(false)} />}
        </div>
    );
};

export default Events;
