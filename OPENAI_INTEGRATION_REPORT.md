# OpenAI Integration Report - `/app/accounts/{id}/settings/integrations/openai`

## Overview

The OpenAI integration allows accounts to connect OpenAI API for AI-powered features like message rephrasing, summarization, reply suggestions, and label suggestions.

---

## URL Structure

**Path:** `/app/accounts/{account_id}/settings/integrations/openai`

**Example:** `/app/accounts/4/settings/integrations/openai`

**Route Pattern:** 
- Frontend: `dashboard/settings/integrations/ShowIntegration.vue` with `integrationId: 'openai'`
- Backend API: `/api/v1/accounts/{account_id}/integrations/apps` and `/api/v1/accounts/{account_id}/integrations/hooks`

---

## Architecture

### 1. Integration Definition

**File:** `config/integration/apps.yml`

```yaml
openai:
  id: openai
  logo: openai.png
  i18n_key: openai
  action: /openai
  hook_type: account          # Account-level integration
  allow_multiple_hooks: false  # Only one OpenAI hook per account
  settings_json_schema:        # Validation schema
    {
      'type': 'object',
      'properties': {
        'api_key': { 'type': 'string' },
        'label_suggestion': { 'type': 'boolean' },
      },
      'required': ['api_key'],
      'additionalProperties': false,
    }
  settings_form_schema:        # Frontend form fields
    [
      {
        'label': 'API Key',
        'type': 'text',
        'name': 'api_key',
        'validation': 'required',
      },
      {
        'label': 'Show label suggestions',
        'type': 'checkbox',
        'name': 'label_suggestion',
      },
    ]
```

**Key Points:**
- Account-level integration (not inbox-specific)
- Only one hook allowed per account
- Requires API key
- Optional label suggestion feature

---

### 2. Database Model

**File:** `app/models/integrations/hook.rb`

**Table:** `integrations_hooks`

**Fields:**
- `id` - Primary key
- `account_id` - Belongs to account
- `app_id` - Integration identifier ('openai')
- `hook_type` - 'account' or 'inbox' (OpenAI is 'account')
- `settings` - JSONB field storing:
  - `api_key` - OpenAI API key
  - `label_suggestion` - Boolean flag
- `status` - 'enabled' or 'disabled'
- `access_token` - Secure token for webhook access
- `inbox_id` - NULL for account-level hooks
- `created_at`, `updated_at`

**Validations:**
- `account_id` required
- `app_id` required
- `app_id` unique per account (since `allow_multiple_hooks: false`)
- Settings validated against JSON schema
- Feature flag check (if integration has feature flag)

---

### 3. Frontend Components

#### Main Integration Page
**File:** `app/javascript/dashboard/routes/dashboard/settings/integrations/ShowIntegration.vue`

**Flow:**
1. Receives `integrationId` prop (e.g., 'openai')
2. Fetches integration details from store
3. Renders `Integration.vue` component
4. Shows help text if integration is enabled

#### Integration Component
**File:** `app/javascript/dashboard/routes/dashboard/settings/integrations/Integration.vue`

**Features:**
- Displays integration logo, name, description
- Shows connect/disconnect button
- Renders settings form based on `settings_form_schema`
- Handles form submission to create/update hook

#### Integration Store
**File:** `app/javascript/dashboard/store/modules/integrations.js`

**Actions:**
- `get(integrationId)` - Fetch integration details
- `createHook(hookData)` - Create new hook
- `updateHook(hookId, data)` - Update existing hook
- `deleteHook(appId, hookId)` - Delete hook
- `showHook(hookId)` - Get hook details

**State:**
- `records` - Array of all integrations
- `uiFlags` - Loading states (isFetching, isCreating, etc.)

---

### 4. Backend API

#### Integration Apps Controller
**File:** `app/controllers/api/v1/accounts/integrations/apps_controller.rb`

**Endpoints:**
- `GET /api/v1/accounts/{account_id}/integrations/apps` - List all available integrations
- `GET /api/v1/accounts/{account_id}/integrations/apps/{id}` - Get specific integration

**Returns:**
- Integration definition from `config/integration/apps.yml`
- Whether integration is enabled (has active hook)
- Existing hooks for the integration

