import { useMemo } from 'react';
import { 
 BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
 LineChart, Line, PieChart, Pie, Cell 
} from 'recharts';
import { Users, Calendar, MapPin, Activity } from 'lucide-react';
import { useEvents } from '@/hooks/useEvents';
import { useBuildings } from '@/hooks/useBuildings';

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#0088fe', '#00C49F'];

export default function AnalyticsDashboard() {
 const { events } = useEvents();
 const { data: buildings } = useBuildings();

 // Mock Attendance Data over time
 const attendanceData = useMemo(() => {
 return [
 { name: 'Mon', count: 120 },
 { name: 'Tue', count: 156 },
 { name: 'Wed', count: 198 },
 { name: 'Thu', count: 145 },
 { name: 'Fri', count: 210 },
 { name: 'Sat', count: 45 },
 { name: 'Sun', count: 12 },
 ];
 }, []);

 const eventCategoryData = useMemo(() => {
 const counts: Record<string, number> = {};
 events.forEach(e => {
 counts[e.category] = (counts[e.category] || 0) + 1;
 });
 return Object.entries(counts).map(([name, value]) => ({ name, value }));
 }, [events]);

 const buildingData = useMemo(() => {
 const counts: Record<string, number> = {};
 buildings?.forEach(b => {
 counts[b.category] = (counts[b.category] || 0) + 1;
 });
 return Object.entries(counts).map(([name, value]) => ({ name, value }));
 }, [buildings]);

 return (
 <div className="h-full flex flex-col pt-4 overflow-y-auto pb-20">
 <h2 className="text-xl font-heading font-bold mb-6 flex items-center gap-2">
 <Activity className="w-5 h-5 text-primary" /> Campus Analytics
 </h2>

 {/* Stats Cards */}
 <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
 <div className="bg-card border border-border rounded-xl p-4 shadow-sm flex items-center gap-4">
 <div className="w-10 h-10 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center">
 <Users className="w-5 h-5" />
 </div>
 <div>
 <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Active Users</p>
 <p className="text-2xl font-bold font-heading">1,248</p>
 </div>
 </div>
 <div className="bg-card border border-border rounded-xl p-4 shadow-sm flex items-center gap-4">
 <div className="w-10 h-10 rounded-full bg-green-500/10 text-green-500 flex items-center justify-center">
 <MapPin className="w-5 h-5" />
 </div>
 <div>
 <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Buildings</p>
 <p className="text-2xl font-bold font-heading">{buildings?.length || 0}</p>
 </div>
 </div>
 <div className="bg-card border border-border rounded-xl p-4 shadow-sm flex items-center gap-4">
 <div className="w-10 h-10 rounded-full bg-purple-500/10 text-purple-500 flex items-center justify-center">
 <Calendar className="w-5 h-5" />
 </div>
 <div>
 <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Total Events</p>
 <p className="text-2xl font-bold font-heading">{events.length}</p>
 </div>
 </div>
 <div className="bg-card border border-border rounded-xl p-4 shadow-sm flex items-center gap-4">
 <div className="w-10 h-10 rounded-full bg-orange-500/10 text-orange-500 flex items-center justify-center">
 <Activity className="w-5 h-5" />
 </div>
 <div>
 <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Check-ins</p>
 <p className="text-2xl font-bold font-heading">8,492</p>
 </div>
 </div>
 </div>

 {/* Charts Grid */}
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 {/* Weekly Attendance Line Chart */}
 <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
 <h3 className="text-sm font-semibold mb-4 text-muted-foreground uppercase tracking-wider">Weekly App Usage</h3>
 <div className="h-[250px] w-full">
 <ResponsiveContainer width="100%" height="100%">
 <LineChart data={attendanceData}>
 <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
 <XAxis dataKey="name" stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
 <YAxis stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
 <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
 <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
 </LineChart>
 </ResponsiveContainer>
 </div>
 </div>

 {/* Event Categories Pie Chart */}
 <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
 <h3 className="text-sm font-semibold mb-4 text-muted-foreground uppercase tracking-wider">Events by Category</h3>
 <div className="h-[250px] w-full">
 <ResponsiveContainer width="100%" height="100%">
 <PieChart>
 <Pie 
 data={eventCategoryData} 
 innerRadius={60} 
 outerRadius={80} 
 paddingAngle={5} 
 dataKey="value"
 >
 {eventCategoryData.map((entry, index) => (
 <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
 ))}
 </Pie>
 <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
 </PieChart>
 </ResponsiveContainer>
 <div className="flex flex-wrap justify-center gap-3 mt-4">
 {eventCategoryData.map((entry, idx) => (
 <div key={entry.name} className="flex items-center gap-1.5 text-xs text-muted-foreground capitalize">
 <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
 {entry.name} ({entry.value})
 </div>
 ))}
 </div>
 </div>
 </div>

 {/* Buildings Category Bar Chart */}
 <div className="bg-card border border-border rounded-xl p-5 shadow-sm md:col-span-2">
 <h3 className="text-sm font-semibold mb-4 text-muted-foreground uppercase tracking-wider">Buildings Infrastructure</h3>
 <div className="h-[250px] w-full">
 <ResponsiveContainer width="100%" height="100%">
 <BarChart data={buildingData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
 <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
 <XAxis dataKey="name" stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
 <YAxis stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
 <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
 <Bar dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
 </BarChart>
 </ResponsiveContainer>
 </div>
 </div>
 </div>
 </div>
 );
}
