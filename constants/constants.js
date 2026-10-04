export const projects = [
  {
    title: 'Conversify',
    excerpt: "AI-powered WhatsApp marketing platform for restaurants. Customers earn loyalty points, redeem offers, and interact via intelligent AI conversations. Features campaign scheduling, a digital web wallet, QR code onboarding, and multi-restaurant support. Built end-to-end as co-founder, from architecture to deployment.",
    badges: [
      { label: 'Complete', color: '#10B981' },
      { label: 'Meta Tech Provider', color: '#0081FB' },
      { label: 'Google for Startups', color: '#34A853' },
    ],
    tags: ['Next.js', 'Express.js', 'TypeScript', 'Go', 'Supabase', 'WhatsApp API', 'AI'],
    featuredImage: {
      url: "/conversify.png"
    },
    author: {
      name: 'Daniel Raad',
      photo: {
          url: '/astro.png'
      },
    },
    createdAt: "November, 2025",
    source: 'https://github.com/daniel-raad/conversify',
    visit: 'https://conversify.uk/',
    id: 5,
    featured: true,
    experiments: [
      {
        title: 'Conversational Flow DSL',
        description: 'A graph-based journey DSL for defining WhatsApp conversation flows. Three layers: a fluent TypeScript builder that compiles to nodes and edges, a plugin system for messages, AI classification, scheduling, and business logic, and a runtime engine that executes the graph.',
        tags: ['TypeScript', 'DSL', 'graph engine', 'WhatsApp'],
        image: '/DSL.png',
        status: 'complete',
      },
    ],
  },
  {
    title: 'OVA gym',
    excerpt: "Cross-platform mobile fitness app with a Python backend. Built with React Native for iOS and Android, backed by a Python API and PostgreSQL database.",
    tags: ['React-Native', 'Python', 'Azure', 'PostgreSQL'],
    featuredImage: {
      url: "/gym.png"
    },
    author: {
      name: 'Daniel Raad, Stuart Said',
      photo: {
          url: '/astro.png'
      },
    },
    createdAt: "March, 2024",
  },
  {
    title: 'This website',
    excerpt: "Personal portfolio and blog built with Next.js, Firebase, and Tailwind CSS. Features a markdown blog system, habit tracking dashboard, and AI chat integration.",
    tags: ['Next.js', 'React', 'Firebase', 'Tailwind CSS', 'Vercel'],
    featuredImage: {
      url: "/website.png"
    },
    author: {
      name: 'Daniel Raad',
      photo: {
          url: '/astro.png'
      },
    },
    createdAt: "Jan, 2022",
    source:'https://github.com/daniel-raad/web3d',
    visit: 'https://www.danielraad.co.uk',
    id: 1,
  },
];
  

  export const blogs = [ 
    { 
      "author": {
      "bio": "Hey I'm Daniel, as you've probably heard and seen enough of throughout this website! ",
      "name": "Dan ",
    },
    "createdAt": "2022-02-01T17:57:13.015324+00:00",
    "slug": "danielraad",
    "title": "My web dev journey",
    "excerpt": "This is going to take you through my web dev journey in creating this website! I hope you learn a bunch from my experience!",
    "categories": [
      {
        "name": "Web Development ",
        "slug": "webdev"
      }
    ],
    "featuredImage": {
      "url": 'bg.jpg',
    } 
  }


  ]


  
  export const TimeLineData = [
    { year: 2018, text: 'Worked in the world of finance and was a co-founder of a student run hedge fund', },
    { year: 2019, text: 'Did some work with Python to perform auto trading', },
    { year: 2021, text: 'Completed University achieving a first', },
    { year: 2021, text: 'Started working as a Software Engineer at Lloyds Bank', },
  ];
