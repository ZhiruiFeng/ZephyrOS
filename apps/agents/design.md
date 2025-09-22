# ZephyrOS Agents Crew - Design Document

> A comprehensive multi-agent system designed to enhance ZephyrOS with intelligent automation, task orchestration, and user assistance capabilities.

## 🎯 Vision & Objectives

### Mission Statement
Create a robust, scalable agent crew that integrates seamlessly with ZephyrOS ecosystem to provide intelligent automation, enhanced user productivity, and sophisticated task management through collaborative AI agents.

### Core Objectives
- **Intelligent Task Orchestration**: Automate complex workflows across ZFlow and ZMemory
- **Enhanced User Experience**: Provide proactive assistance and smart recommendations
- **Seamless Integration**: Work harmoniously with existing ZephyrOS components
- **Scalable Architecture**: Support easy addition of new specialized agents
- **Privacy & Security**: Maintain user data security and privacy by design

## 🏗️ ZephyrOS-Integrated Agent Architecture

### System Overview: ZFlow as Agent Gateway

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         ZFlow Frontend (Next.js)                       │
│                     User Interface + Agent Chat                        │
├─────────────────────────────────────────────────────────────────────────┤
│ Task Management │ Agent Chat UI │ SSE Streaming │ Real-time Updates     │
│ • TaskCard      │ • ChatWindow  │ • TokenStream │ • WebSocket Support   │
│ • Workflows     │ • AgentSelect │ • EventSource │ • Notification        │
└─────────────────┬───────────────────────────────┬─────────────────────┘
                  │                               │
          ┌───────▼─────────┐            ┌───────▼─────────┐
          │  ZFlow Backend  │            │   Streaming     │
          │  Agent Gateway  │            │   SSE Server    │
          │                 │            │                 │
          │• Agent Registry │            │• Event Broker   │
          │• Message Router │            │• Token Stream   │
          │• Session Mgmt   │            │• Connection Mgmt│
          │• Auth/Security  │            │• Heartbeat      │
          └─────────────────┘            └─────────────────┘
                  │                               │
                  ▼                               │
    ┌─────────────────────────────────────────────┼─────────┐
    │            Agent Communication Layer         │         │
    │                                             │         │
┌───▼─────────┐ ┌──────────────┐ ┌─────────────┐ │ ┌───────▼──────┐
│AWS AgentCore│ │    OpenAI    │ │   Custom    │ │ │    Redis     │
│             │ │    API       │ │   Agents    │ │ │   PubSub     │
│• Bedrock    │ │              │ │             │ │ │              │
│• Claude     │ │• GPT-4       │ │• ECS/Lambda │ │ │• Event Queue │
│• Workflows  │ │• Assistants  │ │• FastAPI    │ │ │• Session     │
└─────────────┘ └──────────────┘ └─────────────┘ │ │• Broadcast   │
                  │                               │ └──────────────┘
                  ▼                               │
          ┌───────────────────┐                  │
          │  ZMemory-MCP      │                  │
          │  Server           │                  │
          │                   │                  │
          │• Memory Tools     │◄─────────────────┘
          │• Timeline Access  │
          │• Search & Query   │
          │• Task Integration │
          └───────────────────┘
                  │
                  ▼
          ┌───────────────────┐
          │   ZMemory API     │
          │   (Supabase)      │
          │                   │
          │• User Memories    │
          │• Conversation     │
          │• Context Store    │
          │• Knowledge Base   │
          └───────────────────┘
```

### ZFlow Agent Integration Strategy

#### 🎯 ZFlow as Universal Agent Interface
**Why ZFlow?**
- ✅ **Existing User Base**: Users already familiar with ZFlow's task management interface
- ✅ **Component Library**: Rich UI components (TaskCard, ActivityCard, Modals) ready for agent interactions
- ✅ **Authentication**: Integrated with Supabase auth and user management
- ✅ **Real-time Features**: Already has WebSocket support and live updates
- ✅ **Mobile Ready**: Responsive design with mobile-first approach

#### 📡 Streaming Agent Communication

**The "Streaming Spine" Architecture:**
```
ZFlow Frontend (Next.js)
  ├─ POST /api/agents/sessions     # Create chat session
  ├─ POST /api/agents/messages     # Send user message
  ├─ GET  /api/agents/stream       # SSE token streaming
  └─ POST /api/agents/cancel       # Cancel current run

ZFlow Backend (Next.js API Routes)
  ├─ Agent Registry & Router
  ├─ Session Management
  ├─ SSE Event Streaming
  └─ Redis PubSub Integration

Cloud Agents (AWS/External)
  ├─ AWS AgentCore (Bedrock)
  ├─ OpenAI API (GPT-4, Assistants)
  ├─ Custom Agents (ECS/Lambda)
  └─ MCP Client → ZMemory-MCP
