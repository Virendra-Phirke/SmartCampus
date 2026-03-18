export interface CampusBuilding {
  id: string;
  name: string;
  shortName: string;
  category: 'academic' | 'admin' | 'facility' | 'sports' | 'hostel';
  lat: number;
  lng: number;
  description: string;
  floors?: number;
  departments?: string[];
}

// P R Pote College of Engineering and Management, Amravati
// Center: approx 20.9320, 77.7523
export const CAMPUS_CENTER: [number, number] = [20.9320, 77.7523];
export const CAMPUS_ZOOM = 17;

export const buildings: CampusBuilding[] = [
  {
    id: 'main-block',
    name: 'Main Academic Block',
    shortName: 'Main Block',
    category: 'academic',
    lat: 20.9325,
    lng: 77.7520,
    description: 'Central academic building with lecture halls and faculty offices.',
    floors: 4,
    departments: ['Computer Science', 'Information Technology'],
  },
  {
    id: 'admin-block',
    name: 'Administrative Building',
    shortName: 'Admin',
    category: 'admin',
    lat: 20.9330,
    lng: 77.7528,
    description: 'Principal office, admissions, accounts, and administrative services.',
    floors: 3,
  },
  {
    id: 'mech-block',
    name: 'Mechanical Engineering Block',
    shortName: 'Mech Block',
    category: 'academic',
    lat: 20.9318,
    lng: 77.7515,
    description: 'Workshops, labs, and classrooms for Mechanical Engineering.',
    floors: 3,
    departments: ['Mechanical Engineering'],
  },
  {
    id: 'civil-block',
    name: 'Civil Engineering Block',
    shortName: 'Civil Block',
    category: 'academic',
    lat: 20.9315,
    lng: 77.7530,
    description: 'Surveying labs, structural labs, and Civil Engineering classrooms.',
    floors: 3,
    departments: ['Civil Engineering'],
  },
  {
    id: 'ece-block',
    name: 'Electronics & Communication Block',
    shortName: 'ECE Block',
    category: 'academic',
    lat: 20.9322,
    lng: 77.7535,
    description: 'ECE labs including VLSI, embedded systems, and communication labs.',
    floors: 3,
    departments: ['Electronics & Communication'],
  },
  {
    id: 'library',
    name: 'Central Library',
    shortName: 'Library',
    category: 'facility',
    lat: 20.9328,
    lng: 77.7515,
    description: 'Three-story library with digital section, reading halls, and journal archives.',
    floors: 3,
  },
  {
    id: 'canteen',
    name: 'Main Canteen',
    shortName: 'Canteen',
    category: 'facility',
    lat: 20.9312,
    lng: 77.7522,
    description: 'Campus cafeteria serving breakfast, lunch, and snacks.',
    floors: 1,
  },
  {
    id: 'sports-complex',
    name: 'Sports Complex',
    shortName: 'Sports',
    category: 'sports',
    lat: 20.9310,
    lng: 77.7510,
    description: 'Indoor and outdoor sports facilities including basketball court and gym.',
    floors: 2,
  },
  {
    id: 'boys-hostel',
    name: "Boys' Hostel",
    shortName: 'Boys Hostel',
    category: 'hostel',
    lat: 20.9308,
    lng: 77.7535,
    description: 'Residential facility for male students with mess hall.',
    floors: 4,
  },
  {
    id: 'girls-hostel',
    name: "Girls' Hostel",
    shortName: 'Girls Hostel',
    category: 'hostel',
    lat: 20.9335,
    lng: 77.7510,
    description: 'Residential facility for female students with mess hall.',
    floors: 4,
  },
  {
    id: 'auditorium',
    name: 'College Auditorium',
    shortName: 'Auditorium',
    category: 'facility',
    lat: 20.9333,
    lng: 77.7522,
    description: 'Main auditorium for events, seminars, and cultural programs. Capacity: 800.',
    floors: 2,
  },
  {
    id: 'workshop',
    name: 'Central Workshop',
    shortName: 'Workshop',
    category: 'academic',
    lat: 20.9316,
    lng: 77.7508,
    description: 'Hands-on workshop for first-year engineering students.',
    floors: 1,
  },
];

export const categoryIcons: Record<CampusBuilding['category'], string> = {
  academic: '🏫',
  admin: '🏛️',
  facility: '🏢',
  sports: '⚽',
  hostel: '🏠',
};

export const categoryColors: Record<CampusBuilding['category'], string> = {
  academic: 'hsl(174, 62%, 47%)',
  admin: 'hsl(38, 92%, 55%)',
  facility: 'hsl(260, 60%, 60%)',
  sports: 'hsl(140, 60%, 45%)',
  hostel: 'hsl(340, 60%, 55%)',
};
