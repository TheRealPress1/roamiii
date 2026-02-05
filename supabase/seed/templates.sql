-- Seed trip templates
INSERT INTO public.trip_templates (
  name, description, destination, cover_image_url, duration_days,
  vibe_tags, budget_estimate_per_person, suggested_activities, suggested_housing,
  best_time_to_visit, local_tips, is_featured, category
) VALUES

-- Tokyo, Japan
(
  'Tokyo Adventure',
  'Explore the vibrant blend of ultra-modern technology and ancient traditions in Japan''s capital. From serene temples to buzzing nightlife, Tokyo has something for everyone.',
  'Tokyo, Japan',
  'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800&q=80',
  5,
  ARRAY['culture', 'city', 'food'],
  2500,
  '[
    {"name": "Tsukiji Outer Market Food Tour", "description": "Sample fresh sushi, tamagoyaki, and street food at the famous market", "category": "food", "estimatedCost": 60, "duration": "3 hours", "vibes": ["food", "culture"]},
    {"name": "Shibuya & Harajuku Walking Tour", "description": "Experience Tokyo''s youth culture, fashion, and the famous crossing", "category": "experience", "estimatedCost": 30, "duration": "4 hours", "vibes": ["city", "culture"]},
    {"name": "Golden Gai Bar Hopping", "description": "Explore the tiny bars of this legendary nightlife district", "category": "nightlife", "estimatedCost": 80, "duration": "4 hours", "vibes": ["party", "culture"]},
    {"name": "Teamlab Borderless Digital Art Museum", "description": "Immersive digital art experience unlike anything else", "category": "experience", "estimatedCost": 35, "duration": "3 hours", "vibes": ["culture"]}
  ]'::jsonb,
  '[
    {"name": "MUJI Hotel Ginza", "url": "https://hotel.muji.com/ginza/", "price_per_night": 200},
    {"name": "Park Hyatt Tokyo", "url": "https://www.hyatt.com/park-hyatt/tokyo", "price_per_night": 450}
  ]'::jsonb,
  'March-May (cherry blossoms) or October-November (fall colors)',
  'Get a Suica card for easy transit. Convenience stores have amazing food. Bow when entering temples.',
  true,
  'culture'
),

-- Bali, Indonesia
(
  'Bali Paradise',
  'Find your zen in the Island of the Gods. Pristine beaches, lush rice terraces, ancient temples, and world-class wellness retreats await.',
  'Bali, Indonesia',
  'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800&q=80',
  7,
  ARRAY['beach', 'nature', 'chill'],
  1800,
  '[
    {"name": "Tegallalang Rice Terraces", "description": "Walk through stunning carved rice paddies and enjoy a jungle swing", "category": "experience", "estimatedCost": 25, "duration": "3 hours", "vibes": ["nature", "culture"]},
    {"name": "Sunrise at Mount Batur", "description": "Trek to the summit for an unforgettable volcanic sunrise", "category": "activity", "estimatedCost": 65, "duration": "6 hours", "vibes": ["adventure", "nature"]},
    {"name": "Seminyak Beach Club Day", "description": "Lounge at Potato Head or Mrs Sippy with cocktails and pool", "category": "experience", "estimatedCost": 100, "duration": "5 hours", "vibes": ["beach", "chill", "party"]},
    {"name": "Balinese Cooking Class", "description": "Learn to make authentic dishes with a local family", "category": "food", "estimatedCost": 40, "duration": "4 hours", "vibes": ["food", "culture"]}
  ]'::jsonb,
  '[
    {"name": "The Kayon Jungle Resort", "url": "https://thekayonresort.com/", "price_per_night": 180},
    {"name": "COMO Uma Canggu", "url": "https://www.comohotels.com/umacanggu", "price_per_night": 280}
  ]'::jsonb,
  'April-October (dry season)',
  'Learn a few Bahasa phrases. Negotiate prices at markets. Rent a scooter for freedom (but be careful!). Book massages everywhere.',
  true,
  'beach'
),

-- Paris, France
(
  'Romantic Paris',
  'Fall in love with the City of Light. World-class art, charming cafés, iconic landmarks, and unforgettable cuisine make Paris the ultimate romantic getaway.',
  'Paris, France',
  'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&q=80',
  4,
  ARRAY['romantic', 'culture', 'food'],
  3000,
  '[
    {"name": "Private Louvre Tour", "description": "Skip the lines and see the Mona Lisa without the crowds", "category": "experience", "estimatedCost": 120, "duration": "3 hours", "vibes": ["culture"]},
    {"name": "Seine River Sunset Cruise", "description": "Champagne cruise past illuminated monuments", "category": "experience", "estimatedCost": 85, "duration": "2 hours", "vibes": ["romantic"]},
    {"name": "Le Marais Food Walk", "description": "Taste cheese, wine, chocolate, and pastries in Paris''s hippest neighborhood", "category": "food", "estimatedCost": 90, "duration": "4 hours", "vibes": ["food", "culture"]},
    {"name": "Montmartre & Sacré-Cœur", "description": "Explore the artistic neighborhood and catch sunset at the basilica", "category": "experience", "estimatedCost": 20, "duration": "3 hours", "vibes": ["romantic", "culture"]}
  ]'::jsonb,
  '[
    {"name": "Hotel Le Marais", "url": "https://www.hotelmarais.com/", "price_per_night": 220},
    {"name": "Le Bristol Paris", "url": "https://www.oetkercollection.com/hotels/le-bristol-paris/", "price_per_night": 900}
  ]'::jsonb,
  'April-June or September-October (mild weather, fewer crowds)',
  'Learn basic French greetings. Book restaurants ahead. The metro is the best way around. Always say Bonjour when entering shops.',
  true,
  'romantic'
),

