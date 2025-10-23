# Frontend - AI-Powered HRMS

Next.js application for the AI-Powered HRMS recruitment intelligence platform.

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** TailwindCSS
- **UI Components:** Shadcn UI
- **State Management:** React Hooks
- **API Client:** Axios
- **Authentication:** Supabase Auth
- **Database:** Supabase (PostgreSQL)

## Getting Started

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build

```bash
npm run build
npm start
```

## Project Structure

```
frontend/
├── app/                    # App router pages
│   ├── (auth)/            # Authentication pages
│   ├── (dashboard)/       # Dashboard pages (recruiter, admin)
│   ├── candidates/        # Candidate pages
│   ├── jobs/              # Job pages
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Home page
│   └── globals.css        # Global styles
├── components/            # React components
│   └── ui/               # Shadcn UI components
├── lib/                   # Utilities and helpers
│   ├── supabaseClient.ts # Supabase client
│   ├── api.ts            # API client
│   ├── auth.ts           # Auth helpers
│   └── utils.ts          # Utility functions
└── public/               # Static assets
```

## Features

### Authentication
- Email/password login
- Role-based access (Admin, Recruiter, Candidate)
- Protected routes

### Candidate Features
- Resume upload
- Job browsing
- Application tracking
- AI screening participation

### Recruiter Features
- Candidate list with AI scores
- Digital footprint view
- AI screening management
- Job posting

### Admin Features
- System statistics
- User management
- Analytics dashboard

## Environment Variables

Create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript compiler

## Adding Shadcn UI Components

```bash
npx shadcn-ui@latest add button
npx shadcn-ui@latest add card
npx shadcn-ui@latest add dialog
```

See available components: https://ui.shadcn.com/

## API Integration

The frontend communicates with the FastAPI backend:

```typescript
import { api } from '@/lib/api';

// Parse resume
const result = await api.parseResume(file);

// Match candidate
const match = await api.matchCandidate({ candidate_id, job_id });

// Start screening
const screening = await api.startScreening({ application_id, mode: 'text' });
```

## Supabase Integration

```typescript
import { supabase } from '@/lib/supabaseClient';

// Query data
const { data, error } = await supabase
  .from('candidates')
  .select('*');

// Auth
import { auth } from '@/lib/auth';
await auth.signIn(email, password);
```

## Deployment

### Vercel (Recommended)

```bash
npm install -g vercel
vercel --prod
```

Or connect your GitHub repository to Vercel for automatic deployments.

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS](https://tailwindcss.com)
- [Shadcn UI](https://ui.shadcn.com)
- [Supabase](https://supabase.com/docs)