```

#### 🔄 Agent Categories & Deployment

**🌩️ Cloud-Hosted Agents**
- **AWS AgentCore**: Bedrock-powered agents with native streaming
- **OpenAI API Agents**: GPT-4, Claude via API with streaming support
- **Custom Cloud Agents**: ECS/Fargate or Lambda-based Python agents
- **Third-Party APIs**: Anthropic, Cohere, HuggingFace endpoints

**🧠 Memory-Enhanced Agents**
- **Personal Assistant**: Integrates with ZMemory for context-aware responses
- **Task Orchestrator**: Uses ZFlow task data + ZMemory for intelligent planning
- **Research Agent**: Leverages ZMemory knowledge base for informed research
- **Analytics Agent**: Analyzes patterns across ZFlow tasks and ZMemory data

**🔌 Integration Agents**
- **Workflow Automation**: Connects ZFlow tasks with external services
- **Notification Manager**: Smart notifications based on agent interactions
- **Data Sync Agents**: Keeps ZFlow and ZMemory in sync with external tools

### 🚀 Phase 1: Basic Streaming Chat Interface ✅ COMPLETED

#### Current Implementation Status
**✅ What's Been Built:**
- **Complete Chat Interface**: Full-featured streaming chat UI with modern design
- **Multi-LLM Support**: OpenAI GPT-4 and Anthropic Claude API integration
- **SSE Streaming**: Real-time Server-Sent Events for smooth conversation flow
- **Session Management**: Redis-backed persistent chat sessions
- **Conversation History**: Sidebar with search and conversation management
- **Agent Registry**: Dynamic agent selection and status monitoring
- **Voice Interface**: Basic voice transcription capabilities
- **Mobile Responsive**: Full mobile support with responsive design
- **Authentication**: Seamlessly integrated with existing Supabase auth

**❌ Missing Key Integrations:**
- **ZMemory MCP Integration**: No tool calling or memory access yet
- **ZFlow Task Integration**: Cannot create/manage tasks from chat
- **Context Injection**: No access to user's memories during conversations
- **Conversation Persistence**: Not saving to ZMemory timeline
- **Tool Calling Framework**: No function calling capabilities implemented

### 🎯 Phase 2: ZephyrOS Ecosystem Integration (NEXT PRIORITY)

#### Goal: Transform the chat interface from a basic LLM chatbot into a ZephyrOS-integrated assistant

#### Key Features to Implement:

**1. ZMemory MCP Tool Integration**
- **Memory Search**: Let agents search user's memories and knowledge base
- **Context Injection**: Automatically provide relevant memories as context
- **Conversation Storage**: Save important conversations to ZMemory timeline
- **Smart Retrieval**: Use embedding search for relevant context

**2. ZFlow Task Management Tools**
- **Task Creation**: Create tasks directly from chat interactions
- **Task Search**: Query existing tasks and projects
- **Task Updates**: Modify task status, priority, and details
- **Project Insights**: Get project summaries and recommendations

**3. Function Calling Framework**
- **Tool Registry**: Standardized tool definition and registration
- **Execution Engine**: Safe tool execution with proper error handling
- **Result Display**: Rich UI for displaying tool call results
- **Permission System**: User consent for sensitive operations

#### Implementation Approach:

**Week 1: ZMemory MCP Client**
- Set up MCP client in ZFlow backend
- Connect to existing ZMemory MCP server
- Test basic memory search and storage operations

**Week 2: Tool Calling Infrastructure**
- Implement OpenAI function calling in agent clients
- Add tool execution pipeline in API routes
- Create UI components for tool call display

**Week 3: Core Tools Implementation**
- Memory search and context injection tools
- Task creation and management tools
- Conversation storage automation

**Week 4: UI/UX Polish**
- Rich tool call result display
- User confirmation for actions
- Error handling and retry mechanisms

#### Expected User Experience After Phase 2:
```
👤 "Help me plan my product launch project"

🤖 "I'll help you plan your product launch! Let me check your existing tasks and memories..."
    ⚡ [Searching memories for: product launch, project planning]
    ⚡ [Searching tasks for: launch, product, project]

🤖 "I found 3 related memories about your previous launches and 2 active tasks.
    Based on your history, here's a comprehensive launch plan:

    📋 [Create Task: Product Launch Timeline - Due: Next Friday]
    📋 [Create Task: Marketing Campaign Setup - Due: Next Monday]

    Would you like me to create these tasks and set up the project structure?"

👤 "Yes, create those tasks and add them to my 'Q1 Projects' list"

🤖 ⚡ [Creating task: Product Launch Timeline]
    ⚡ [Creating task: Marketing Campaign Setup]
    ⚡ [Adding to project: Q1 Projects]

    ✅ Created 2 tasks and added them to Q1 Projects!
    💾 [Saving conversation to memories: Product Launch Planning Session]
