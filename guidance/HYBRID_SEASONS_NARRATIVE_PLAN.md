# Hybrid Seasons Narrative Implementation Plan

## Overview
Implementation plan for the **Hybrid Seasons Narrative** feature in ZephyrOS - allowing users to live their life as a story composed of **Seasons (Chapters)** and **Episodes (Highlights)**.

## Tech Stack Analysis
- **Framework**: Next.js 15.4.5 with TypeScript
- **Database**: Supabase (PostgreSQL) with existing migration system
- **Styling**: TailwindCSS with custom components, Framer Motion for animations
- **Data Fetching**: SWR pattern, custom hooks architecture
- **Authentication**: Supabase Auth with user session management
- **Existing Patterns**: Component-based architecture, custom hooks in `/hooks/`, API routes in `/app/api/`

## Core Requirements

### 1. Seasons as Chapters
- Each season has: title, intention, theme (spring/summer/autumn/winter)
- Users can edit these and switch between seasons
- Optional "Opening Ritual" when starting, "Closing Ritual" summary when finishing

### 2. Episodes as Highlights
- Episodes live inside a season
- Each episode has: title, date range, mood emoji, reflection
- Added inline with quick form (keyboard/voice input)
- Auto-suggest episode titles and moods for smooth flow

### 3. Recap & Rituals
- Season Recap modal that summarizes episodes
- AI-generated text recap or highlight reel
- Ritual prompts (e.g., start-of-season intention, end-of-season lessons)

### 4. Persistence Layer
- Store in backend (Supabase/Postgres schema)
- CRUD APIs for seasons and episodes
- Ownership/security rules per user

## Implementation Strategy

### Phase 1: Database Schema & Migration
**File**: `supabase/migrations/20250914_add_seasons_narrative_tables.sql`

```sql
-- Seasons table
CREATE TABLE seasons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL DEFAULT auth.uid(),
  title TEXT NOT NULL,
  intention TEXT,
  theme TEXT CHECK (theme IN ('spring', 'summer', 'autumn', 'winter')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused')),
  start_date DATE,
  end_date DATE,
  opening_ritual JSONB,
  closing_ritual JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Episodes table
CREATE TABLE episodes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  user_id UUID NOT NULL DEFAULT auth.uid(),
  title TEXT NOT NULL,
  date_range_start DATE NOT NULL,
  date_range_end DATE NOT NULL,
  mood_emoji TEXT,
  reflection TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS policies for user ownership
-- [Include proper RLS policies]
```

### Phase 2: API Layer
**Directory**: `apps/zflow/app/api/narrative/`

#### API Endpoints:
- `seasons/route.ts` - CRUD operations for seasons
- `seasons/[id]/route.ts` - Individual season operations
- `episodes/route.ts` - CRUD operations for episodes
- `episodes/[id]/route.ts` - Individual episode operations
- `seasons/[id]/recap/route.ts` - Season recap generation

#### API Client:
**File**: `apps/zflow/lib/narrative-api.ts`
- Centralized API client following existing patterns
- Type-safe operations with TypeScript interfaces

### Phase 3: Core Components Architecture
**Directory**: `apps/zflow/app/components/narrative/`

#### Components:
1. **SeasonCover.tsx** - Editable season header with title/intention
2. **EpisodeCard.tsx** - Individual episode display with mood + reflection
3. **AddEpisodeForm.tsx** - Inline episode creation form
4. **SeasonRecap.tsx** - Modal for season summaries and rituals
5. **SeasonSwitcher.tsx** - Navigation/carousel between seasons
6. **NarrativePage.tsx** - Main page component orchestrating the feature

#### Component Features:
- Mobile-first responsive design
- Framer Motion animations for transitions
- Form validation and error handling
- Optimistic UI updates

### Phase 4: Data Management Hooks
**Files**: `apps/zflow/hooks/`

#### Custom Hooks:
1. **useSeasons.ts** - Season CRUD operations with SWR caching
2. **useEpisodes.ts** - Episode management with optimistic updates
3. **useNarrativeTheme.ts** - Season theming and visual cues logic
4. **useSeasonRecap.ts** - Recap generation and ritual management

#### Hook Features:
- SWR for caching and revalidation
- Error handling and loading states
- Optimistic updates for better UX
- Type safety with TypeScript

### Phase 5: Design System Extensions

#### TailwindCSS Extensions:
**File**: `apps/zflow/tailwind.config.js`