#### Hooks Controller
**File:** `app/controllers/api/v1/accounts/integrations/hooks_controller.rb`

**Endpoints:**
- `POST /api/v1/accounts/{account_id}/integrations/hooks` - Create hook
  ```json
  {
    "hook": {
      "app_id": "openai",
      "settings": {
        "api_key": "sk-...",
        "label_suggestion": true
      }
    }
  }
  ```

- `PUT /api/v1/accounts/{account_id}/integrations/hooks/{id}` - Update hook
  ```json
  {
    "hook": {
      "status": "enabled",
      "settings": { ... }
    }
  }
  ```

- `POST /api/v1/accounts/{account_id}/integrations/hooks/{id}/process_event` - Process AI event
  ```json
  {
    "event": {
      "name": "rephrase",
      "data": {
        "conversation_display_id": 123,
        "content": "Message text"
      }
    }
  }
  ```

- `DELETE /api/v1/accounts/{account_id}/integrations/hooks/{id}` - Delete hook

---

### 5. OpenAI Processing Service

**File:** `lib/integrations/openai/processor_service.rb`

**Base Service:** `lib/integrations/openai_base_service.rb`

**Supported Events:**
- `rephrase` - Rephrase message
- `summarize` - Summarize conversation
- `reply_suggestion` - Suggest reply
- `fix_spelling_grammar` - Fix spelling/grammar
- `shorten` - Shorten message
- `expand` - Expand message
- `make_friendly` - Make message friendly
- `make_formal` - Make message formal
- `simplify` - Simplify message

**Configuration:**
- **Model:** `gpt-4o-mini` (default, configurable via `OPENAI_GPT_MODEL` env var)
- **Token Limit:** 400,000 characters (120,000 tokens)
- **Endpoint:** `https://api.openai.com/v1/chat/completions` (configurable via `CAPTAIN_OPEN_AI_ENDPOINT`)

**Processing Flow:**
1. Validates event name
2. Checks cache (if cacheable)
3. Makes API call to OpenAI
4. Returns response with message content
5. Caches result (if cacheable)

**API Call:**
```ruby
POST https://api.openai.com/v1/chat/completions
Headers:
  Authorization: Bearer {api_key}
  Content-Type: application/json
Body:
  {
    "model": "gpt-4o-mini",
    "messages": [...],
    "temperature": 0.7
  }
```

---

### 6. Event Processing

**File:** `app/listeners/hook_listener.rb`

**Triggers:**
- `message_created` - When new message is created
- `message_updated` - When message is updated
- `conversation_created` - When conversation starts
- `conversation_resolved` - When conversation is resolved
- `contact_created` - When contact is created
- `contact_updated` - When contact is updated

**Flow:**
1. Event is triggered (e.g., message created)
2. `HookListener` finds all enabled hooks for the account
3. For each hook, checks if event is supported
4. Queues `HookJob` to process event
5. `HookJob` calls `hook.process_event(event)`
6. For OpenAI: `Integrations::Openai::ProcessorService` processes the event

---

## User Flow

### Setting Up OpenAI Integration

1. **Navigate to Settings:**
   - Go to `/app/accounts/{id}/settings/integrations/openai`

2. **View Integration:**
   - Frontend fetches integration details
   - Shows OpenAI logo, name, description
   - Shows "Connect" button if not enabled

3. **Connect Integration:**
   - User clicks "Connect"
   - Form appears with fields:
     - API Key (required)
     - Show label suggestions (checkbox)
   - User enters OpenAI API key
   - User submits form

4. **Create Hook:**
   - Frontend calls: `POST /api/v1/accounts/{id}/integrations/hooks`
   - Backend validates settings against JSON schema
   - Creates `Integrations::Hook` record
   - Returns hook data

5. **Integration Enabled:**
   - Integration shows as "Connected"
   - Settings can be updated
   - Integration can be disconnected

### Using OpenAI Features

1. **User Action:**
   - User clicks "Rephrase" or "Suggest Reply" in message composer
   - Frontend calls: `POST /api/v1/accounts/{id}/integrations/hooks/{hook_id}/process_event`

