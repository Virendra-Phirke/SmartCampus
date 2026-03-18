import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { X, Users, BookOpen, MapPin, Plus, GraduationCap } from 'lucide-react';
import type { CampusBuilding } from '@/data/campusData';

interface ManagerProps {
    building: CampusBuilding;
    onClose: () => void;
}

export default function BuildingDetailsManager({ building, onClose }: ManagerProps) {
    const [activeTab, setActiveTab] = useState<'rooms' | 'staff' | 'students'>('rooms');

    // We would normally fetch these from Supabase based on the building ID
    // For now we'll just set up the UI shell

    return (
        <div className="fixed inset-0 z-[1000] bg-background/90 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-card w-full max-w-3xl h-[85vh] rounded-3xl shadow-2xl border border-border flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-border bg-muted/20">
                    <div>
                        <h2 className="font-heading font-bold text-xl">{building.name}</h2>
                        <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5">
                            <MapPin className="w-3.5 h-3.5" /> Manage Internal Details
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors text-muted-foreground">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-border bg-muted/10">
                    <button
                        onClick={() => setActiveTab('rooms')}
                        className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 border-b-2 transition-colors ${activeTab === 'rooms' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                    >
                        <MapPin className="w-4 h-4" /> Rooms
                    </button>
                    <button
                        onClick={() => setActiveTab('staff')}
                        className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 border-b-2 transition-colors ${activeTab === 'staff' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                    >
                        <Users className="w-4 h-4" /> Staff
                    </button>
                    <button
                        onClick={() => setActiveTab('students')}
                        className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 border-b-2 transition-colors ${activeTab === 'students' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                    >
                        <GraduationCap className="w-4 h-4" /> Students
                    </button>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-6 bg-muted/5">

                    {activeTab === 'rooms' && (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="font-semibold">Building Layout</h3>
                                <button className="text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded-lg font-medium flex items-center gap-1">
                                    <Plus className="w-3.5 h-3.5" /> Add Room
                                </button>
                            </div>
                            <div className="text-center py-12 border-2 border-dashed border-border rounded-2xl bg-background">
                                <BookOpen className="w-8 h-8 mx-auto text-muted-foreground mb-3" />
                                <p className="font-medium text-foreground">No rooms mapped yet</p>
                                <p className="text-sm text-muted-foreground">Add classrooms, labs, and offices.</p>
                            </div>
                        </div>
                    )}

                    {activeTab === 'staff' && (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="font-semibold">Assigned Staff</h3>
                                <button className="text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded-lg font-medium flex items-center gap-1">
                                    <Plus className="w-3.5 h-3.5" /> Assign Staff
                                </button>
                            </div>
                            <div className="text-center py-12 border-2 border-dashed border-border rounded-2xl bg-background">
                                <Users className="w-8 h-8 mx-auto text-muted-foreground mb-3" />
                                <p className="font-medium text-foreground">No staff assigned</p>
                                <p className="text-sm text-muted-foreground">Assign HODs, lab instructors, and admins to this building.</p>
                            </div>
                        </div>
                    )}

                    {activeTab === 'students' && (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="font-semibold">Student Directory</h3>
                            </div>
                            <div className="text-center py-12 border-2 border-dashed border-border rounded-2xl bg-background">
                                <GraduationCap className="w-8 h-8 mx-auto text-muted-foreground mb-3" />
                                <p className="font-medium text-foreground">Directory unavailable</p>
                                <p className="text-sm text-muted-foreground">Students appear here based on course schedules.</p>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}