```

#### Technical Implementation Strategy
```
│ [Agent Chat] | [Task View] | [Activities] | [Archive]                  │
│                                                                         │
│ ┌─ Agent: GPT-4 ─────────────────────────────────────────────────────┐ │
│ │ 🤖 Hi! I can help you with tasks, research, and more.              │ │
│ │                                                                     │ │
│ │ 👤 Can you help me plan my project launch?                         │ │
│ │                                                                     │ │
│ │ 🤖 I'd be happy to help! Let me check your current tasks...        │ │
│ │    ⚡ [Calling tool: zflow.getTasks]                               │ │
│ │    📋 I see you have 3 active projects. For your launch...         │ │
│ │                                                                     │ │
│ │    [Create Task] [Save to Memory] [New Chat]                       │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ 💬 Ask anything about your tasks, projects, or memories...             │
│ [Send] [📎 Attach] [🎤 Voice] [⚙️ Agent Settings]                      │
└─────────────────────────────────────────────────────────────────────────┘
```

#### Technical Flow
1. **User sends message** → ZFlow API routes (`/api/agents/messages`)
2. **ZFlow backend** → OpenAI API with streaming + ZMemory MCP tools
3. **Real-time tokens** → Redis PubSub → SSE → Frontend
4. **Tool calls** → ZFlow API (tasks) + ZMemory MCP (memories)
5. **Results displayed** in real-time with action buttons

#### Quick Implementation Path
- **Week 1**: Add chat UI components to ZFlow using existing design system
- **Week 2**: Implement SSE streaming endpoint in ZFlow API routes  
- **Week 3**: OpenAI API integration with function calling for ZFlow tasks
- **Week 4**: ZMemory-MCP integration for context-aware responses

#### Benefits
- **Zero Infrastructure**: Uses existing ZFlow/ZMemory setup
- **Familiar Interface**: Users already know ZFlow components
- **Immediate Value**: Chat with GPT-4 about their actual tasks and memories
- **Foundation**: Establishes patterns for more complex agents later

## 🛠️ ZFlow-Centric Agent Architecture

### Why ZFlow as the Agent Hub?

**ZFlow Integration Advantages:**
- ✅ **Zero Additional Infrastructure**: Leverages existing Next.js app and Supabase setup
- ✅ **User Familiarity**: Users already understand ZFlow's interface and workflows
- ✅ **Component Reusability**: Rich UI library (TaskCard, Modals, etc.) ready for agent interactions
- ✅ **Authentication & Authorization**: Seamless integration with existing user management
- ✅ **Real-time Capabilities**: WebSocket infrastructure already in place

**Cloud-First Agent Strategy:**
- ✅ **Scalability**: Cloud agents handle compute-intensive AI processing
- ✅ **Cost Efficiency**: Pay-per-use model with cloud providers (AWS, OpenAI)
- ✅ **Reliability**: Enterprise-grade infrastructure and SLAs
- ✅ **Flexibility**: Easy to swap between different AI providers and models
- ✅ **Rapid Deployment**: No custom agent infrastructure to maintain

### Technology Stack

#### ZFlow Frontend Enhancement (Next.js)
- **Agent Chat Components**: StreamingChat, AgentSelector, ToolCalls
- **Real-time Streaming**: Server-Sent Events (SSE) for token streaming  
- **UI Components**: Extending existing design system (TaskCard → ChatCard)
- **State Management**: SWR for agent sessions and conversation history
- **Mobile Support**: Responsive chat interface using existing mobile patterns

#### ZFlow Backend Integration (Next.js API Routes)
- **Agent Gateway**: `/api/agents/*` routes for agent communication
- **Session Management**: Redis-backed chat sessions and state
- **SSE Streaming Server**: Real-time token streaming to frontend
- **Message Router**: Route messages to appropriate cloud agents
- **Tool Integration**: Connect agent tool calls to ZFlow/ZMemory APIs

#### Cloud Agent Layer (External Services)
- **AWS AgentCore**: Bedrock agents with native streaming support
- **OpenAI API**: GPT-4, GPT-4 Turbo with function calling
- **Anthropic Claude**: Via API with streaming capabilities  
- **Custom Agents**: ECS/Lambda-hosted Python agents when needed
- **Agent Registry**: Dynamic discovery and routing of available agents

#### Memory & Context (ZMemory-MCP)
- **MCP Tools**: Agents call ZMemory via MCP protocol for context
- **Conversation Storage**: Chat history stored in ZMemory timeline
- **Context Injection**: Relevant memories injected into agent prompts
- **Task Integration**: Agents can create/modify ZFlow tasks via MCP tools

### Integration Points
- **ZFlow API**: Direct integration with task management system
- **ZMemory MCP**: Leverage existing memory management protocols
- **Supabase**: Shared database and authentication
- **ZephyrOS Shared**: Utilize common utilities and types

### Agent Communication Protocol

```typescript
interface AgentMessage {
  id: string
  type: 'request' | 'response' | 'event' | 'broadcast'
  source: string
  target: string | 'all'
  payload: any
  timestamp: Date
  priority: 'low' | 'normal' | 'high' | 'urgent'
}

interface AgentCapability {
  name: string
  description: string
  inputSchema: JSONSchema
  outputSchema: JSONSchema
  requiredPermissions: string[]
}
```

## 📁 ZFlow-Integrated Agent Architecture

### Project Structure Strategy

Since agents integrate directly into ZFlow, the main development happens within the existing ZFlow codebase with minimal additional infrastructure.

```
apps/zflow/                          # Existing ZFlow app (MAIN LOCATION)
├── 📁 app/
│   ├── 📁 components/
│   │   ├── 📁 agents/               # NEW: Agent-specific components
│   │   │   ├── AgentChatWindow.tsx     # Main chat interface
│   │   │   ├── StreamingMessage.tsx    # Real-time message display
│   │   │   ├── AgentSelector.tsx       # Agent picker dropdown
│   │   │   ├── ToolCallDisplay.tsx     # Tool execution visualization
│   │   │   ├── ConversationHistory.tsx # Chat history component
│   │   │   └── index.ts                # Clean exports
│   │   ├── 📁 ui/                   # Existing UI components (reuse!)
│   │   └── 📁 views/
│   │       └── AgentView.tsx        # NEW: Main agent interface page
│   ├── 📁 agents/                   # NEW: Agent chat page
│   │   └── page.tsx                 # Agent chat interface route
│   ├── 📁 api/                      # Existing API routes
│   │   └── 📁 agents/               # NEW: Agent API endpoints
│   │       ├── sessions/
│   │       │   └── route.ts         # Create/manage chat sessions
│   │       ├── messages/
│   │       │   └── route.ts         # Send messages to agents
│   │       ├── stream/
│   │       │   └── route.ts         # SSE streaming endpoint
│   │       └── cancel/
│   │           └── route.ts         # Cancel agent execution
│   └── 📁 lib/                      # Existing utilities
│       ├── 📁 agents/               # NEW: Agent integration logic
│       │   ├── registry.ts          # Agent registry and routing
│       │   ├── openai-client.ts     # OpenAI API integration
│       │   ├── aws-bedrock.ts       # AWS AgentCore client
│       │   ├── anthropic-client.ts  # Claude API integration
│       │   ├── streaming.ts         # SSE streaming utilities
│       │   ├── mcp-bridge.ts        # ZMemory-MCP integration
│       │   └── types.ts             # Agent type definitions
│       └── redis.ts                 # Redis client (for SSE pub/sub)

apps/zmemory-mcp/                    # Existing ZMemory MCP server (ENHANCED)
├── 📁 src/
│   ├── 📁 modules/
│   │   └── 📁 agent-tools/          # NEW: Agent-specific MCP tools
│   │       ├── conversation.ts      # Store/retrieve conversations
│   │       ├── task-integration.ts  # Create tasks from chat
│   │       ├── context-retrieval.ts # Get relevant memories
│   │       └── smart-summary.ts     # Summarize interactions
│   └── 📁 tools/                    # Existing MCP tools (extend)

apps/agents/                         # NEW: Custom cloud agents (optional)
├── 📁 aws-deployed/                 # For custom ECS/Lambda agents
│   ├── 📁 research-agent/           # Custom research agent
│   ├── 📁 analytics-agent/          # Custom analytics agent
│   └── 📁 workflow-agent/           # Custom workflow agent
├── 📁 shared/                       # Shared utilities for cloud agents
│   ├── mcp-client.py                # MCP client for ZMemory access
│   ├── zflow-client.py              # ZFlow API client
│   └── streaming-base.py            # Base class for streaming agents
├── docker-compose.dev.yml           # Local development setup
└── README.md                        # Custom agent development guide

# Supporting Infrastructure (minimal)
├── 📁 scripts/                      # Deployment and setup scripts
│   ├── setup-redis.sh               # Redis setup for SSE
│   ├── deploy-agents.sh             # Deploy custom agents to AWS
│   └── test-streaming.sh            # Test SSE endpoints
├── 📁 docs/                         # Documentation
│   ├── agent-integration.md         # How to add new agents
│   ├── streaming-guide.md           # SSE implementation guide
│   └── deployment.md                # Cloud deployment guide
└── .env.agents.example              # Environment variables for agents
```

### Key Architectural Decisions

#### 🎯 **ZFlow-First Approach**
- **Agent UI** lives in `/app/components/agents/` using existing design system
- **Agent APIs** live in `/app/api/agents/` as Next.js API routes
- **Agent Logic** lives in `/app/lib/agents/` for business logic
- **Minimal Infrastructure**: Only add Redis for SSE pub/sub

#### 🌊 **Streaming Infrastructure** 
- **SSE Server**: Next.js API route handles Server-Sent Events
- **Redis PubSub**: Lightweight message broker for real-time updates
- **Session Management**: Redis-backed chat sessions
- **No WebSockets**: SSE is simpler and sufficient for one-way streaming

#### 🧠 **ZMemory Integration**
- **Existing MCP**: Enhance ZMemory-MCP with agent-specific tools
- **No New Services**: Agents use existing ZMemory-MCP protocol
- **Context Awareness**: Agents get relevant memories automatically
- **Conversation Storage**: Chat history stored in ZMemory timeline

#### ☁️ **Cloud-First Agents**
- **External APIs**: OpenAI, Anthropic, AWS Bedrock via HTTP
- **Custom Agents**: Optional ECS/Lambda deployment for specialized needs
- **Zero Infrastructure**: Most agents are API calls, not hosted services
- **Easy Scaling**: Cloud providers handle scaling automatically

## 📁 Comprehensive Agent Project Architecture

### Full Project Structure (ZFlow Integration + Custom Agents)

```
apps/agents/                         # NEW: Agents project directory
├── 📁 orchestrator/                 # TypeScript Orchestration Layer
│   ├── 📁 src/                      # TypeScript source code
│   │   ├── 📁 core/                 # Core orchestration system
│   │   │   ├── 📁 registry/         # Agent registry and discovery
│   │   │   │   ├── agent-registry.ts    # Agent registration/discovery
│   │   │   │   ├── capability-store.ts  # Capability management
│   │   │   │   └── health-monitor.ts    # Health monitoring
│   │   │   ├── 📁 gateway/          # API Gateway
│   │   │   │   ├── api-gateway.ts       # Main API router
│   │   │   │   ├── auth-middleware.ts   # JWT authentication
│   │   │   │   └── rate-limiter.ts      # Rate limiting
│   │   │   ├── 📁 messaging/        # Message routing
│   │   │   │   ├── message-bus.ts       # Redis pub/sub
│   │   │   │   ├── queue-manager.ts     # Task queuing
│   │   │   │   └── websocket.ts         # Real-time communication
│   │   │   └── 📁 scheduler/        # Task scheduling
│   │   │       ├── task-scheduler.ts    # Task orchestration
│   │   │       ├── workflow-engine.ts   # Workflow management
│   │   │       └── load-balancer.ts     # Agent load balancing
│   │   ├── 📁 bridges/              # Communication bridges
│   │   │   ├── zflow-bridge.ts      # ZFlow integration
│   │   │   ├── zmemory-bridge.ts    # ZMemory integration
│   │   │   └── cloud-bridge.ts      # Cloud agent communication
│   │   ├── 📁 types/                # Shared type definitions
│   │   │   ├── agent.types.ts       # Agent interfaces
│   │   │   ├── message.types.ts     # Message protocols
│   │   │   └── workflow.types.ts    # Workflow definitions
│   │   └── 📁 utils/                # Utility functions
│   │       ├── logger.ts            # Structured logging
│   │       ├── validation.ts        # Input validation
│   │       └── encryption.ts        # Security utilities
│   ├── package.json                 # Node.js dependencies
│   ├── tsconfig.json                # TypeScript config
│   └── .env.example                 # Environment template
├── 📁 agents/                       # Python Agent Runtime
│   ├── 📁 core/                     # Core agent implementations
│   │   ├── task_manager.py          # Task management agent
│   │   ├── workflow_orchestrator.py # Workflow coordination
│   │   ├── user_assistant.py        # User assistance
│   │   └── system_monitor.py        # System monitoring
│   ├── 📁 specialized/              # Domain-specific agents
│   │   ├── memory_manager.py        # Memory operations (LangChain)
│   │   ├── analytics_agent.py       # Analytics & insights
│   │   ├── research_agent.py        # Automated research
│   │   └── communication_agent.py   # Notifications & comms
│   ├── 📁 extensions/               # Extension agents
│   │   ├── custom_workflow.py       # Custom workflows
│   │   ├── plugin_connector.py      # Plugin integrations
│   │   └── external_api.py          # External service APIs
│   ├── 📁 frameworks/               # Agent frameworks
│   │   ├── 📁 langchain/            # LangChain-based agents
│   │   ├── 📁 crewai/               # CrewAI implementations
│   │   └── 📁 autogen/              # AutoGen multi-agent
│   ├── 📁 shared/                   # Shared Python modules
│   │   ├── base_agent.py            # Base agent class
│   │   ├── capabilities.py          # Agent capabilities
│   │   ├── communication.py         # API communication
│   │   └── config.py                # Configuration management
│   ├── 📁 cloud/                    # Cloud deployment configs
│   │   ├── 📁 aws/                  # AWS-specific deployments
│   │   │   ├── bedrock_agent.py     # AWS Bedrock integration
│   │   │   ├── lambda_handler.py    # Lambda function handler
│   │   │   └── ecs_task.py          # ECS task definition
│   │   ├── 📁 gcp/                  # Google Cloud integrations
│   │   └── 📁 azure/                # Azure integrations
│   ├── requirements.txt             # Python dependencies
│   ├── pyproject.toml               # Python project config
│   └── .env.example                 # Python environment template
├── 📁 workflows/                    # Predefined workflow templates
│   ├── daily_planning.py            # Daily planning workflow
│   ├── project_setup.py             # Project initialization
│   ├── memory_curation.py           # Memory organization
│   └── productivity_boost.py        # Productivity enhancement
├── 📁 integrations/                 # External integrations
│   ├── 📁 zephyr/                   # ZephyrOS integrations
│   │   ├── zflow_client.py          # ZFlow API client
│   │   ├── zmemory_client.py        # ZMemory API client
│   │   └── shared_client.py         # Shared utilities
│   ├── 📁 external/                 # Third-party integrations
│   │   ├── openai_client.py         # OpenAI integration
│   │   ├── anthropic_client.py      # Anthropic integration
│   │   ├── aws_bedrock.py           # AWS Bedrock client
│   │   └── vector_db.py             # Vector database
│   └── 📁 mcp/                      # MCP client integrations
│       ├── mcp_client.py            # Base MCP client
│       ├── zmemory_mcp.py           # ZMemory MCP client
│       └── tools_registry.py        # MCP tools registry
├── 📁 tests/                        # Test suite
│   ├── 📁 unit/                     # Unit tests
│   │   ├── 📁 typescript/           # TypeScript tests
│   │   └── 📁 python/               # Python tests
│   ├── 📁 integration/              # Integration tests
│   │   ├── test_zflow_bridge.py     # ZFlow integration tests
│   │   ├── test_zmemory_mcp.py      # ZMemory MCP tests
│   │   └── test_cloud_agents.py     # Cloud agent tests
│   └── 📁 e2e/                      # End-to-end tests
│       ├── test_streaming.py        # SSE streaming tests
│       └── test_workflows.py        # Workflow tests
├── 📁 docs/                         # Documentation
│   ├── architecture.md              # Architecture overview
│   ├── api-reference.md             # API documentation
│   ├── agent-development.md         # Agent development guide
│   ├── cloud-deployment.md          # Cloud deployment guide
│   ├── zflow-integration.md         # ZFlow integration guide
│   └── zmemory-mcp-tools.md         # ZMemory MCP tools reference
├── 📁 scripts/                      # Build and utility scripts
│   ├── setup.sh                     # Environment setup
│   ├── setup-agents.sh              # ZFlow agent setup
│   ├── build.sh                     # Build both layers
│   ├── test.sh                      # Run all tests
│   ├── deploy-aws.sh                # AWS deployment
│   └── deploy-agents.sh             # Deploy custom agents to cloud
├── 📁 config/                       # Configuration files
│   ├── agents.yaml                  # Agent configurations
│   ├── capabilities.yaml            # Capability definitions
│   ├── workflows.yaml               # Workflow templates
│   └── deployment.yaml              # Deployment configurations
├── docker-compose.yml               # Multi-service deployment
├── docker-compose.dev.yml           # Development environment
├── Dockerfile.orchestrator          # TypeScript layer container
├── Dockerfile.agents                # Python layer container
├── .env.example                     # Environment variables template
├── .gitignore                       # Git ignore rules
└── README.md                        # Project README
```

### ZFlow Integration Files (within existing ZFlow app)

```
apps/zflow/                          # Existing ZFlow app enhanced for agents
├── 📁 app/
│   ├── 📁 components/
│   │   ├── 📁 agents/               # NEW: Agent-specific components
│   │   │   ├── AgentChatWindow.tsx     # Main chat interface
│   │   │   ├── StreamingMessage.tsx    # Real-time message display
│   │   │   ├── AgentSelector.tsx       # Agent picker dropdown
│   │   │   ├── ToolCallDisplay.tsx     # Tool execution visualization
│   │   │   ├── ConversationHistory.tsx # Chat history component
│   │   │   ├── AgentStatus.tsx         # Agent connection status
│   │   │   ├── MessageComposer.tsx     # Message input component
│   │   │   └── index.ts                # Clean exports
│   │   ├── 📁 ui/                   # Existing UI components (reuse!)
│   │   └── 📁 views/
│   │       └── AgentView.tsx        # NEW: Main agent interface page
│   ├── 📁 agents/                   # NEW: Agent chat page route
│   │   ├── page.tsx                 # Agent chat interface
│   │   ├── layout.tsx               # Agent-specific layout
│   │   └── loading.tsx              # Loading states
│   ├── 📁 api/                      # Existing API routes
│   │   └── 📁 agents/               # NEW: Agent API endpoints
│   │       ├── sessions/
│   │       │   └── route.ts         # Create/manage chat sessions
│   │       ├── messages/
│   │       │   └── route.ts         # Send messages to agents
│   │       ├── stream/
│   │       │   └── route.ts         # SSE streaming endpoint
│   │       ├── cancel/
│   │       │   └── route.ts         # Cancel agent execution
│   │       └── registry/
│   │           └── route.ts         # Available agents registry
│   └── 📁 lib/                      # Existing utilities
│       ├── 📁 agents/               # NEW: Agent integration logic
│       │   ├── registry.ts          # Agent registry and routing
│       │   ├── openai-client.ts     # OpenAI API integration
│       │   ├── aws-bedrock.ts       # AWS AgentCore client
│       │   ├── anthropic-client.ts  # Claude API integration
│       │   ├── streaming.ts         # SSE streaming utilities
│       │   ├── mcp-bridge.ts        # ZMemory-MCP integration
│       │   ├── session-manager.ts   # Chat session management
│       │   └── types.ts             # Agent type definitions
│       └── redis.ts                 # Redis client (for SSE pub/sub)
```

## 🚀 Getting Started with ZFlow Agent Integration

### Minimal Setup Strategy

Since agents integrate directly into ZFlow, setup is dramatically simplified - no separate services needed!

#### 1. Enhance ZFlow with Agent Dependencies

```bash
cd apps/zflow
```

**Add Agent Dependencies to ZFlow:**
```bash
# Redis for SSE streaming
npm install ioredis
npm install @types/redis

# OpenAI and Anthropic APIs
npm install openai anthropic

# AWS SDK for Bedrock (optional)
npm install @aws-sdk/client-bedrock-runtime

# Streaming utilities
npm install eventsource-parser
```

**Update ZFlow Package.json:**
```json
{
  "dependencies": {
    // ... existing ZFlow dependencies
    "ioredis": "^5.3.0",
    "openai": "^4.0.0", 
    "anthropic": "^0.8.0",
    "@aws-sdk/client-bedrock-runtime": "^3.0.0",
    "eventsource-parser": "^1.1.0"
  }
}
```

#### 2. Setup Redis for SSE Streaming

**Local Development (Docker):**
```bash
# Add to existing docker-compose if present, or create new one
docker run -d --name redis -p 6379:6379 redis:7-alpine
```

**Production (AWS ElastiCache):**
```bash
# Use existing AWS infrastructure or add ElastiCache Redis
# Update environment variables accordingly
```

#### 3. Environment Configuration

**Add to ZFlow .env.local:**
```bash
# Agent API Keys
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=ant-...
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1

# Redis Configuration
REDIS_URL=redis://localhost:6379
# Or for production: REDIS_URL=redis://your-elasticache-endpoint:6379

# Agent Configuration
AGENT_DEFAULT_MODEL=gpt-4
AGENT_MAX_TOKENS=4000
AGENT_TIMEOUT=30000
```

#### 4. ZMemory-MCP Enhancement

**Add Agent Tools to ZMemory-MCP:**
```bash
cd apps/zmemory-mcp/src/modules
```

**Create agent-specific MCP tools** (these will be implemented in the coding phase):
- `conversation-store`: Save agent conversations 
- `context-retrieval`: Get relevant memories for agent context
- `task-creation`: Create ZFlow tasks from agent interactions
- `smart-summary`: Generate summaries of agent interactions

#### 5. Quick Setup Script

**Create `scripts/setup-agents.sh`:**
```bash
#!/bin/bash
echo "🚀 Setting up ZFlow Agent Integration..."

# Install ZFlow dependencies
cd apps/zflow
npm install ioredis openai anthropic eventsource-parser

# Start Redis if not running
docker run -d --name zephyr-redis -p 6379:6379 redis:7-alpine || echo "Redis already running"

# Copy environment template
cp .env.example .env.agents.example

echo "✅ Agent setup complete!"
echo "📝 Next steps:"
echo "  1. Add your API keys to apps/zflow/.env.local"
echo "  2. Run 'npm run dev' in apps/zflow"
echo "  3. Visit /agents in ZFlow to start chatting!"
```

### Development Workflow

#### Phase 1: Basic OpenAI Chat (Week 1)
1. **Create agent components** in `apps/zflow/app/components/agents/`
2. **Add API routes** in `apps/zflow/app/api/agents/`
3. **Implement SSE streaming** for real-time responses
4. **Basic chat interface** with OpenAI GPT-4

#### Phase 2: ZMemory Integration (Week 2) 
1. **Enhance ZMemory-MCP** with agent-specific tools
2. **Add context retrieval** from user's memories
3. **Conversation storage** in ZMemory timeline
4. **Task creation** from agent conversations

#### Phase 3: Multi-Agent Support (Week 3-4)
1. **Agent registry system** for multiple providers
2. **AWS Bedrock integration** for Claude/other models  
3. **Agent switching** in UI
4. **Advanced tool calling** for ZFlow tasks

### Key Benefits of This Approach

✅ **Minimal Setup**: No separate services, containers, or infrastructure
✅ **Fast Development**: Build on existing ZFlow components and patterns
✅ **User Familiarity**: Same UI, same auth, same user experience
✅ **Incremental**: Add one agent type at a time
✅ **Production Ready**: Leverage ZFlow's existing deployment pipeline

## 🎯 Core Agent Specifications

### Task Management Agent
**Purpose**: Intelligent task lifecycle management and optimization
**Capabilities**:
- Automatic task prioritization based on deadlines, dependencies, and user patterns
- Smart task scheduling and calendar integration
- Subtask decomposition and dependency resolution
- Progress tracking and bottleneck identification

### Workflow Orchestration Agent
**Purpose**: Coordinate complex multi-agent workflows
**Capabilities**:
- Workflow definition and execution engine
- Agent choreography and coordination
- Error handling and retry mechanisms
- Performance optimization and load balancing

### Memory Management Agent
**Purpose**: Intelligent knowledge organization and retrieval
**Capabilities**:
- Automatic memory categorization and tagging
- Smart content summarization and extraction
- Contextual memory retrieval
- Timeline-based memory organization

### User Assistant Agent
**Purpose**: Proactive user support and guidance
**Capabilities**:
- Contextual help and recommendations
- Natural language query processing
- Learning user preferences and patterns
- Proactive notifications and reminders

## 🔒 Security & Privacy Considerations

### Data Protection
- **Encryption at Rest**: All sensitive agent data encrypted using AES-256
- **Secure Communication**: TLS encryption for all inter-agent communication
- **Access Control**: Role-based access control (RBAC) for agent capabilities
- **Audit Logging**: Comprehensive audit trail for all agent actions

### Privacy by Design
- **Data Minimization**: Agents only access necessary data
- **User Consent**: Explicit consent for data processing
- **Data Retention**: Configurable data retention policies
- **Right to Deletion**: Support for user data deletion requests

## 📊 Monitoring & Analytics

### Health Monitoring
- **Agent Health Checks**: Continuous monitoring of agent status
- **Performance Metrics**: Response times, throughput, and error rates
- **Resource Utilization**: CPU, memory, and network usage
- **Alerting System**: Automated alerts for system issues

### Usage Analytics
- **Agent Performance**: Success rates and efficiency metrics
- **User Interaction**: Usage patterns and satisfaction scores
- **System Load**: Peak usage times and capacity planning
- **Workflow Efficiency**: Workflow completion rates and bottlenecks

## 🔄 Development Workflow

### Best Practices
1. **Agent-First Design**: Design agents as autonomous, single-responsibility units
2. **Event-Driven Architecture**: Use events for loose coupling between agents
3. **Test-Driven Development**: Write tests before implementing agent logic
4. **Documentation**: Maintain comprehensive API and workflow documentation
5. **Code Review**: Peer review for all agent implementations

### Development Phases

#### Phase 1: Foundation Setup (Week 1-2)
**TypeScript Layer:**
- Set up Express.js API gateway with authentication
- Implement Redis message bus and task queue
- Create agent registry and health monitoring
- Basic WebSocket support for real-time communication

**Python Layer:**
- Set up FastAPI server template
- Implement base agent class and communication protocols
- Create basic LangChain integration
- Set up testing framework

#### Phase 2: Core Agent Implementation (Week 3-5)
**Essential Agents (Python):**
- Task Management Agent with LangChain
- User Assistant Agent with OpenAI/Anthropic
- Basic Memory Management Agent
- System monitoring and health checks

**Integration:**
- TypeScript-Python communication bridge
- ZFlow API integration
- ZMemory MCP integration
- Error handling and retries

#### Phase 3: Advanced Capabilities (Week 6-8)
**Specialized Agents:**
- Analytics Agent with data processing
- Research Agent with web scraping/APIs
- Communication Agent for notifications
- Workflow orchestration engine

**Framework Integration:**
- CrewAI multi-agent workflows
- AutoGen conversation patterns
- Custom workflow templates

#### Phase 4: Extension & Optimization (Week 9-11)
**Extension Framework:**
- Plugin system for custom agents
- External API connectors
- Custom workflow builder
- Performance optimization

**Deployment:**
- Docker containerization
- Load balancing and scaling
- Production monitoring
- CI/CD pipeline

#### Phase 5: Advanced Features (Week 12+)
**AI/ML Enhancements:**
- Vector database integration
- Advanced NLP capabilities
- Learning and adaptation
- Autonomous decision making

## 🚀 Hybrid Deployment Strategy

### Docker-Compose Development Setup
```yaml
# docker-compose.yml
version: '3.8'
services:
  orchestrator:
    build: 
      context: ./orchestrator
      dockerfile: Dockerfile
    ports:
      - "3002:3002"
    environment:
      - REDIS_URL=redis://redis:6379
      - AGENT_RUNTIME_URL=http://agents:8000
    depends_on:
      - redis
      - agents

  agents:
    build:
      context: ./agents
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    environment:
      - REDIS_URL=redis://redis:6379
      - ORCHESTRATOR_URL=http://orchestrator:3002
    depends_on:
      - redis

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  redis_data:
```

### Environment Configuration
- **Development**: Hot reloading for both TypeScript and Python layers
- **Staging**: Production-like multi-container environment
- **Production**: Kubernetes or Docker Swarm with auto-scaling

### Scaling Considerations

#### TypeScript Orchestration Layer
- **Load Balancing**: Multiple orchestrator instances behind nginx
- **Session Management**: Redis-based session storage
- **API Gateway**: Rate limiting and request routing
- **Monitoring**: Prometheus metrics and Grafana dashboards

#### Python Agent Runtime  
- **Horizontal Scaling**: Multiple Python agent instances
- **Queue-based Load Distribution**: Redis-based task queuing
- **Resource Management**: CPU/Memory limits per agent type
- **Auto-scaling**: Based on queue depth and response times

## 📈 Future Roadmap

### Short-term Goals (3-6 months)
- Core agent infrastructure implementation
- Basic task management and user assistant agents
- ZFlow and ZMemory integration
- Initial workflow templates

### Medium-term Goals (6-12 months)
- Advanced analytics and machine learning capabilities
- Custom workflow builder interface
- External service integrations
- Mobile agent interactions

### Long-term Vision (12+ months)
- Autonomous agent learning and adaptation
- Multi-tenant agent deployment
- Advanced AI model integration
- Enterprise-grade scaling and security

## 🤝 Contributing Guidelines

### Code Standards
- **TypeScript**: Strict typing with comprehensive interfaces
- **ESLint**: Consistent code formatting and linting
- **Testing**: Minimum 80% test coverage requirement
- **Documentation**: JSDoc comments for all public APIs

### Hybrid Development Guidelines

#### TypeScript Orchestration Layer
1. Follow Express.js best practices with middleware patterns
2. Use Zod for request/response validation
3. Implement comprehensive error handling and logging
4. Write unit tests with Jest and integration tests
5. Use TypeScript strict mode and maintain type safety

#### Python Agent Development
1. Extend the base `BaseAgent` class
2. Use Pydantic for data validation and serialization
3. Implement async/await patterns for I/O operations
4. Follow PEP 8 style guidelines with Black formatter
5. Write pytest tests with async support
6. Document agent capabilities and API contracts

#### Cross-Layer Communication
1. Use standardized JSON message formats
2. Implement retry logic with exponential backoff
3. Add correlation IDs for distributed tracing
4. Monitor message queue health and performance
5. Handle network failures gracefully

---

**ZephyrOS Agents Crew** - Empowering intelligent automation and enhanced productivity through collaborative AI agents.