2. **Event Processing:**
   - Backend receives event
   - `HooksController#process_event` calls `hook.process_event(event)`
   - For OpenAI: `Integrations::Openai::ProcessorService` handles it

3. **OpenAI API Call:**
   - Service validates event name
   - Builds prompt based on event type
   - Calls OpenAI API with conversation context
   - Returns AI-generated response

4. **Response:**
   - Backend returns `{ message: "AI generated text" }`
   - Frontend displays result to user

---

## Configuration Options

### Settings (Stored in Hook)
- **`api_key`** (required) - OpenAI API key
- **`label_suggestion`** (optional) - Enable label suggestions

### Installation Config (Global)
- **`CAPTAIN_OPEN_AI_API_KEY`** - Global OpenAI API key (for Captain AI)
- **`CAPTAIN_OPEN_AI_MODEL`** - Model to use (default: `gpt-4o-mini`)
- **`CAPTAIN_OPEN_AI_ENDPOINT`** - API endpoint (default: `https://api.openai.com/`)

**Note:** Hook-level `api_key` takes precedence over global config for integration hooks.

---

## API Endpoints Summary

### Integration Management
```
GET    /api/v1/accounts/{id}/integrations/apps
GET    /api/v1/accounts/{id}/integrations/apps/{app_id}
POST   /api/v1/accounts/{id}/integrations/hooks
PUT    /api/v1/accounts/{id}/integrations/hooks/{hook_id}
DELETE /api/v1/accounts/{id}/integrations/hooks/{hook_id}
```

### Event Processing
```
POST   /api/v1/accounts/{id}/integrations/hooks/{hook_id}/process_event
```

---

## Files Involved

### Configuration
- `config/integration/apps.yml` - Integration definition
- `config/installation_config.yml` - Global OpenAI config

### Backend
- `app/models/integrations/hook.rb` - Hook model
- `app/models/integrations/app.rb` - Integration app model
- `app/controllers/api/v1/accounts/integrations/apps_controller.rb` - Apps API
- `app/controllers/api/v1/accounts/integrations/hooks_controller.rb` - Hooks API
- `lib/integrations/openai_base_service.rb` - Base OpenAI service
- `lib/integrations/openai/processor_service.rb` - Event processor
- `app/listeners/hook_listener.rb` - Event listener
- `app/jobs/hook_job.rb` - Background job processor

### Frontend
- `app/javascript/dashboard/routes/dashboard/settings/integrations/ShowIntegration.vue` - Main page
- `app/javascript/dashboard/routes/dashboard/settings/integrations/Integration.vue` - Integration component
- `app/javascript/dashboard/store/modules/integrations.js` - Vuex store
- `app/javascript/dashboard/api/integrations.js` - API client
- `app/javascript/dashboard/api/integrations/openapi.js` - OpenAI-specific API
- `app/javascript/dashboard/composables/useAI.js` - AI composable

---

## Key Features

1. **Account-Level Integration** - One OpenAI integration per account
2. **Settings Validation** - JSON schema validation for settings
3. **Event-Driven** - Processes events like message creation, updates
4. **Multiple AI Actions** - Supports 9 different AI operations
5. **Caching** - Can cache responses (currently no events are cacheable)
6. **Error Handling** - Returns errors if API call fails
7. **Secure** - API key stored in encrypted field (if encryption configured)

---

## Limitations

1. **One Hook Per Account** - `allow_multiple_hooks: false`
2. **Account-Level Only** - Cannot be configured per inbox
3. **No Caching** - Currently no events are marked as cacheable
4. **Token Limit** - 400,000 characters max per request
5. **Model Fixed** - Uses `gpt-4o-mini` (configurable via env var)

---

## Summary

The OpenAI integration at `/app/accounts/{id}/settings/integrations/openai` is a **hook-based integration system** that:

1. Allows accounts to connect their OpenAI API key
2. Stores settings in `integrations_hooks` table
3. Processes events (message created, updated, etc.)
4. Makes API calls to OpenAI for AI-powered features
5. Returns AI-generated responses for various actions

**Status:** ✅ Fully functional, ready to use

**Requirements:**
- OpenAI API key
- Account access
- Integration enabled (no feature flag required for basic OpenAI)


