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

export interface Campus {
  id: string;
  name: string;
  shortName: string;
  lat: number;
  lng: number;
  zoom: number;
  address: string;
}

export const campuses: Campus[] = [
  {
    id: "pote-amravati",
    name: "P R Pote College of Engineering and Management",
    shortName: "PR Pote",
    lat: 20.986214,
    lng: 77.758666,
    zoom: 17,
    address: "Pote Estate, Kathora Rd, Amravati 444602"
  },
  {
    id: "sipna-amravati",
    name: "Sipna College of Engineering & Technology",
    shortName: "Sipna",
    lat: 20.881389,
    lng: 77.747778,
    zoom: 16,
    address: "Infront of Nemani Godown, Badnera Road, Amravati 444701"
  },
  {
    id: "gcoea",
    name: "Government College of Engineering",
    shortName: "GCOEA",
    lat: 20.957130,
    lng: 77.756920,
    zoom: 16,
    address: "Kathora Naka, Amravati 444604"
  },
  {
    id: "sgbau-amravati",
    name: "Sant Gadge Baba Amravati University",
    shortName: "SGBAU",
    lat: 20.9255,
    lng: 77.7713,
    zoom: 15,
    address: "Tapovan Road, Camp, Amravati 444602"
  },
  {
    id: "ssgmce-shegaon",
    name: "Shri Sant Gajanan Maharaj College of Engineering",
    shortName: "SSGMCE Shegaon",
    lat: 20.7936,
    lng: 76.6891,
    zoom: 16,
    address: "Khamgaon Road, Shegaon, Buldhana 444203"
  },
  {
    id: "coet-akola",
    name: "College of Engineering & Technology",
    shortName: "COETA Akola",
    lat: 20.6721,
    lng: 77.0163,
    zoom: 16,
    address: "Babhulgaon (Jh.), NH-6, Akola 444104"
  },
  {
    id: "anuradha-chikhli",
    name: "Anuradha Engineering College",
    shortName: "Anuradha Chikhli",
    lat: 20.356326,
    lng: 76.218767,
    zoom: 16,
    address: "Anuradha Nagar, Sakegaon Road, Chikhli, Buldhana 443201"
  }
];

// P R Pote Patil College of Engineering & Management, Amravati
// Pote Estate, Kathora Rd, Amravati 444602
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
    id: 'ai-ds-block',
    name: 'AI & Data Science Block',
    shortName: 'AI & DS',
    category: 'academic',
    lat: 20.9880,
    lng: 77.7578,
    description: 'Department of Artificial Intelligence and Data Science with ML labs and smart classrooms.',
    floors: 3,
    departments: ['Artificial Intelligence', 'Data Science'],
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
  {
    id: 'parking',
    name: 'Main Parking Area',
    shortName: 'Parking',
    category: 'facility',
    lat: 20.9862,
    lng: 77.7570,
    description: 'Two-wheeler and four-wheeler parking with security booth.',
    floors: 1,
  },
  {
    id: 'gate-main',
    name: 'Main Gate',
    shortName: 'Main Gate',
    category: 'admin',
    lat: 20.9860,
    lng: 77.7575,
    description: 'Primary campus entrance with security checkpoint.',
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
