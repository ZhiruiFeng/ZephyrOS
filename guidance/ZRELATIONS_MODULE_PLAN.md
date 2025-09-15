# Z-Relations Module Development Plan

## Overview

The Z-Relations module is a relationship management system for ZephyrOS that helps users maintain and nurture their social connections based on research-backed principles.

## Research Foundation

### Core Insights
- **Weak ties create opportunities** (Granovetter): Acquaintances often deliver jobs/info more than close friends
- **Brokerage & structural holes** (Burt): Value arises from connecting unlinked clusters
- **Dunbar's social layers**: Humans maintain ~5, 15, 50, 150 meaningful ties with decreasing contact frequency
- **Active-Constructive Responding** (Gable): Responding to others' good news with enthusiasm and curiosity strengthens bonds
- **Dormant ties** (Levin et al.): Reviving old strong ties provides both novelty and trust
- **Mindful gatherings** (Parker): Small, purposeful events deepen cohesion
- **Give/Ask balance** (Adam Grant): Long-term success comes from generosity, with boundaries

### Product Principles & Strategies
1. **Cadence by layer**: Users tier contacts into Core 5 / Close 15 / Active 50 / Wider 150; default cadences apply outward
2. **Weak-tie nudges**: Surface 2–3 low-effort touchpoints per week with acquaintances
3. **Brokerage prompts**: Suggest intros between people from different clusters
4. **Dormant-tie revival**: Weekly shortlist of 3 dormant ties with suggested openers
5. **Active-constructive reply templates**: Quick, enthusiastic response scaffolds
6. **Micro-gathering kits**: Templates for running small, purposeful events
7. **Give-Ask balance**: Track generosity vs. requests to maintain reciprocity

## Technical Architecture

### Tech Stack
- **Backend (zmemory)**: Next.js API routes, Supabase, TypeScript, Zod validation
- **Frontend (zflow)**: Next.js, React, Tailwind CSS, Framer Motion, DnD Kit, Lucide icons
- **Database**: Supabase (PostgreSQL)
- **State Management**: SWR for data fetching
- **Shared**: Workspace packages for common utilities

### Data Model

#### Core Tables
- **people**: Basic contact information
- **relationship_profiles**: Tier assignment, cadence settings, health scores
- **relationship_touchpoints**: Interaction logging with sentiment tracking
- **relationship_introductions**: Brokerage event tracking
- **relationship_cadences**: Default intervals per tier
- **activity_events** & **activity_participants**: Micro-gathering management

#### Health Scoring Algorithm
```
health = 100
  - staleness_penalty (days_since_last - cadence)
  + reciprocity_balance_factor
  + channel_diversity_bonus
  + sentiment_average * multiplier
→ clamp(0, 100)
```

## API Design (zmemory)

### Core CRUD Operations
- `GET/POST /api/relations/people` - Contact management
- `GET/PUT /api/relations/profiles` - Relationship tier/cadence management

### Daily Operations
- `GET /api/relations/checkins/today` - Queue of due/overdue relationships
- `POST /api/relations/touchpoints` - Log interactions

### Smart Features
- `GET /api/relations/reconnect` - Dormant tie suggestions
- `GET /api/relations/brokerage` - Potential introduction suggestions
- `POST /api/relations/introductions` - Track brokerage events

### Events & Analytics
- `GET/POST /api/relations/gatherings` - Micro-gathering management
- `GET /api/relations/health-scores` - Relationship analytics
- `POST /api/relations/recompute-health` - Health score recalculation

## Frontend Architecture (zflow)

### Main Components
```
components/relations/
├── RelationsLayout.tsx           // Main layout with navigation
├── CheckInQueue.tsx             // Daily check-in dashboard (home)
├── RingsView.tsx                // Dunbar tier visualization with DnD
├── PersonCard.tsx               // Individual contact details
├── ReconnectLane.tsx            // Dormant tie suggestions
├── BrokerageTab.tsx             // Introduction suggestions
├── GatheringKit.tsx             // Event creation wizard
├── TouchpointComposer.tsx       // Quick interaction logging (20-sec)
└── HealthDashboard.tsx          // Relationship analytics
```