-- Iceland Ring Road
(
  'Iceland Ring Road',
  'Drive the legendary Route 1 around Iceland. Witness waterfalls, glaciers, volcanoes, and the Northern Lights on this epic adventure.',
  'Iceland',
  'https://images.unsplash.com/photo-1504893524553-b855bce32c67?w=800&q=80',
  8,
  ARRAY['adventure', 'nature'],
  4500,
  '[
    {"name": "Golden Circle Day", "description": "Visit Þingvellir, Geysir, and Gullfoss waterfall", "category": "activity", "estimatedCost": 120, "duration": "8 hours", "vibes": ["nature", "adventure"]},
    {"name": "Glacier Hiking", "description": "Trek on Vatnajökull with certified guides", "category": "activity", "estimatedCost": 150, "duration": "4 hours", "vibes": ["adventure"]},
    {"name": "Blue Lagoon Spa", "description": "Relax in the famous geothermal waters", "category": "experience", "estimatedCost": 100, "duration": "3 hours", "vibes": ["chill", "nature"]},
    {"name": "Northern Lights Hunt", "description": "Chase the aurora borealis with expert guides", "category": "experience", "estimatedCost": 90, "duration": "5 hours", "vibes": ["adventure", "nature"]}
  ]'::jsonb,
  '[
    {"name": "Ion Adventure Hotel", "url": "https://ioniceland.is/", "price_per_night": 350},
    {"name": "Fosshotel Glacier Lagoon", "url": "https://www.islandshotel.is/hotels/fosshotel-glacier-lagoon", "price_per_night": 280}
  ]'::jsonb,
  'September-March for Northern Lights, June-August for midnight sun',
  'Book accommodations months ahead in summer. Rent a 4WD vehicle. Weather changes rapidly—pack layers. Download offline maps.',
  true,
  'adventure'
),

-- Barcelona, Spain
(
  'Barcelona Vibes',
  'Soak up the sun in Spain''s most vibrant city. Gothic architecture, Gaudí masterpieces, tapas bars, and beach days make Barcelona unforgettable.',
  'Barcelona, Spain',
  'https://images.unsplash.com/photo-1583422409516-2895a77efded?w=800&q=80',
  5,
  ARRAY['beach', 'city', 'party', 'culture'],
  2200,
  '[
    {"name": "Sagrada Familia Tour", "description": "Marvel at Gaudí''s unfinished masterpiece with a guide", "category": "experience", "estimatedCost": 50, "duration": "2 hours", "vibes": ["culture"]},
    {"name": "La Boqueria & El Born Tapas Tour", "description": "Eat your way through Barcelona''s best food spots", "category": "food", "estimatedCost": 75, "duration": "4 hours", "vibes": ["food", "culture"]},
    {"name": "Barceloneta Beach Day", "description": "Sun, sand, and chiringuito vibes by the Mediterranean", "category": "activity", "estimatedCost": 40, "duration": "5 hours", "vibes": ["beach", "chill"]},
    {"name": "Gothic Quarter Night Walk", "description": "Discover hidden plazas and late-night bars", "category": "nightlife", "estimatedCost": 50, "duration": "4 hours", "vibes": ["party", "culture"]}
  ]'::jsonb,
  '[
    {"name": "Hotel Arts Barcelona", "url": "https://www.ritzcarlton.com/barcelona", "price_per_night": 400},
    {"name": "Casa Camper Barcelona", "url": "https://www.casacamper.com/barcelona/", "price_per_night": 200}
  ]'::jsonb,
  'May-June or September-October (warm but not too crowded)',
  'Siesta is real—shops close 2-5pm. Dinner starts at 9pm. Watch for pickpockets on La Rambla. Beach clubs stay open late.',
  true,
  'beach'
),

