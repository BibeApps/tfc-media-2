import { EventType, Project } from './types';

export const PORTFOLIO_ITEMS: Project[] = [
  {
    id: '1',
    title: 'Neon Horizon',
    category: 'Photography',
    image: 'https://picsum.photos/800/600?random=1',
    description: 'A cyberpunk inspired photoshoot in downtown Tokyo.',
    tags: ['Urban', 'Night', 'Neon']
  },
  {
    id: '2',
    title: 'Serenity Now',
    category: 'Videography',
    image: 'https://picsum.photos/800/600?random=2',
    description: 'Commercial spot for a luxury spa resort.',
    tags: ['Commercial', 'Nature', 'Calm']
  },
  {
    id: '3',
    title: 'Apex Dynamics',
    category: 'Branding',
    image: 'https://picsum.photos/800/600?random=3',
    description: 'Complete brand identity overhaul for a sports tech startup.',
    tags: ['Design', 'Sports', 'Identity']
  },
  {
    id: '4',
    title: 'Golden Hour',
    category: 'Photography',
    image: 'https://picsum.photos/800/600?random=4',
    description: 'Wedding portrait session during sunset.',
    tags: ['Wedding', 'Portrait', 'Warm']
  },
  {
    id: '5',
    title: 'Tech Summit 2024',
    category: 'Event',
    image: 'https://picsum.photos/800/600?random=5',
    description: 'Full event coverage for a major tech conference.',
    tags: ['Corporate', 'Event', 'Candid']
  },
  {
    id: '6',
    title: 'Urban Exploration',
    category: 'Photography',
    image: 'https://picsum.photos/800/600?random=6',
    description: 'Architectural photography series.',
    tags: ['Architecture', 'bw', 'lines']
  }
];

// Helper to generate mock items
const generateItems = (count: number, basePrice: number) => {
  return Array.from({ length: count }).map((_, i) => ({
    id: `item-${Math.random().toString(36).substr(2, 9)}`,
    title: `Capture ${i + 1}`,
    type: Math.random() > 0.8 ? 'video' : 'photo' as 'photo' | 'video',
    url: `https://picsum.photos/600/800?random=${Math.floor(Math.random() * 1000)}`,
    price: basePrice,
    width: 600,
    height: 800
  }));
};

export const GALLERY_DATA: EventType[] = [
  {
    id: 'et-1',
    name: 'Weddings',
    slug: 'weddings',
    description: 'Capturing your special moments forever.',
    thumbnail: 'https://picsum.photos/800/600?random=10',
    events: [
      {
        id: 'ev-1',
        name: 'Smith & Johnson Wedding',
        slug: 'smith-johnson',
        date: '2024-06-15',
        thumbnail: 'https://picsum.photos/800/600?random=11',
        sessions: [
          { id: 's-1', name: 'Ceremony', date: '2024-06-15', thumbnail: 'https://picsum.photos/800/600?random=12', items: generateItems(12, 15) },
          { id: 's-2', name: 'Reception', date: '2024-06-15', thumbnail: 'https://picsum.photos/800/600?random=13', items: generateItems(20, 15) },
        ]
      },
      {
        id: 'ev-2',
        name: 'Doe Wedding',
        slug: 'doe-wedding',
        date: '2024-07-20',
        thumbnail: 'https://picsum.photos/800/600?random=14',
        sessions: [
          { id: 's-3', name: 'Full Day', date: '2024-07-20', thumbnail: 'https://picsum.photos/800/600?random=15', items: generateItems(45, 15) }
        ]
      }
    ]
  },
  {
    id: 'et-2',
    name: 'Corporate',
    slug: 'corporate',
    description: 'Professional coverage for your business events.',
    thumbnail: 'https://picsum.photos/800/600?random=20',
    events: [
      {
        id: 'ev-3',
        name: 'Tech Gala 2024',
        slug: 'tech-gala',
        date: '2024-09-10',
        thumbnail: 'https://picsum.photos/800/600?random=21',
        sessions: [
          { id: 's-4', name: 'Keynote', date: '2024-09-10', thumbnail: 'https://picsum.photos/800/600?random=22', items: generateItems(8, 25) },
          { id: 's-5', name: 'Networking', date: '2024-09-10', thumbnail: 'https://picsum.photos/800/600?random=23', items: generateItems(15, 25) }
        ]
      }
    ]
  },
  {
    id: 'et-3',
    name: 'Sports',
    slug: 'sports',
    description: 'High energy action shots.',
    thumbnail: 'https://picsum.photos/800/600?random=30',
    events: []
  }
];