// ─── Engineering College Constants ───────────────────────────────────────────
// Used as selector options across BuildingWizard, AttendanceManager, AdminPanel

export const BUILDING_TYPES = [
    // Academic
    { id: 'main-block', label: 'Main Block', icon: '🏛️', category: 'academic' },
    { id: 'lecture-hall', label: 'Lecture Hall', icon: '🎓', category: 'academic' },
    { id: 'seminar-hall', label: 'Seminar Hall', icon: '📢', category: 'academic' },
    { id: 'drawing-hall', label: 'Drawing Hall', icon: '📐', category: 'academic' },
    { id: 'computer-lab', label: 'Computer Lab', icon: '💻', category: 'academic' },
    { id: 'ai-ml-lab', label: 'AI / ML Lab', icon: '🤖', category: 'academic' },
    { id: 'data-science-lab', label: 'Data Science Lab', icon: '📊', category: 'academic' },
    { id: 'electronics-lab', label: 'Electronics Lab', icon: '🔭', category: 'academic' },
    { id: 'embedded-lab', label: 'Embedded Systems Lab', icon: '🔌', category: 'academic' },
    { id: 'vlsi-lab', label: 'VLSI Lab', icon: '🧪', category: 'academic' },
    { id: 'communication-lab', label: 'Communication Lab', icon: '📡', category: 'academic' },
    { id: 'mech-lab', label: 'Mechanical Lab', icon: '⚙️', category: 'academic' },
    { id: 'fluid-mech-lab', label: 'Fluid Mechanics Lab', icon: '💧', category: 'academic' },
    { id: 'heat-transfer-lab', label: 'Heat Transfer Lab', icon: '🌡️', category: 'academic' },
    { id: 'civil-lab', label: 'Civil / Survey Lab', icon: '📏', category: 'academic' },
    { id: 'environmental-lab', label: 'Environmental Lab', icon: '🌱', category: 'academic' },
    { id: 'chemistry-lab', label: 'Chemistry Lab', icon: '⚗️', category: 'academic' },
    { id: 'physics-lab', label: 'Physics Lab', icon: '🔬', category: 'academic' },
    { id: 'project-lab', label: 'Project / R&D Lab', icon: '🧰', category: 'academic' },
    { id: 'server-room', label: 'Server Room / Data Center', icon: '🖥️', category: 'academic' },
    { id: 'workshop', label: 'Central Workshop', icon: '🔧', category: 'academic' },
    // Admin
    { id: 'admin-office', label: 'Administrative Office', icon: '🏢', category: 'admin' },
    { id: 'principal-office', label: "Principal's Office", icon: '👔', category: 'admin' },
    { id: 'hod-office', label: 'HOD Office', icon: '📋', category: 'admin' },
    { id: 'exam-dept', label: 'Examination Department', icon: '📝', category: 'admin' },
    { id: 'accounts', label: 'Accounts / Finance', icon: '💰', category: 'admin' },
    { id: 'tpo-office', label: 'Training & Placement Office', icon: '💼', category: 'admin' },
    { id: 'nss-office', label: 'NSS / NCC Office', icon: '🎖️', category: 'admin' },
    { id: 'admin-gate', label: 'Main Gate / Security', icon: '🚪', category: 'admin' },
    // Facility
    { id: 'central-library', label: 'Central Library', icon: '📚', category: 'facility' },
    { id: 'auditorium', label: 'Auditorium / Convocation Hall', icon: '🎭', category: 'facility' },
    { id: 'canteen', label: 'Canteen / Cafeteria', icon: '🍽️', category: 'facility' },
    { id: 'medical-center', label: 'Medical Center', icon: '🏥', category: 'facility' },
    { id: 'bank-atm', label: 'Bank / ATM', icon: '🏦', category: 'facility' },
    { id: 'parking-area', label: 'Parking Area', icon: '🅿️', category: 'facility' },
    // Sports
    { id: 'sports-complex', label: 'Sports Complex', icon: '🏟️', category: 'sports' },
    { id: 'gymnasium', label: 'Gymnasium / Fitness Center', icon: '🏋️', category: 'sports' },
    { id: 'indoor-hall', label: 'Indoor Sports Hall', icon: '🏸', category: 'sports' },
    { id: 'cricket-ground', label: 'Cricket / Football Ground', icon: '🏏', category: 'sports' },
    // Hostel
    { id: 'boys-hostel', label: "Boys' Hostel", icon: '🛏️', category: 'hostel' },
    { id: 'girls-hostel', label: "Girls' Hostel", icon: '🏠', category: 'hostel' },
    { id: 'warden-office', label: 'Warden Office', icon: '🗝️', category: 'hostel' },
] as const;

