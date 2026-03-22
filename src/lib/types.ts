// ─── Database Types ───────────────────────────────────────

export interface College {
    id: string;
    name: string;
    short_name: string;
    lat: number;
    lng: number;
    zoom: number;
    address: string;
    created_at: string;
}

export interface Building {
    id: string;
    name: string;
    short_name: string;
    category: 'academic' | 'admin' | 'facility' | 'sports' | 'hostel';
    lat: number;
    lng: number;
    description: string;
    floors: number;
    departments: string[];
    qr_code: string | null;
    created_by?: string | null;
    college_id?: string | null;
    created_at: string;
}

export interface Event {
    id: string;
    title: string;
    description: string;
    location: string;
    building_id: string | null;
    start_time: string;
    end_time: string;
    category: 'academic' | 'cultural' | 'sports' | 'seminar' | 'workshop' | 'other';
    image_url: string | null;
    created_by: string | null;
    created_at: string;
}

export interface AttendanceRecord {
    id: string;
    user_id: string;
    building_id: string;
    building_name?: string;
    checked_in_at: string;
    method: 'qr' | 'manual' | 'ble';
    session_id?: string | null;
    metadata?: any | null;
    created_at: string;
}

export interface AttendanceSession {
    id: string;
    session_name: string;
    description?: string | null;
    college_id?: string | null;
    target_audience?: string | null;
    department?: string | null;
    year?: string | null;
    section?: string | null;
    staff_type?: string | null;
    created_by?: string | null;
    created_at: string;
}

export interface Announcement {
    id: string;
    title: string;
    body: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    created_at: string;
    expires_at: string | null;
    created_by?: string | null;
}

export interface UserProfile {
    id: string;
    clerk_user_id: string;
    display_name: string;
    email: string;
    role: 'student' | 'faculty' | 'admin' | 'staff' | 'visitor';

    // Extended Profile Fields
    full_name?: string | null;
    mobile_no?: string | null;
    address?: string | null;

    // Role-specific Info
    role_id?: string | null;
    department_id?: string | null;
    course_id?: string | null;
    year?: string | null;
    section?: string | null;
    staff_type?: string | null;

    // College & Identity
    college_id?: string | null;
    username?: string | null;
    image_url?: string | null;

    created_at: string;
}

// ─── Component Prop Types ─────────────────────────────────

export type BuildingCategory = Building['category'];
export type EventCategory = Event['category'];
export type AnnouncementPriority = Announcement['priority'];
