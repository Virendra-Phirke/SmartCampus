-- =============================================
-- Seed Colleges from Google Maps embed data
-- Run this AFTER college_migration.sql
-- =============================================

INSERT INTO colleges (name, short_name, lat, lng, zoom, address) VALUES
(
  'College Of Engineering And Technology Akola',
  'COETA Akola',
  20.704687,
  77.086968,
  17,
  'Babhulgaon (Jh.), NH-6, Akola 444104'
),
(
  'P. R. Pote Patil College of Engineering and Management',
  'PR Pote',
  20.987389,
  77.756897,
  17,
  'Pote Estate, Kathora Rd, Amravati 444602'
),
(
  'Pankaj Laddhad Institute Of Technology And Management Studies',
  'PLITMS',
  20.478669,
  76.209090,
  17,
  'Chikhli, Buldhana'
),
(
  'Padmashri Dr. V.B. Kolte College of Engineering',
  'VB Kolte COE',
  20.897616,
  76.199000,
  17,
  'Malkapur, Buldhana'
);
