-- Insert SGBAU colleges into the colleges table
-- Run this in Supabase SQL Editor

INSERT INTO colleges (id, name, short_name, lat, lng, zoom, address, created_at) VALUES
(gen_random_uuid(), 'Government College of Engineering, Amravati', 'GCOE Amravati', 20.9571, 77.7569, 15, 'Amravati, Maharashtra', NOW()),
(gen_random_uuid(), 'Prof. Ram Meghe Institute of Technology & Research, Badnera', 'PRMITER Badnera', 20.9214, 77.8318, 15, 'Badnera, Maharashtra', NOW()),
(gen_random_uuid(), 'Prof. Ram Meghe College of Engineering & Management, Badnera', 'PRMCEM Badnera', 20.9198, 77.8295, 15, 'Badnera, Maharashtra', NOW()),
(gen_random_uuid(), 'Sipna College of Engineering & Technology', 'Sipna COET', 20.882, 77.7473, 15, 'Amravati, Maharashtra', NOW()),
(gen_random_uuid(), 'P.R. Pote Patil College of Engineering & Management', 'PR Pote CEM', 20.938, 77.786, 15, 'Amravati, Maharashtra', NOW()),
(gen_random_uuid(), 'P.R. Pote Patil Institute of Engineering & Research', 'PR Pote IER', 20.9395, 77.7838, 15, 'Amravati, Maharashtra', NOW()),
(gen_random_uuid(), 'H.V.P. Mandal''s College of Engineering & Technology', 'HVPM COET', 20.9312, 77.7581, 15, 'Amravati, Maharashtra', NOW()),
(gen_random_uuid(), 'Dr. Rajendra Gode Institute of Technology & Research (IBSS)', 'IBSS DRIG', 20.9052, 77.7498, 15, 'Amravati, Maharashtra', NOW()),
(gen_random_uuid(), 'Late Sau. Kamaltai Gawai Institute of Engineering & Technology', 'LSG Institute', 20.929, 77.7742, 15, 'Amravati, Maharashtra', NOW()),
(gen_random_uuid(), 'Dhamangaon Education Society''s College of Engineering & Technology', 'DES COET', 20.7219, 77.9168, 15, 'Dhamangaon, Maharashtra', NOW()),
(gen_random_uuid(), 'College of Engineering & Management, Amravati', 'CEM Amravati', 20.9342, 77.7801, 15, 'Amravati, Maharashtra', NOW()),
(gen_random_uuid(), 'Shri Shivaji Education Society''s College of Engineering & Technology, Akola', 'COETA Akola', 20.7191, 77.1012, 15, 'Akola, Maharashtra', NOW()),
(gen_random_uuid(), 'Manav School of Engineering & Technology, Akola', 'MKCT Akola', 20.6978, 77.0052, 15, 'Akola, Maharashtra', NOW()),
(gen_random_uuid(), 'Shri Sant Gajanan Maharaj College of Engineering, Shegaon', 'SSGMCE Shegaon', 20.7945, 76.7035, 15, 'Shegaon, Maharashtra', NOW()),
(gen_random_uuid(), 'Padmashri Dr. Vitthalrao Bikaji Kolte College of Engineering, Malkapur', 'PVKCE Malkapur', 20.8851, 76.2196, 15, 'Malkapur, Maharashtra', NOW()),
(gen_random_uuid(), 'Mauli College of Engineering & Technology, Shegaon', 'MCET Shegaon', 20.8012, 76.6784, 15, 'Shegaon, Maharashtra', NOW()),
(gen_random_uuid(), 'Anuradha College of Engineering & Technology, Chikhli', 'ACET Chikhli', 20.3401, 76.2677, 15, 'Chikhli, Maharashtra', NOW()),
(gen_random_uuid(), 'Rajarshi Shahu College of Engineering, Buldhana', 'RSCE Buldhana', 20.5283, 76.1832, 15, 'Buldhana, Maharashtra', NOW());