```javascript
theme: {
  extend: {
    colors: {
      seasons: {
        spring: {
          50: '#f0fdf4',
          500: '#22c55e',
          900: '#14532d'
        },
        summer: {
          50: '#fffbeb',
          500: '#f59e0b',
          900: '#92400e'
        },
        autumn: {
          50: '#fff7ed',
          500: '#ea580c',
          900: '#9a3412'
        },
        winter: {
          50: '#f8fafc',
          500: '#64748b',
          900: '#0f172a'
        }
      }
    },
    animation: {
      'season-fade': 'fadeIn 0.5s ease-in-out',
      'episode-slide': 'slideUp 0.3s ease-out'
    }
  }
}
```

### Phase 6: Advanced Features

#### Voice-to-Text Input:
- Web Speech API integration
- Fallback placeholder for non-supported browsers
- Voice input for episode reflections

#### PDF Export:
- Season summary export as "Season Narrative"
- Use existing recharts integration for data visualization
- Implement using jsPDF or similar library

#### AI Integration:
- Connect with existing AI agents system
- Auto-suggest episode titles based on content
- Generate season recap summaries
- Mood emoji suggestions based on reflection content

### Phase 7: Integration Points

#### Existing System Connections:
1. **Time Tracking Integration**: Suggest episodes based on time entries
2. **AI Agents**: Use for recap generation and content suggestions
3. **User Management**: Leverage existing auth and user systems
4. **Theming**: Integrate with existing design system

## File Structure

```
apps/zflow/
├── app/
│   ├── api/
│   │   └── narrative/
│   │       ├── seasons/
│   │       │   ├── route.ts
│   │       │   └── [id]/
│   │       │       ├── route.ts
│   │       │       └── recap/route.ts
│   │       └── episodes/
│   │           ├── route.ts
│   │           └── [id]/route.ts
│   ├── components/
│   │   └── narrative/
│   │       ├── SeasonCover.tsx
│   │       ├── EpisodeCard.tsx
│   │       ├── AddEpisodeForm.tsx
│   │       ├── SeasonRecap.tsx
│   │       ├── SeasonSwitcher.tsx
│   │       └── NarrativePage.tsx
│   └── narrative/
│       └── page.tsx
├── hooks/
│   ├── useSeasons.ts
│   ├── useEpisodes.ts
│   ├── useNarrativeTheme.ts
│   └── useSeasonRecap.ts
├── lib/
│   └── narrative-api.ts
└── types/
    └── narrative.ts
```

## Type Definitions

**File**: `apps/zflow/types/narrative.ts`

```typescript
export type SeasonTheme = 'spring' | 'summer' | 'autumn' | 'winter'
export type SeasonStatus = 'active' | 'completed' | 'paused'

export interface Season {
  id: string
  user_id: string
  title: string
  intention?: string
  theme: SeasonTheme
  status: SeasonStatus
  start_date?: string
  end_date?: string
  opening_ritual?: any
  closing_ritual?: any
  created_at: string
  updated_at: string
}

export interface Episode {
  id: string
  season_id: string
  user_id: string
  title: string
  date_range_start: string
  date_range_end: string
  mood_emoji?: string
  reflection?: string
  metadata?: any
  created_at: string
  updated_at: string
}

export interface SeasonWithEpisodes extends Season {
  episodes: Episode[]
}
```

## Development Phases

### Phase 1: Foundation (Database + API)
- [ ] Create database migration
- [ ] Implement API routes
- [ ] Set up type definitions
- [ ] Create API client

### Phase 2: Core Components
- [ ] Build SeasonCover component
- [ ] Build EpisodeCard component
- [ ] Build AddEpisodeForm component
- [ ] Implement basic theming

### Phase 3: Data Layer
- [ ] Create custom hooks
- [ ] Implement SWR caching
- [ ] Add optimistic updates
- [ ] Error handling

### Phase 4: Advanced Features
- [ ] Season switcher navigation
- [ ] Recap modal and rituals
- [ ] Voice-to-text placeholder
- [ ] PDF export functionality

### Phase 5: Polish & Integration
- [ ] Mobile responsive design
- [ ] Animation and transitions
- [ ] AI integration for suggestions
- [ ] Integration with existing systems

## Success Criteria

1. **Functional**: Users can create seasons, add episodes, and navigate between them
2. **User-Friendly**: Intuitive interface with smooth animations and mobile optimization
3. **Performant**: Fast loading, optimistic updates, proper caching
4. **Extensible**: Clean architecture allowing future feature additions
5. **Integrated**: Seamlessly fits into existing ZephyrOS ecosystem

## Notes

- Follow existing ZephyrOS patterns and conventions
- Maintain consistency with current design system
- Ensure proper error handling and loading states
- Implement comprehensive TypeScript typing
- Add proper testing coverage (unit + integration)
- Document API endpoints and component usage