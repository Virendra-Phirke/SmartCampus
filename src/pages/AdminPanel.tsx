import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, BookOpen, Building2, UserCog, Plus, Search, ShieldCheck } from 'lucide-react';

type AdminTab = 'departments' | 'courses' | 'staff' | 'students';

export default function AdminPanel() {
    const [activeTab, setActiveTab] = useState<AdminTab>('departments');
    const [searchQuery, setSearchQuery] = useState('');

    return (
        <div className="flex flex-col h-full overflow-hidden bg-background">

            {/* Header */}
            <div className="px-4 pt-6 pb-4 bg-card border-b border-border shadow-sm z-10">
                <div className="flex items-center gap-2 mb-1">
                    <ShieldCheck className="w-6 h-6 text-primary" />
                    <h1 className="text-2xl font-heading font-bold">Admin Panel</h1>
                </div>
                <p className="text-muted-foreground text-sm">Central college data management.</p>

                {/* Search & Action Bar */}
                <div className="flex gap-2 mt-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Search records..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-muted/50 border border-border rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                    </div>
                    <button className="bg-primary text-primary-foreground px-4 rounded-xl flex items-center justify-center shadow-md active:scale-95 transition-transform">
                        <Plus className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex overflow-x-auto scrollbar-hide border-b border-border bg-card">
                <button
                    onClick={() => setActiveTab('departments')}
                    className={`flex-1 min-w-[100px] py-3 text-sm font-semibold flex items-center justify-center gap-2 border-b-2 transition-colors ${activeTab === 'departments' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                >
                    <Building2 className="w-4 h-4" /> Depts
                </button>
                <button
                    onClick={() => setActiveTab('courses')}
                    className={`flex-1 min-w-[100px] py-3 text-sm font-semibold flex items-center justify-center gap-2 border-b-2 transition-colors ${activeTab === 'courses' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                >
                    <BookOpen className="w-4 h-4" /> Courses
                </button>
                <button
                    onClick={() => setActiveTab('staff')}
                    className={`flex-1 min-w-[100px] py-3 text-sm font-semibold flex items-center justify-center gap-2 border-b-2 transition-colors ${activeTab === 'staff' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                >
                    <UserCog className="w-4 h-4" /> Staff
                </button>
                <button
                    onClick={() => setActiveTab('students')}
                    className={`flex-1 min-w-[100px] py-3 text-sm font-semibold flex items-center justify-center gap-2 border-b-2 transition-colors ${activeTab === 'students' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                >
                    <Users className="w-4 h-4" /> Students
                </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-4 bg-muted/10">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="h-full"
                    >
                        {/* Empty State Shell for Demo */}
                        <div className="h-full flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-border rounded-3xl bg-background">
                            {activeTab === 'departments' && <Building2 className="w-12 h-12 text-muted-foreground mb-4" />}
                            {activeTab === 'courses' && <BookOpen className="w-12 h-12 text-muted-foreground mb-4" />}
                            {activeTab === 'staff' && <UserCog className="w-12 h-12 text-muted-foreground mb-4" />}
                            {activeTab === 'students' && <Users className="w-12 h-12 text-muted-foreground mb-4" />}

                            <h3 className="font-heading font-bold text-lg mb-1 capitalize">No {activeTab} Found</h3>
                            <p className="text-sm text-muted-foreground mb-6">
                                Tap the + button above to add your first {activeTab.slice(0, -1)}.
                            </p>

                            <button className="bg-secondary text-secondary-foreground px-5 py-2.5 rounded-xl font-medium text-sm flex items-center gap-2 hover:bg-secondary/80 transition-colors">
                                <Plus className="w-4 h-4" /> Add {activeTab.slice(0, -1)}
                            </button>
                        </div>
                    </motion.div>
                </AnimatePresence>
            </div>

        </div>
    );
}
