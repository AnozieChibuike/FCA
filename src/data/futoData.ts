export interface FUTOFaculty {
  code: string;
  name: string;
  departments: string[];
}

export const FUTO_FACULTIES: FUTOFaculty[] = [
  {
    code: 'SICT',
    name: 'School of Information and Communication Technology (SICT)',
    departments: [
      'Computer Science',
      'Cyber Security',
      'Information Technology',
      'Software Engineering'
    ]
  },
  {
    code: 'SEET',
    name: 'School of Engineering and Engineering Technology (SEET)',
    departments: [
      'Agricultural and Bioresources Engineering',
      'Biomedical Engineering',
      'Chemical Engineering',
      'Civil Engineering',
      'Computer Engineering',
      'Electrical/Power Systems Engineering',
      'Electronic Engineering',
      'Food Science and Technology',
      'Material and Metallurgical Engineering',
      'Mechanical Engineering',
      'Mechatronics Engineering',
      'Petroleum Engineering',
      'Polymer and Textile Engineering',
      'Telecommunications Engineering'
    ]
  },
  {
    code: 'SAAT',
    name: 'School of Agriculture and Agricultural Technology (SAAT)',
    departments: [
      'Agribusiness',
      'Agricultural Economics',
      'Agricultural Extension',
      'Animal Science and Technology',
      'Crop Science and Technology',
      'Fisheries and Aquaculture Technology',
      'Forestry and Wildlife Technology',
      'Soil Science and Technology'
    ]
  },
  {
    code: 'SOES',
    name: 'School of Environmental Sciences (SOES)',
    departments: [
      'Architecture',
      'Building Technology',
      'Environmental Management',
      'Estate Management and Valuation',
      'Quantity Surveying',
      'Surveying and Geoinformatics',
      'Urban and Regional Planning'
    ]
  },
  {
    code: 'SOBS',
    name: 'School of Biological Sciences (SOBS)',
    departments: [
      'Biochemistry',
      'Biology',
      'Biotechnology',
      'Forensic Science',
      'Microbiology'
    ]
  },
  {
    code: 'SOPS',
    name: 'School of Physical Sciences (SOPS)',
    departments: [
      'Chemistry',
      'Mathematics',
      'Physics',
      'Science Laboratory Technology',
      'Statistics'
    ]
  },
  {
    code: 'SOHT',
    name: 'School of Health Technology (SOHT)',
    departments: [
      'Dental Technology',
      'Environmental Health Science',
      'Optometry',
      'Prosthetics and Orthotics',
      'Public Health Technology',
      'Radiography'
    ]
  },
  {
    code: 'SBMS',
    name: 'School of Basic Medical Sciences (SBMS)',
    departments: [
      'Human Anatomy',
      'Human Physiology'
    ]
  },
  {
    code: 'SLIT',
    name: 'School of Logistics and Innovation Technology (SLIT)',
    departments: [
      'Entrepreneurship and Innovation',
      'Financial Management Technology',
      'Logistics and Transport Technology',
      'Maritime Technology and Logistics',
      'Project Management Technology',
      'Logistics and Supply Chain Management'

    ]
  }
];

export const ALL_FUTO_DEPARTMENTS = FUTO_FACULTIES.flatMap(f => f.departments).sort();
