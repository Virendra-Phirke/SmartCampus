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

export const buildings: CampusBuilding[] = [];

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
