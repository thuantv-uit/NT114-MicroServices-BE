/**
 * Seed Script — 10 Template Boards
 * Usage: node seedTemplates.js
 * Đặt file này trong board-service/
 */

// require('dotenv').config();
const mongoose = require('mongoose');

// const MONGO_URI = process.env.MONGO_URI;
MONGO_URI='mongodb+srv://thuantv:22521448@cluster0.nopqraq.mongodb.net/NT114'
if (!MONGO_URI) {
  console.error('❌ MONGO_URI not found in .env');
  process.exit(1);
}

// ─── Schema inline — dùng chung 1 mongoose connection, không import từ service khác ──

const Board = mongoose.model('Board', new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  backgroundColor: { type: String, default: '#ffffff' },
  backgroundImage: { type: String, default: '' },
  backgroundColorUpdatedAt: { type: Date, default: Date.now },
  backgroundImageUpdatedAt: { type: Date, default: Date.now },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  columnOrderIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Column', default: [] }],
  memberIds: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, required: true, enum: ['admin', 'member', 'viewer'] }
  }],
  type: { type: String, enum: ['private', 'public', 'template'], default: 'private' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}));

const Column = mongoose.model('Column', new mongoose.Schema({
  title: { type: String, required: true },
  backgroundColor: { type: String, default: '#ffffff' },
  boardId: { type: mongoose.Schema.Types.ObjectId, ref: 'Board', required: true },
  cardOrderIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Card', default: [] }],
  memberIds: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, required: true, enum: ['admin', 'member', 'viewer'] }
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}));

const Card = mongoose.model('Card', new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  columnId: { type: mongoose.Schema.Types.ObjectId, ref: 'Column', required: true },
  process: { type: Number, min: 0, max: 100, default: 0, required: true },
  image: { type: String, default: '' },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false, default: null },
  deadline: { type: Date, required: false, default: null },
  comments: [{ text: { type: String, required: true }, createdAt: { type: Date, default: Date.now } }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}));


// ─── Template Data ────────────────────────────────────────────────────────────

