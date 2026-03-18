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
// P R Pote Patil College of Engineering & Management, Amravati
// Actual location: Pote Estate, Kathora Rd, Amravati 444602
export const CAMPUS_CENTER: [number, number] = [20.9878, 77.7575];
export const CAMPUS_ZOOM = 17;

export const buildings: CampusBuilding[] = [
  {
    id: 'main-block',
    name: 'Main Academic Block',
    shortName: 'Main Block',
    category: 'academic',
    lat: 20.9882,
    lng: 77.7572,
    description: 'Central academic building with lecture halls and faculty offices.',
    floors: 4,
    departments: ['Computer Science', 'Information Technology'],
  },
  {
    id: 'admin-block',
    name: 'Administrative Building',
    shortName: 'Admin',
    category: 'admin',
    lat: 20.9886,
    lng: 77.7580,
    description: 'Principal office, admissions, accounts, and administrative services.',
    floors: 3,
  },
  {
    id: 'mech-block',
    name: 'Mechanical Engineering Block',
    shortName: 'Mech Block',
    category: 'academic',
    lat: 20.9875,
    lng: 77.7565,
    description: 'Workshops, labs, and classrooms for Mechanical Engineering.',
    floors: 3,
    departments: ['Mechanical Engineering'],
  },
  {
    id: 'civil-block',
    name: 'Civil Engineering Block',
    shortName: 'Civil Block',
    category: 'academic',
    lat: 20.9872,
    lng: 77.7582,
    description: 'Surveying labs, structural labs, and Civil Engineering classrooms.',
    floors: 3,
    departments: ['Civil Engineering'],
  },
  {
    id: 'ece-block',
    name: 'Electronics & Telecommunication Block',
    shortName: 'E&TC Block',
    category: 'academic',
    lat: 20.9879,
    lng: 77.7588,
    description: 'E&TC labs including VLSI, embedded systems, and communication labs.',
    floors: 3,
    departments: ['Electronics & Telecommunication'],
  },
  {
    id: 'library',
    name: 'Central Library',
    shortName: 'Library',
    category: 'facility',
    lat: 20.9884,
    lng: 77.7568,
    description: 'Three-story library with digital section, reading halls, and journal archives.',
    floors: 3,
  },
  {
    id: 'canteen',
    name: 'Main Canteen',
    shortName: 'Canteen',
    category: 'facility',
    lat: 20.9869,
    lng: 77.7574,
    description: 'Campus cafeteria serving breakfast, lunch, and snacks.',
    floors: 1,
  },
  {
    id: 'sports-complex',
    name: 'Sports Complex',
    shortName: 'Sports',
    category: 'sports',
    lat: 20.9867,
    lng: 77.7562,
    description: 'Indoor and outdoor sports facilities including basketball court and gym.',
    floors: 2,
  },
  {
    id: 'boys-hostel',
    name: "Boys' Hostel",
    shortName: 'Boys Hostel',
    category: 'hostel',
    lat: 20.9865,
    lng: 77.7588,
    description: 'Residential facility for male students with mess hall.',
    floors: 4,
  },
  {
    id: 'girls-hostel',
    name: "Girls' Hostel",
    shortName: 'Girls Hostel',
    category: 'hostel',
    lat: 20.9892,
    lng: 77.7563,
    description: 'Residential facility for female students with mess hall.',
    floors: 4,
  },
  {
    id: 'auditorium',
    name: 'College Auditorium',
    shortName: 'Auditorium',
    category: 'facility',
    lat: 20.9890,
    lng: 77.7575,
    description: 'Main auditorium for events, seminars, and cultural programs. Capacity: 800.',
    floors: 2,
  },
  {
    id: 'workshop',
    name: 'Central Workshop',
    shortName: 'Workshop',
    category: 'academic',
    lat: 20.9873,
    lng: 77.7558,
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
