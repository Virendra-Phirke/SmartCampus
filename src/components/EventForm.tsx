import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { X, Calendar, Bell, Megaphone, CheckCircle2 } from 'lucide-react';
import { useAddEvent, useAddAnnouncement } from '@/hooks/useAddEvent';

const eventSchema = z.object({
    title: z.string().min(3, "Title required"),
    description: z.string().min(5, "Description required"),
    category: z.enum(['academic', 'cultural', 'sports', 'seminar', 'workshop', 'other']),
    location: z.string().optional(),
    date: z.string().min(1, "Date required"),
    time: z.string().min(1, "Time required"),
});

const announcementSchema = z.object({
    title: z.string().min(3, "Title required"),
    body: z.string().min(5, "Body required"),
    priority: z.enum(['urgent', 'high', 'medium', 'low']),
});

export const EventForm = ({ onClose }: { onClose: () => void }) => {
    const [type, setType] = useState<'event' | 'announcement'>('event');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const addEvent = useAddEvent();
    const addAnnouncement = useAddAnnouncement();

    const { register: regEvt, handleSubmit: submitEvt, formState: { errors: errEvt } } = useForm<z.infer<typeof eventSchema>>({
        resolver: zodResolver(eventSchema),
    });

    const { register: regAnn, handleSubmit: submitAnn, formState: { errors: errAnn } } = useForm<z.infer<typeof announcementSchema>>({
        resolver: zodResolver(announcementSchema),
    });

    const onEventSubmit = async (data: z.infer<typeof eventSchema>) => {
        setIsSubmitting(true);
        try {
            const startDateTime = new Date(`${data.date}T${data.time}`).toISOString();
            // Assume end time is 1 hour later for simplicity
            const endDateTime = new Date(new Date(startDateTime).getTime() + 60 * 60 * 1000).toISOString();

            await addEvent.mutateAsync({
                title: data.title,
                description: data.description,
                category: data.category,
                location: data.location || 'Campus',
                start_time: startDateTime,
                end_time: endDateTime,
            });
            onClose();
        } catch (e) {
            console.error(e);
            alert('Failed to post event');
        } finally {
            setIsSubmitting(false);
        }
    };

    const onAnnouncementSubmit = async (data: z.infer<typeof announcementSchema>) => {
        setIsSubmitting(true);
        try {
            await addAnnouncement.mutateAsync({
                title: data.title,
                body: data.body,
                priority: data.priority,
            });
            onClose();
        } catch (e) {
            console.error(e);
            alert('Failed to post announcement');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[1000] bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-card w-full max-w-md rounded-2xl shadow-2xl border border-border p-5 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center mb-5">
                    <div className="flex gap-2 p-1 bg-muted rounded-xl">
                        <button
                            onClick={() => setType('event')}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${type === 'event' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'}`}
                        >
                            <Calendar className="w-4 h-4" /> Event
                        </button>
                        <button
                            onClick={() => setType('announcement')}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${type === 'announcement' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'}`}
                        >
                            <Bell className="w-4 h-4" /> Alert
                        </button>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-muted text-muted-foreground transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {type === 'event' ? (
                    <form onSubmit={submitEvt(onEventSubmit)} className="space-y-4">
                        <div>
                            <input {...regEvt('title')} placeholder="Event Title" className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                            {errEvt.title && <p className="text-xs text-destructive mt-1">{errEvt.title.message}</p>}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <input type="date" {...regEvt('date')} className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                            </div>
                            <div>
                                <input type="time" {...regEvt('time')} className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <select {...regEvt('category')} className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
                                <option value="academic">Academic</option>
                                <option value="cultural">Cultural</option>
                                <option value="sports">Sports</option>
                                <option value="seminar">Seminar</option>
                            </select>
                            <input {...regEvt('location')} placeholder="Location (optional)" className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                        </div>
                        <textarea {...regEvt('description')} placeholder="Event Description" rows={3} className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none" />

                        <button type="submit" disabled={isSubmitting} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-2.5 rounded-xl transition-all shadow-md mt-4">
                            {isSubmitting ? 'Posting...' : 'Post Event'}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={submitAnn(onAnnouncementSubmit)} className="space-y-4">
                        <div>
                            <input {...regAnn('title')} placeholder="Announcement Title" className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                            {errAnn.title && <p className="text-xs text-destructive mt-1">{errAnn.title.message}</p>}
                        </div>
                        <select {...regAnn('priority')} className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
                            <option value="low">Low Priority</option>
                            <option value="medium">Medium Priority</option>
                            <option value="high">High Priority</option>
                            <option value="urgent">Urgent</option>
                        </select>
                        <textarea {...regAnn('body')} placeholder="Announcement Details..." rows={4} className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none" />

                        <button type="submit" disabled={isSubmitting} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-semibold py-2.5 rounded-xl transition-all shadow-md mt-4">
                            {isSubmitting ? 'Posting...' : 'Post Alert'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
};