const TEMPLATES = [
  {
    title: 'Software Development',
    description: 'A standard Agile board for software teams. Track tasks from backlog to production with clear stages.',
    backgroundColor: '#0052cc',
    columns: [
      {
        title: 'Backlog',
        cards: [
          'Define project requirements',
          'Research suitable tech stack',
          'Write technical specification docs',
          'Set up CI/CD pipeline',
          'Design database schema',
        ],
      },
      {
        title: 'In Progress',
        cards: [
          'Implement user authentication',
          'Fix critical bug #42',
          'Code review for PR #15',
        ],
      },
      {
        title: 'Testing',
        cards: [
          'Unit tests for auth module',
          'Integration testing',
          'Performance & load testing',
        ],
      },
      {
        title: 'Done',
        cards: [
          'Project repository setup',
          'API documentation',
          'Environment configuration',
        ],
      },
    ],
  },

  {
    title: 'Marketing Campaign',
    description: 'Plan and execute marketing campaigns from ideation to launch, tracking every step of the process.',
    backgroundColor: '#ff5630',
    columns: [
      {
        title: 'Ideas',
        cards: [
          'Social media giveaway campaign',
          'Monthly email newsletter series',
          'Influencer partnership outreach',
          'Year-end blog content calendar',
        ],
      },
      {
        title: 'Planning',
        cards: [
          'Define target audience segments',
          'Set campaign budget and KPIs',
          'Draft ad creative concepts',
        ],
      },
      {
        title: 'Executing',
        cards: [
          'Launch paid Facebook ads',
          'Publish blog post series',
          'Schedule Instagram content',
        ],
      },
      {
        title: 'Review',
        cards: [
          'Analyze click-through rate metrics',
          'A/B test results summary',
          'Monthly performance report',
        ],
      },
    ],
  },

  {
    title: 'Product Roadmap',
    description: 'Visualize your product vision and prioritize features across time horizons — now, next, and later.',
    backgroundColor: '#6554c0',
    columns: [
      {
        title: 'Now',
        cards: [
          'User authentication flow',
          'Dashboard UI redesign',
          'Mobile app MVP release',
        ],
      },
      {
        title: 'Next',
        cards: [
          'Payment gateway integration',
          'Push notification system',
          'Analytics and reporting module',
        ],
      },
      {
        title: 'Later',
        cards: [
          'AI-powered recommendations',
          'Multi-language support',
          'Third-party marketplace feature',
        ],
      },
      {
        title: 'Icebox',
        cards: [
          'AR/VR integration',
          'Blockchain-based receipts',
          'Voice assistant support',
        ],
      },
    ],
  },

  {
    title: 'HR & Recruitment',
    description: 'Streamline your entire hiring process from job posting all the way through to onboarding new hires.',
    backgroundColor: '#00875a',
    columns: [
      {
        title: 'Open Positions',
        cards: [
          'Senior Backend Engineer',
          'UI/UX Designer',
          'Product Manager',
          'Data Analyst',
        ],
      },
      {
        title: 'Screening',
        cards: [
          'Review incoming resumes',
          'Conduct phone screening calls',
          'Send skills assessment tests',
        ],
      },
      {
        title: 'Interviewing',
        cards: [
          'Technical interview — Backend role',
          'Culture fit interview session',
          'Final round panel interview',
        ],
      },
      {
        title: 'Offer & Onboarding',
        cards: [
          'Send official offer letter',
          'Prepare workstation and accounts',
          'Complete onboarding checklist',
        ],
      },
    ],
  },

  {
    title: 'Content Creation',
    description: 'Manage your content pipeline for blogs, videos, podcasts, and social media from idea to publish.',
    backgroundColor: '#ff991f',
    columns: [
      {
        title: 'Ideas',
        cards: [
          'Top 10 productivity tools for 2025',
          'How to learn coding fast as a beginner',
          'Interview series with industry experts',
          'Annual technology trends roundup',
        ],
      },
      {
        title: 'In Production',
        cards: [
          'Draft: React vs Vue comparison article',
          'Record podcast episode 12',
          'Shoot product demo walkthrough video',
        ],
      },
      {
        title: 'Editing & Review',
        cards: [
          'Edit and mix podcast episode 11',
          'Proofread SEO-optimized article',
          'Design thumbnail for YouTube video',
        ],
      },
      {
        title: 'Published',
        cards: [
          'Getting started with Docker',
          'Remote work best practices guide',
          'Building a personal brand online',
        ],
      },
    ],
  },

  {
    title: 'Sales Pipeline',
    description: 'Track leads and deals through every stage of your sales funnel from first contact to closed won.',
    backgroundColor: '#0065ff',
    columns: [
      {
        title: 'New Leads',
        cards: [
          'Acme Corp — inbound inquiry',
          'TechVentures Ltd — referral',
          'StartupXYZ — cold outreach',
          'GlobalTrade Inc — conference lead',
        ],
      },
      {
        title: 'Qualified',
        cards: [
          'Schedule product demo with Acme Corp',
          'Send tailored proposal to TechVentures',
        ],
      },
      {
        title: 'Negotiation',
        cards: [
          'Pricing discussion with Acme Corp',
          'Contract review with GlobalTrade Inc',
        ],
      },
      {
        title: 'Closed',
        cards: [
          'Deal won — BlueSky Solutions',
          'Deal won — Innovate Co',
          'Deal lost — OldCorp (budget cut)',
        ],
      },
    ],
  },

  {
    title: 'Event Planning',
    description: 'Organize every detail of your event from initial concept through logistics to post-event wrap-up.',
    backgroundColor: '#403294',
    columns: [
      {
        title: 'Pre-Event',
        cards: [
          'Book and confirm venue',
          'Finalize event agenda',
          'Design and send invitations',
          'Confirm keynote speakers',
          'Arrange catering and beverages',
        ],
      },
      {
        title: 'Logistics',
        cards: [
          'AV equipment setup and testing',
          'Coordinate attendee transportation',
          'Print name badges and signage',
          'Prepare seating arrangement plan',
        ],
      },
      {
        title: 'Day of Event',
        cards: [
          'Manage registration desk',
          'Opening keynote coordination',
          'Lunch break and networking session',
          'Closing ceremony and gifts',
        ],
      },
      {
        title: 'Post-Event',
        cards: [
          'Send thank-you emails to attendees',
          'Collect and review feedback surveys',
          'Write post-event summary report',
          'Process and pay vendor invoices',
        ],
      },
    ],
  },

  {
    title: 'Personal Goals & Productivity',
    description: 'Track personal projects, habits, and life goals in one organized place to stay focused and motivated.',
    backgroundColor: '#00b8d9',
    columns: [
      {
        title: 'Goals',
        cards: [
          'Learn Spanish to B1 level',
          'Complete a half marathon race',
          'Read 24 books this year',
          'Launch personal side project',
        ],
      },
      {
        title: 'This Week',
        cards: [
          'Finish online course module 3',
          'Morning run — 5km session',
          'Read for 30 minutes each day',
        ],
      },
      {
        title: 'In Progress',
        cards: [
          'Daily Spanish practice streak',
          'Follow 16-week marathon training plan',
          'Build side project MVP',
        ],
      },
      {
        title: 'Achieved',
        cards: [
          'Completed Python for Beginners course',
          'Lost 5kg and maintained for 3 months',
          'Finished 10-day meditation challenge',
        ],
      },
    ],
  },

  {
    title: 'UX / Design Project',
    description: 'Manage the full UX design process from discovery and research all the way through to developer handoff.',
    backgroundColor: '#e91e8c',
    columns: [
      {
        title: 'Discovery',
        cards: [
          'Conduct stakeholder interviews',
          'Perform competitor analysis',
          'Define primary user personas',
          'Map end-to-end user journeys',
        ],
      },
      {
        title: 'Design',
        cards: [
          'Create low-fidelity wireframes',
          'Build high-fidelity mockups',
          'Set up component design system',
          'Build interactive prototype V1',
        ],
      },
      {
        title: 'Testing',
        cards: [
          'Run usability testing sessions',
          'Analyze heatmap and session data',
          'Complete accessibility audit',
        ],
      },
      {
        title: 'Handoff',
        cards: [
          'Export Figma design specs',
          'Document design tokens and guidelines',
          'Host developer handoff meeting',
        ],
      },
    ],
  },

  {
    title: 'Customer Support',
    description: 'Manage support tickets efficiently and ensure fast, high-quality resolution for every customer issue.',
    backgroundColor: '#36b37e',
    columns: [
      {
        title: 'New Tickets',
        cards: [
          'Cannot login — user #2341',
          'Payment failed — order #8821',
          'App crashes on iOS 17',
          'Wrong item received in shipment',
        ],
      },
      {
        title: 'In Progress',
        cards: [
          'Investigating payment gateway timeout',
          'Escalated crash bug to engineering team',
          'Awaiting more details from customer',
        ],
      },
      {
        title: 'Pending Customer',
        cards: [
          'Waiting for screenshot from user #2341',
          'Confirm refund preference — order #8821',
        ],
      },
      {
        title: 'Resolved',
        cards: [
          'Login issue fixed for user #1190',
          'Refund successfully processed — order #7712',
          'Shipping address correction completed',
        ],
      },
    ],
  },
];


