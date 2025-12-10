# Chatwoot Codebase Overview

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Technology Stack](#technology-stack)
3. [Project Structure](#project-structure)
4. [Core Models & Relationships](#core-models--relationships)
5. [Key Features & Components](#key-features--components)
6. [Real-time Communication](#real-time-communication)
7. [Frontend Architecture](#frontend-architecture)
8. [API Structure](#api-structure)
9. [Background Jobs](#background-jobs)
10. [Enterprise Features](#enterprise-features)
11. [Widget SDK](#widget-sdk)
12. [Configuration](#configuration)

---

## Architecture Overview

Chatwoot is a **Rails 7.1** monolith application with a **Vue 3** frontend, following a modern full-stack architecture:

- **Backend**: Ruby on Rails (API + Server-side rendering)
- **Frontend**: Vue 3 with Composition API, Vuex for state management
- **Database**: PostgreSQL with pgvector extension (for AI embeddings)
- **Real-time**: Action Cable (WebSocket) over Redis
- **Background Jobs**: Sidekiq
- **Asset Pipeline**: Vite
- **Deployment**: Docker-based with docker-compose

---

## Technology Stack

### Backend
- **Ruby 3.4.4**
- **Rails 7.1**
- **PostgreSQL** (with pgvector for vector search)
- **Redis** (caching, Action Cable, Sidekiq)
- **Devise** (authentication)
- **Pundit** (authorization)
- **Sidekiq** (background jobs)
- **Searchkick** (search functionality)
- **Active Storage** (file uploads to S3/Azure/GCS)

### Frontend
- **Vue 3.5** (Composition API with `<script setup>`)
- **Vuex 4** (state management)
- **Vue Router 4** (routing)
- **Vite 5** (build tool)
- **Tailwind CSS** (styling - utility classes only)
- **Axios** (HTTP client)
- **Action Cable** (WebSocket client)

### Key Gems
- `devise_token_auth` - Token-based authentication
- `pgvector` / `neighbor` - Vector embeddings for AI
- `ruby-openai` / `ai-agents` - AI/LLM integration
- `wisper` - Pub/Sub pattern for events
- `audited` - Audit logging (Enterprise)
- `administrate` - Admin dashboard

---

## Project Structure

```
chatwoot/
├── app/
│   ├── models/              # ActiveRecord models (92 models)
│   ├── controllers/         # Rails controllers (160 files)
│   ├── services/            # Business logic services (134 files)
│   ├── jobs/                # Background jobs (69 files)
│   ├── javascript/          # Frontend Vue.js application
│   │   ├── dashboard/       # Main dashboard app
│   │   ├── widget/          # Customer-facing widget
│   │   ├── sdk/             # Widget SDK for embedding
│   │   ├── portal/          # Help center portal
│   │   └── shared/          # Shared components/utilities
│   ├── views/               # ERB/JBuilder templates
│   ├── channels/            # Action Cable channels
│   ├── listeners/           # Event listeners (Wisper)
│   └── builders/            # Builder pattern classes
├── config/                  # Rails configuration
│   ├── routes.rb            # Application routes
│   ├── installation_config.yml  # Installation-wide config
│   └── initializers/        # Initializers
├── db/
│   ├── schema.rb            # Database schema
│   └── migrate/            # Database migrations
├── enterprise/              # Enterprise edition overlay
│   └── app/                 # Enterprise-specific code
├── lib/                     # Custom libraries
├── spec/                    # RSpec tests
└── public/                  # Static assets
```

---

## Core Models & Relationships

### User Management
- **User** (STI: `SuperAdmin`)
  - Authentication via Devise
  - Can belong to multiple accounts via `AccountUser`
  - Has `pubsub_token` for WebSocket connections

- **Account** (Workspace/Company)
  - Multi-tenant isolation
  - Has many users, conversations, inboxes
  - Stores feature flags, settings, limits

- **AccountUser** (Join table)
  - Links users to accounts
  - Roles: `agent`, `administrator`
  - Tracks availability, capacity policies

### Conversation Management
- **Conversation**
  - Belongs to: Account, Inbox, Contact, Assignee (User)
  - Status: `open`, `resolved`, `pending`, `snoozed`
  - Priority: `low`, `medium`, `high`, `urgent`
  - Has labels, messages, notes

- **Message**
  - Belongs to: Conversation, Account, Inbox
  - Types: `incoming`, `outgoing`, `activity`, `template`
  - Content types: `text`, `cards`, `form`, `article`, `voice_call`, etc.
  - Supports attachments, mentions, in-reply-to

- **Contact**
  - Represents customers
  - Has many conversations via `ContactInbox`
  - Stores custom attributes, notes

- **Inbox**
  - Channel abstraction (polymorphic)
  - Types: Web Widget, Email, Facebook, WhatsApp, etc.
  - Has members (agents), conversations, campaigns

### Channel Types
All channels inherit from polymorphic `channel`:
- `Channel::WebWidget` - Website chat widget
- `Channel::Email` - Email inbox
- `Channel::FacebookPage` - Facebook Messenger
- `Channel::Instagram` - Instagram DMs
- `Channel::Whatsapp` - WhatsApp Business
- `Channel::TwitterProfile` - Twitter DMs
- `Channel::Sms` / `Channel::TwilioSms` - SMS
- `Channel::Line` - Line messaging
- `Channel::Telegram` - Telegram
- `Channel::Api` - API channel

---

## Key Features & Components

### 1. Omnichannel Support
- Unified inbox for all channels
- Channel-specific services in `app/services/`
- Webhook handlers for each platform
- OAuth token refresh for social channels

### 2. AI Agent (Captain)
- **Enterprise feature**
- AI assistants with custom tools
- Document embeddings (pgvector)
- Copilot for agent assistance
- Located in `enterprise/app/models/captain/`

### 3. Help Center Portal
- Knowledge base with articles
- Categories and folders
- Multi-language support
- Public-facing portal

### 4. Automation & Macros
- **Automation Rules**: Trigger-based workflows
- **Macros**: Pre-defined action sequences
- **Canned Responses**: Quick replies
- **Assignment Policies**: Auto-assignment rules

### 5. Reporting & Analytics
- Conversation reports
- Agent performance
- CSAT surveys
- Live reports dashboard

### 6. Teams & Collaboration
- Team-based assignment
- Private notes
- @mentions
- Agent capacity management

---

## Real-time Communication

### Action Cable Setup
- **Channel**: `RoomChannel` (`app/channels/room_channel.rb`)
- **Transport**: Redis (pub/sub)
- **Authentication**: Via `pubsub_token`

### How It Works
1. Client connects with `pubsub_token` (from User/Contact)
2. Subscribes to stream: `pubsub_token` + `account_{id}`
3. Server broadcasts events to relevant tokens
4. Events include: messages, conversations, notifications, presence

### Event Types
- `message.created` / `message.updated`
- `conversation.created` / `conversation.status_changed`
- `notification.created` / `notification.updated`
- `presence.update`
- `assignee.changed`
- `conversation.typing_on` / `typing_off`

### Frontend Integration
- `BaseActionCableConnector` class
- Separate connectors for Dashboard and Widget
- Auto-reconnection logic
- Presence updates every 20 seconds

---

## Frontend Architecture

### Entry Points (`app/javascript/entrypoints/`)
1. **dashboard.js** - Main agent dashboard
2. **widget.js** - Customer chat widget
3. **sdk.js** - Widget SDK (library mode)
4. **portal.js** - Help center portal
5. **superadmin.js** - Super admin interface
6. **survey.js** - CSAT survey pages

### Dashboard Structure
```
dashboard/
├── api/              # API client modules
├── components/      # Vue components (legacy)
├── components-next/ # Modern components (preferred)
├── composables/     # Vue 3 composables
├── routes/          # Vue Router routes
├── store/           # Vuex modules
├── helper/          # Utility functions
└── constants/       # Constants
```

### State Management (Vuex)
- Modular stores per feature
- `auth.js` - Authentication state
- `conversations.js` - Conversation list
- `conversationPage.js` - Active conversation
- `contacts.js` - Contact management
- `inboxes.js` - Inbox configuration

### Component Architecture
- **Legacy**: `components/` (being deprecated)
- **Modern**: `components-next/` (preferred)
  - Uses Composition API
  - Tailwind CSS only
  - TypeScript-ready structure

---

## API Structure

### API Versions
- **v1**: Main API (`/api/v1/`)
- **v2**: Reports API (`/api/v2/`)
- **Platform API**: External integrations (`/platform/api/v1/`)
- **Public API**: Widget/public endpoints (`/public/api/v1/`)

### Key Endpoints
```
/api/v1/accounts/:account_id/
  ├── conversations
  ├── messages
  ├── contacts
  ├── inboxes
  ├── agents
  ├── labels
  ├── macros
  ├── automation_rules
  └── captain/ (Enterprise)
```

### Authentication
- Token-based via `devise_token_auth`
- Endpoint: `/auth/sign_in`
- Headers: `access-token`, `client`, `uid`

---

## Background Jobs

### Sidekiq Queues
- `critical` - Real-time events
- `default` - Standard jobs
- `mailers` - Email sending
- `low` - Low priority tasks

### Key Jobs
- `ActionCableBroadcastJob` - WebSocket broadcasts
- `SendReplyJob` - Send messages via channels
- `ConversationResolutionJob` - Auto-resolve conversations
- `FetchImapEmailsJob` - Email fetching
- `WebhookJob` - External webhooks
- `NotificationEmailJob` - Email notifications

### Scheduled Jobs (sidekiq-cron)
- Auto-resolve conversations
- Email fetching
- Template syncing (WhatsApp/Twilio)
- Cleanup tasks

---

## Enterprise Features

Located in `enterprise/` directory, overlays OSS code:

### Key Enterprise Models
- `SlaPolicy` - SLA management
- `AgentCapacityPolicy` - Agent workload limits
- `CustomRole` - Custom permissions
- `Company` - Company/account grouping
- `Captain::Assistant` - AI assistants
- `AccountSamlSettings` - SAML SSO

### Enterprise Services
- SLA processing
- Company association
- Custom domain management (Cloudflare)
- Advanced AI tools

### Extension Pattern
Uses `prepend_mod_with` and `include_mod_with` to extend OSS:
```ruby
AccountUser.prepend_mod_with('AccountUser')
AccountUser.include_mod_with('Audit::AccountUser')
```

---

## Widget SDK

### How It Works
1. **Embed Script**: Website includes `/packs/js/sdk.js`
2. **SDK Initialization**: `window.chatwootSDK.run({ websiteToken, baseUrl })`
3. **IFrame Creation**: SDK creates iframe pointing to `/widget?website_token=...`
4. **Communication**: PostMessage API between parent and iframe
5. **WebSocket**: Widget connects via Action Cable

### SDK Features
- Customizable position, colors, style
- Pre-chat form
- Working hours
- CSAT surveys
- File attachments
- Typing indicators
- Read receipts

### Files
- `app/javascript/sdk/sdk.js` - Main SDK entry
- `app/javascript/widget/` - Widget Vue app
- `app/controllers/widgets_controller.rb` - Widget page
- `app/models/channel/web_widget.rb` - Web widget model

---

## Configuration

### Installation Config (`config/installation_config.yml`)
- Branding (logo, name, URLs)
- Feature toggles
- Email settings
- API keys
- Can be modified via Super Admin UI (if not locked)

### Environment Variables
Key variables (see `.env.example`):
- `FRONTEND_URL` - Frontend base URL
- `REDIS_URL` - Redis connection
- `POSTGRES_DB` - Database name
- `SECRET_KEY_BASE` - Rails secret
- `ACTIVE_RECORD_ENCRYPTION_*` - Encryption keys (for MFA)

### Database Schema
- 50+ tables
- Extensive indexing for performance
- JSONB columns for flexible attributes
- Vector columns for AI embeddings

---

## Development Workflow

### Setup
```bash
bundle install
pnpm install
docker-compose up -d  # PostgreSQL, Redis
bundle exec rails db:create db:migrate
```

### Running
```bash
# Development
pnpm dev  # or: overmind start -f Procfile.dev

# Components:
# - Rails server (port 3000)
# - Sidekiq worker
# - Vite dev server (port 3036)
```

### Testing
```bash
# Ruby
bundle exec rspec spec/path/to/file_spec.rb

# JavaScript
pnpm test
pnpm test:watch
```

### Linting
```bash
# Ruby
bundle exec rubocop -a

# JavaScript/Vue
pnpm eslint
pnpm eslint:fix
```

---

## Key Design Patterns

1. **Service Objects**: Business logic in `app/services/`
2. **Builder Pattern**: Complex object creation (`app/builders/`)
3. **Pub/Sub**: Event-driven architecture (Wisper)
4. **Polymorphic Associations**: Channels, attachments
5. **STI (Single Table Inheritance)**: User types
6. **Concerns**: Shared model behavior
7. **Policies**: Authorization (Pundit)

---

## Security Features

- **Authentication**: Devise + JWT tokens
- **Authorization**: Pundit policies
- **MFA/2FA**: TOTP (Enterprise, requires encryption keys)
- **SAML SSO**: Enterprise feature
- **Rate Limiting**: Rack::Attack
- **CSRF Protection**: Rails default
- **Encryption**: Active Record encryption for sensitive data

---

## Deployment

### Docker
- `docker-compose.yaml` - Development
- `docker-compose.production.yaml` - Production
- Multi-stage Dockerfiles in `docker/`

### Services
- Rails (Puma)
- Sidekiq (background jobs)
- Vite (asset compilation)
- PostgreSQL
- Redis

### Production Considerations
- Environment variables
- Database migrations
- Asset precompilation
- Sidekiq cron jobs
- SSL/TLS for WebSockets

---

## Summary

Chatwoot is a comprehensive customer support platform with:
- **Multi-tenant architecture** (Account-based)
- **Omnichannel support** (10+ channels)
- **Real-time messaging** (Action Cable)
- **Modern frontend** (Vue 3, Composition API)
- **Enterprise features** (SLA, AI, SSO)
- **Extensible architecture** (Enterprise overlay pattern)

The codebase follows Rails conventions with clear separation of concerns, service objects for business logic, and a modern Vue.js frontend using Composition API and Tailwind CSS.