-- Costa Rica
(
  'Costa Rica Adventure',
  'Pura Vida! From rainforest canopies to volcanic hot springs, Costa Rica is the ultimate eco-adventure destination.',
  'Costa Rica',
  'https://images.unsplash.com/photo-1518259102261-b40117eabbc9?w=800&q=80',
  7,
  ARRAY['adventure', 'nature'],
  2800,
  '[
    {"name": "Arenal Volcano & Hot Springs", "description": "Hike the volcano trails and soak in natural thermal pools", "category": "experience", "estimatedCost": 80, "duration": "6 hours", "vibes": ["nature", "chill"]},
    {"name": "Monteverde Cloud Forest Zipline", "description": "Fly through the jungle canopy on world-class ziplines", "category": "activity", "estimatedCost": 90, "duration": "4 hours", "vibes": ["adventure"]},
    {"name": "Manuel Antonio Wildlife Tour", "description": "Spot monkeys, sloths, and toucans in this stunning park", "category": "activity", "estimatedCost": 55, "duration": "4 hours", "vibes": ["nature"]},
    {"name": "White Water Rafting Pacuare", "description": "Class III-IV rapids through pristine rainforest", "category": "activity", "estimatedCost": 110, "duration": "5 hours", "vibes": ["adventure"]}
  ]'::jsonb,
  '[
    {"name": "Nayara Springs", "url": "https://www.nayarahotels.com/nayara-springs/", "price_per_night": 600},
    {"name": "Hotel Si Como No", "url": "https://www.sicomono.com/", "price_per_night": 200}
  ]'::jsonb,
  'December-April (dry season)',
  'Rent a 4x4 for unpaved roads. Bring bug spray and rain gear year-round. Book activities in advance during peak season.',
  true,
  'adventure'
),

-- New York City
(
  'NYC Explorer',
  'The city that never sleeps. World-class museums, Broadway shows, iconic skylines, and neighborhoods with endless character.',
  'New York City, USA',
  'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=800&q=80',
  5,
  ARRAY['city', 'culture', 'food'],
  3500,
  '[
    {"name": "High Line & Chelsea Markets", "description": "Walk the elevated park and eat through the food hall", "category": "food", "estimatedCost": 45, "duration": "3 hours", "vibes": ["city", "food"]},
    {"name": "Broadway Show", "description": "Catch a Tony-winning performance on the Great White Way", "category": "experience", "estimatedCost": 150, "duration": "3 hours", "vibes": ["culture"]},
    {"name": "Speakeasy Bar Crawl", "description": "Discover hidden cocktail bars in the East Village and LES", "category": "nightlife", "estimatedCost": 100, "duration": "4 hours", "vibes": ["party", "city"]},
    {"name": "Brooklyn Bridge & DUMBO", "description": "Walk the iconic bridge and explore artsy Brooklyn", "category": "experience", "estimatedCost": 30, "duration": "4 hours", "vibes": ["city"]}
  ]'::jsonb,
  '[
    {"name": "The Standard High Line", "url": "https://www.standardhotels.com/new-york/properties/high-line", "price_per_night": 400},
    {"name": "The Bowery Hotel", "url": "https://www.theboweryhotel.com/", "price_per_night": 450}
  ]'::jsonb,
  'April-June or September-November (best weather)',
  'Get an unlimited MetroCard. Book restaurants on Resy. Walking is the best way to explore each neighborhood. Tip 20% at restaurants.',
  true,
  'city'
),

-- Lisbon, Portugal
(
  'Lisbon Escape',
  'Sun-drenched hills, historic trams, and the best custard tarts you''ll ever taste. Lisbon is Europe''s coolest, most underrated capital.',
  'Lisbon, Portugal',
  'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80',
  4,
  ARRAY['city', 'food', 'culture'],
  1600,
  '[
    {"name": "Alfama Food & Fado Tour", "description": "Eat local dishes and hear traditional Portuguese music", "category": "food", "estimatedCost": 70, "duration": "4 hours", "vibes": ["food", "culture"]},
    {"name": "Sintra Day Trip", "description": "Explore fairytale palaces in the UNESCO hills", "category": "experience", "estimatedCost": 80, "duration": "8 hours", "vibes": ["culture", "nature"]},
    {"name": "LX Factory & Time Out Market", "description": "Creative hub and the city''s best food hall", "category": "food", "estimatedCost": 45, "duration": "4 hours", "vibes": ["city", "food"]},
    {"name": "Bairro Alto Bar Hopping", "description": "Join the locals for outdoor drinks in the party neighborhood", "category": "nightlife", "estimatedCost": 40, "duration": "4 hours", "vibes": ["party"]}
  ]'::jsonb,
  '[
    {"name": "Memmo Alfama", "url": "https://www.memmohotels.com/alfama/", "price_per_night": 220},
    {"name": "The Lumiares", "url": "https://www.thelumiares.com/", "price_per_night": 300}
  ]'::jsonb,
  'March-May or September-October (warm, fewer tourists)',
  'Wear comfortable shoes—the hills are real. Try pastéis de nata everywhere. Learn to love ginjinha (cherry liqueur). The 28 tram is a tourist trap but still fun.',
  true,
  'city'
);