export const ENGINEERING_DEPARTMENTS = [
    'Computer Science & Engineering',
    'Information Technology',
    'Artificial Intelligence & Data Science',
    'Electronics & Telecommunication',
    'Electrical Engineering',
    'Mechanical Engineering',
    'Civil Engineering',
    'Chemical Engineering',
    'Production Engineering',
    'Applied Science (First Year)',
] as const;

export const STAFF_TYPES = [
    { id: 'principal', label: 'Principal', type: 'admin' },
    { id: 'vice-principal', label: 'Vice Principal', type: 'admin' },
    { id: 'hod', label: 'Head of Department (HOD)', type: 'teaching' },
    { id: 'professor', label: 'Professor', type: 'teaching' },
    { id: 'asst-professor', label: 'Assistant Professor', type: 'teaching' },
    { id: 'lab-instructor', label: 'Lab Instructor', type: 'teaching' },
    { id: 'guest-lecturer', label: 'Guest Lecturer', type: 'teaching' },
    { id: 'librarian', label: 'Librarian', type: 'non-teaching' },
    { id: 'warden', label: 'Hostel Warden', type: 'non-teaching' },
    { id: 'accountant', label: 'Accounts Officer', type: 'non-teaching' },
    { id: 'clerk', label: 'Office Clerk', type: 'non-teaching' },
    { id: 'lab-attendant', label: 'Lab Attendant', type: 'non-teaching' },
    { id: 'security', label: 'Security Guard', type: 'non-teaching' },
    { id: 'peon', label: 'Peon / Helper', type: 'non-teaching' },
    { id: 'it-admin', label: 'IT Administrator', type: 'non-teaching' },
] as const;

export const STUDENT_YEARS = [
    { id: 'FE', label: 'First Year (FE)' },
    { id: 'SE', label: 'Second Year (SE)' },
    { id: 'TE', label: 'Third Year (TE)' },
    { id: 'BE', label: 'Final Year (BE)' },
] as const;

export const CLASS_SECTIONS = ['A', 'B', 'C', 'D'] as const;

export const ROOM_TYPES = [
    { id: 'classroom', label: 'Classroom', icon: '🪑' },
    { id: 'lab', label: 'Laboratory', icon: '🧪' },
    { id: 'office', label: 'Office', icon: '🗂️' },
    { id: 'library', label: 'Library', icon: '📚' },
    { id: 'canteen', label: 'Canteen', icon: '🍽️' },
    { id: 'auditorium', label: 'Auditorium', icon: '🎭' },
    { id: 'store', label: 'Store / Stock Room', icon: '📦' },
    { id: 'other', label: 'Other', icon: '🏷️' },
] as const;

export const BUILDING_CATEGORIES = [
    { id: 'academic', label: 'Academic', icon: '🎓' },
    { id: 'admin', label: 'Administrative', icon: '🏢' },
    { id: 'facility', label: 'Facility', icon: '🏛️' },
    { id: 'sports', label: 'Sports', icon: '⚽' },
    { id: 'hostel', label: 'Hostel', icon: '🏠' },
] as const;

export type BuildingTypeId = typeof BUILDING_TYPES[number]['id'];
export type Department = typeof ENGINEERING_DEPARTMENTS[number];
export type StaffTypeId = typeof STAFF_TYPES[number]['id'];
export type StudentYear = typeof STUDENT_YEARS[number]['id'];
export type ClassSection = typeof CLASS_SECTIONS[number];