### Shared UI Components
```
├── PersonAvatar.tsx             // Contact avatar with status
├── TierBadge.tsx               // Dunbar tier indicator (5/15/50/150)
├── HealthScore.tsx             // Health score visualization
├── QuickActions.tsx            // One-tap templates
└── ActiveConstructiveButton.tsx // Enthusiasm response template
```

### Key User Interactions
- **Drag & Drop**: Move contacts between Dunbar rings
- **Quick Actions**: "Active-Constructive" and "Quick Hello" templates
- **20-Second Logging**: Fast touchpoint entry with channel, note, sentiment
- **One-Click Intros**: Draft introduction messages

## Utility Functions

### Core Logic
```
utils/relations/
├── healthScoring.ts            // Main scoring algorithm
├── cadenceCalculator.ts        // Tier-based contact frequency
├── dormantTieDetector.ts       // Identify revival opportunities
├── brokerageAnalyzer.ts        // Network cluster analysis
├── reciprocityTracker.ts       // Give/ask balance tracking
└── suggestionEngine.ts         // Daily recommendation queue
```

## User Journey

### Onboarding
1. Import contacts from various sources
2. Drag contacts into appropriate Dunbar rings (5/15/50/150)
3. Set custom cadences (defaults provided by tier)

### Daily Usage
1. Check daily Check-in Queue (5–10 suggestions)
2. Use quick actions for interactions
3. Log touchpoints after conversations (auto-updates health)

### Weekly Rituals
1. Review reciprocity balance and suggested intros
2. Plan optional micro-gathering
3. Check dormant tie suggestions

### Continuous Improvement
- Health scores auto-recompute nightly
- Suggestions adapt to user behavior
- Relationship insights and trends

## Development Phases

### Phase 1: Database Foundation (Sprint 0-1)
- [x] Create database schema
- [ ] Set up migration scripts
- [ ] Seed default cadence configurations
- [ ] Implement basic CRUD operations

### Phase 2: Core Relationship Management (Sprint 1-2)
- [ ] Touchpoint logging system
- [ ] Health score calculation engine
- [ ] Check-in queue API and logic
- [ ] Basic person/profile management

### Phase 3: Smart Suggestions (Sprint 2-3)
- [ ] Dormant tie detection algorithm
- [ ] Brokerage suggestion engine
- [ ] Daily recommendation queue
- [ ] Reciprocity tracking

### Phase 4: Frontend Implementation (Sprint 3-4)
- [ ] Check-in Queue dashboard
- [ ] Rings View with drag-and-drop
- [ ] Person cards and quick actions
- [ ] Touchpoint composer

### Phase 5: Advanced Features (Sprint 4-5)
- [ ] Micro-gathering planning flow
- [ ] Active-constructive response templates
- [ ] Analytics and insights dashboard
- [ ] Mobile-responsive design

### Future Enhancements
- [ ] Contact integration (Google, Apple, LinkedIn)
- [ ] Calendar integration for automatic meeting logging
- [ ] Email integration for communication tracking
- [ ] LLM assistance for message drafting and summarization
- [ ] Smart notification timing
- [ ] Relationship CRM features

## Success Metrics

### User Engagement
- Daily active users checking the queue
- Touchpoints logged per week
- Relationships maintained above health threshold

### Relationship Quality
- Average health scores across tiers
- Successful reconnections with dormant ties
- Introductions made and their outcomes

### Behavioral Changes
- Increased frequency of weak-tie interactions
- Better give/ask reciprocity balance
- More diverse communication channels used

## Technical Considerations

### Performance
- Efficient health score recalculation (nightly batch job)
- Optimized queries for suggestion algorithms
- Lazy loading for large contact lists

### Privacy & Security
- All relationship data encrypted at rest
- User controls for data sharing
- GDPR compliance for contact management

### Scalability
- Horizontal scaling for suggestion algorithms
- Efficient indexing for relationship queries
- Background job processing for heavy computations

---

*This plan serves as the blueprint for implementing the Z-Relations module within the ZephyrOS ecosystem. Each phase builds upon the previous one, ensuring a solid foundation while delivering incremental value to users.*