const SYSTEM_USER_ID = new mongoose.Types.ObjectId('000000000000000000000001');



async function seedTemplates() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Xóa templates cũ nếu có
    const oldTemplates = await Board.find({ type: 'template' });
    if (oldTemplates.length > 0) {
      const oldBoardIds = oldTemplates.map(b => b._id);

      // Lấy columns cũ để xóa cards
      const oldColumns = await Column.find({ boardId: { $in: oldBoardIds } });
      const oldColumnIds = oldColumns.map(c => c._id);

      await Card.deleteMany({ columnId: { $in: oldColumnIds } });
      await Column.deleteMany({ boardId: { $in: oldBoardIds } });
      await Board.deleteMany({ _id: { $in: oldBoardIds } });

      console.log(`🗑️  Removed ${oldTemplates.length} old template(s) and their data\n`);
    }

    // Seed từng template
    for (const tpl of TEMPLATES) {
      // 1. Tạo board
      const board = new Board({
        title: tpl.title,
        description: tpl.description,
        backgroundColor: tpl.backgroundColor,
        backgroundImage: '',
        userId: SYSTEM_USER_ID,
        memberIds: [],
        columnOrderIds: [],
        type: 'template',
      });
      await board.save();

      const columnIds = [];

      // 2. Tạo columns + cards theo thứ tự
      for (const colData of tpl.columns) {
        const column = new Column({
          title: colData.title,
          boardId: board._id,
          backgroundColor: '#ffffff',
          cardOrderIds: [],
          memberIds: [],
        });
        await column.save();

        const cardIds = [];

        for (let i = 0; i < colData.cards.length; i++) {
          const card = new Card({
            title: colData.cards[i],
            // description không truyền — tránh empty string bị validation reject
            columnId: column._id,
            userId: null,       // template cards không cần user thật
            process: 0,
            deadline: null,
            image: '',
            comments: [],
          });
          await card.save();
          cardIds.push(card._id);
        }

        column.cardOrderIds = cardIds;
        await column.save();

        columnIds.push(column._id);
      }

      // 3. Cập nhật columnOrderIds cho board
      board.columnOrderIds = columnIds;
      await board.save();

      console.log(`✅ "${tpl.title}" — ${tpl.columns.length} columns, ${tpl.columns.reduce((sum, c) => sum + c.cards.length, 0)} cards`);
    }

    console.log(`\n🎉 Seeded ${TEMPLATES.length} templates successfully!`);
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

seedTemplates();