# Fusion AI Integration - Complete Analysis & Implementation Plan

## Executive Summary

This document provides a complete analysis of Chatwoot's AI architecture and a detailed plan for integrating Fusion as an alternative AI provider alongside OpenAI.

**Scope:** This plan focuses **exclusively on Integration Hooks (OSS)** - User-facing AI features accessible via Settings → Integrations:
- Rephrase messages
- Summarize conversations  
- Reply suggestions
- Fix spelling/grammar
- Shorten/expand messages
- Make friendly/formal
- Simplify messages

**Out of Scope:** Enterprise/Captain AI features are not included in this plan.

**Strategy:** Create a provider abstraction layer that allows switching between OpenAI and Fusion while maintaining backward compatibility. All existing OpenAI functionality will continue to work unchanged.

---

## 1. Full AI Architecture Analysis

### 1.1 AI Usage Contexts

#### Context A: Integration Hooks (Open Source)
**Purpose:** User-facing AI features accessible via settings → integrations → OpenAI

**Flow:**
```
Frontend (Vue) 
  → POST /api/v1/accounts/{id}/integrations/hooks/{hook_id}/process_event
  → HooksController#process_event
  → Integrations::Hook#process_event
  → Integrations::Openai::ProcessorService#perform
  → Integrations::OpenaiBaseService#make_api_call
  → HTTParty.post(api_url, ...)
  → OpenAI API
```

**Files:**
- `app/models/integrations/hook.rb` (line 67-74) - Routes to processor
- `lib/integrations/openai_base_service.rb` - Base service with HTTParty calls
- `lib/integrations/openai/processor_service.rb` - Event-specific implementations
- `app/controllers/api/v1/accounts/integrations/hooks_controller.rb` - API endpoint
- `config/integration/apps.yml` - Integration definition
- `app/javascript/dashboard/api/integrations/openapi.js` - Frontend client

**Events Supported:**
- `rephrase` - Rephrase message
- `summarize` - Summarize conversation
- `reply_suggestion` - Suggest reply
- `fix_spelling_grammar` - Fix spelling/grammar
- `shorten` - Shorten message
- `expand` - Expand message
- `make_friendly` - Make message friendly
- `make_formal` - Make message formal
- `simplify` - Simplify message

**API Call Pattern:**
- Uses HTTParty directly (not ruby-openai gem)
- Endpoint: `{CAPTAIN_OPEN_AI_ENDPOINT}/v1/chat/completions` or `https://api.openai.com/v1/chat/completions`
- Auth: `Authorization: Bearer {hook.settings['api_key']}`
- Request body: `{ model, messages: [{ role, content }] }`
- Response: `{ choices: [{ message: { content } }] }`

---

### 1.2 Routes → Services → Clients Map

#### Integration Hooks Flow

```
POST /api/v1/accounts/{account_id}/integrations/hooks/{hook_id}/process_event
  ↓
Api::V1::Accounts::Integrations::HooksController#process_event
  ↓
Integrations::Hook#process_event (app/models/integrations/hook.rb:67)
  ↓
Integrations::Openai::ProcessorService.new(hook: self, event: event).perform
  ↓
Integrations::OpenaiBaseService#perform
  ↓
Integrations::OpenaiBaseService#make_api_call (lib/integrations/openai_base_service.rb:89)
  ↓
HTTParty.post(api_url, headers: {...}, body: {...})
  ↓
OpenAI API / Fusion API
```

---

### 1.3 Current OpenAI Implementation Details

#### Integration Hooks (OSS)

**Base Service:** `lib/integrations/openai_base_service.rb`
- **API URL:** Constructed from `CAPTAIN_OPEN_AI_ENDPOINT` (if set) or defaults to `https://api.openai.com/`
- **Auth:** `Authorization: Bearer {hook.settings['api_key']}`
- **Model:** `ENV.fetch('OPENAI_GPT_MODEL', 'gpt-4o-mini')`
- **Token Limit:** 400,000 characters
- **HTTP Library:** HTTParty
- **Response Parsing:** `JSON.parse(response.body)['choices'].first['message']['content']`
- **Error Handling:** Returns `{ error: ..., error_code: ... }` on failure

**Processor Service:** `lib/integrations/openai/processor_service.rb`
- Extends `Integrations::OpenaiBaseService`
- Implements event-specific methods: `rephrase_message`, `summarize_message`, etc.
- Builds prompts from files in `lib/integrations/openai/openai_prompts/`
- Formats conversation messages for context

---

## 2. Dependency Tree

```
Integration Hooks (OSS)
│
├── Integrations::Hook (model)
│   └── process_event → routes to processor
│
├── Integrations::Openai::ProcessorService
│   ├── extends Integrations::OpenaiBaseService
│   ├── Event methods (rephrase, summarize, etc.)
│   └── Prompt building
│
└── Integrations::OpenaiBaseService
    ├── HTTParty API calls
    ├── Caching (Redis)
    ├── Token limit management
    └── Response parsing
```

---

## 3. Reusable Components for Fusion

### 3.1 Fully Reusable (No Changes Needed)

1. **Event Processing Logic**
   - `Integrations::OpenaiBaseService#perform` - Event validation, caching, orchestration
   - Event name validation (`valid_event_name?`)
   - Cache key generation and management
   - Conversation message formatting (`conversation_messages`, `add_messages_until_token_limit`)

2. **Prompt Building**
   - Prompt file loading (`prompt_from_file`)
   - Message body construction (`build_api_call_body`, `summarize_body`, `reply_suggestion_body`)
   - Conversation context formatting

3. **Response Parsing**
   - Response structure: `{ message: content }` or `{ error: ..., error_code: ... }`
   - Error handling pattern

4. **Frontend Integration**
   - `app/javascript/dashboard/api/integrations/openapi.js` - Can be reused with minimal changes
   - Event structure and API contract

5. **Controller Logic**
   - `HooksController#process_event` - Generic event processing
   - Error response formatting

### 3.2 Needs Abstraction

1. **API Client**
   - Currently: HTTParty direct calls in `make_api_call`
   - Need: Provider abstraction for API calls

2. **URL Construction**
   - Currently: Hardcoded OpenAI endpoint logic
   - Need: Provider-specific endpoint configuration

3. **Authentication**
   - Currently: `Authorization: Bearer {api_key}`
   - Need: Provider-specific auth (Fusion uses same pattern, but should be abstracted)

4. **Model Configuration**
   - Currently: `GPT_MODEL` constant
   - Need: Provider-specific model selection

---

## 4. Proposed Architecture

### 4.1 Provider Abstraction Layer

Create a provider abstraction that allows switching between OpenAI and Fusion:

```
Ai::Provider (abstract base)
├── Ai::Provider::Openai
└── Ai::Provider::Fusion
```

**Interface:**
```ruby
module Ai::Provider
  def chat_completion(messages, model:, **options)
    # Returns: { message: content } or { error: ..., error_code: ... }
  end
  
  def api_url
    # Returns provider-specific endpoint
  end
  
  def authenticate(api_key)
    # Returns auth headers
  end
end
```

### 4.2 Integration Points

#### Point 1: Integration Hooks Base Service
**File:** `lib/integrations/openai_base_service.rb`
**Change:** Rename to `lib/integrations/ai_base_service.rb` and use provider abstraction

**Strategy:**
- Keep `Integrations::OpenaiBaseService` for backward compatibility (deprecated)
- Create `Integrations::AiBaseService` that uses provider abstraction
- `Integrations::Openai::ProcessorService` extends new base
- Create `Integrations::Fusion::ProcessorService` extends new base

#### Point 2: Hook Model
**File:** `app/models/integrations/hook.rb`
**Change:** Route to appropriate processor based on `app_id`

**Current:**
```ruby
when 'openai'
  Integrations::Openai::ProcessorService.new(...)
```

**New:**
```ruby
when 'openai'
  Integrations::Openai::ProcessorService.new(...)
when 'fusion'
  Integrations::Fusion::ProcessorService.new(...)
```

#### Point 3: Integration Definition
**File:** `config/integration/apps.yml`
**Change:** Add Fusion integration definition

#### Point 4: Environment Variable Support
**New:** Support `AI_PROVIDER` environment variable for global default
**Optional:** Per-account provider selection (future enhancement)

---

## 5. Files to Create

### 5.1 Provider Abstraction

1. **`lib/ai/provider.rb`**
   - Abstract base class/module
   - Defines interface for AI providers
   - Factory method to get provider instance

2. **`lib/ai/provider/openai.rb`**
   - OpenAI provider implementation
   - Wraps HTTParty calls
   - Handles OpenAI-specific logic

3. **`lib/ai/provider/fusion.rb`**
   - Fusion provider implementation
   - Similar structure to OpenAI
   - Handles Fusion-specific endpoint/auth

### 5.2 Fusion Integration

4. **`lib/integrations/ai_base_service.rb`**
   - New base service using provider abstraction
   - Replaces OpenAI-specific logic with provider calls
   - Maintains all existing functionality (caching, token limits, etc.)

5. **`lib/integrations/fusion/processor_service.rb`**
   - Fusion-specific processor
   - Extends `Integrations::AiBaseService`
   - Reuses all event methods from base

6. **`lib/integrations/fusion/fusion_prompts/`** (directory)
   - Optional: Fusion-specific prompts if needed
   - Can reuse OpenAI prompts initially

### 5.3 Configuration

7. **`config/integration/apps.yml`** (modify)
   - Add Fusion integration definition
   - Similar structure to OpenAI

---

## 6. Files to Modify

### 6.1 Core Integration Files

1. **`app/models/integrations/hook.rb`** (line 67-74)
   - Add `when 'fusion'` case in `process_event`
   - Route to `Integrations::Fusion::ProcessorService`

2. **`lib/integrations/openai_base_service.rb`**
   - **Option A:** Keep as-is for backward compatibility, mark as deprecated
   - **Option B:** Refactor to use provider abstraction (breaking change)
   - **Recommendation:** Create new `Integrations::AiBaseService`, keep old one

3. **`lib/integrations/openai/processor_service.rb`**
   - **Option A:** Keep extending `Integrations::OpenaiBaseService` (backward compat)
   - **Option B:** Update to extend `Integrations::AiBaseService` with OpenAI provider
   - **Recommendation:** Keep as-is initially, add Fusion version

### 6.2 Frontend (Optional)

4. **`app/javascript/dashboard/api/integrations/openapi.js`**
   - **Option A:** Rename to `ai.js` and make provider-agnostic
   - **Option B:** Create `fusion.js` similar to `openapi.js`
   - **Recommendation:** Create `fusion.js` for now, refactor later if needed

5. **`app/javascript/dashboard/routes/dashboard/settings/integrations/ShowIntegration.vue`**
   - No changes needed (generic integration UI)

### 6.3 Configuration

6. **`config/integration/apps.yml`**
   - Add Fusion entry with settings schema

7. **`config/installation_config.yml`** (optional)
   - Add `FUSION_API_ENDPOINT` if needed
   - Add `AI_PROVIDER` default setting

---

## 7. Implementation Steps

### Phase 1: Provider Abstraction (Foundation)

1. Create `lib/ai/provider.rb` - Abstract base
2. Create `lib/ai/provider/openai.rb` - OpenAI implementation
3. Create `lib/ai/provider/fusion.rb` - Fusion implementation
4. Test provider abstraction in isolation

### Phase 2: Base Service Refactor

5. Create `lib/integrations/ai_base_service.rb` - New base using providers
6. Update `Integrations::Openai::ProcessorService` to optionally use new base
7. Test OpenAI still works with new abstraction

### Phase 3: Fusion Integration

8. Create `lib/integrations/fusion/processor_service.rb`
9. Add Fusion to `config/integration/apps.yml`
10. Update `app/models/integrations/hook.rb` to route Fusion events
11. Create `app/javascript/dashboard/api/integrations/fusion.js` (if needed)

### Phase 4: Testing & Validation

12. Test all OpenAI events still work
13. Test all Fusion events work
14. Test provider switching (if implemented)
15. Test error handling for both providers

### Phase 5: Documentation & Cleanup

16. Update documentation
17. Mark deprecated code (if any)
18. Add environment variable documentation

---

## 8. Detailed File Specifications

### 8.1 `lib/ai/provider.rb`

```ruby
module Ai
  module Provider
    class Base
      def initialize(api_key:, endpoint: nil, model: nil)
        @api_key = api_key
        @endpoint = endpoint || default_endpoint
        @model = model || default_model
      end

      def chat_completion(messages, **options)
        raise NotImplementedError
      end

      protected

      def default_endpoint
        raise NotImplementedError
      end

      def default_model
        raise NotImplementedError
      end
    end

    def self.for(provider_name, **options)
      case provider_name.to_s.downcase
      when 'openai'
        Provider::Openai.new(**options)
      when 'fusion'
        Provider::Fusion.new(**options)
      else
        raise ArgumentError, "Unknown provider: #{provider_name}"
      end
    end
  end
end
```

### 8.2 `lib/ai/provider/fusion.rb`

```ruby
module Ai
  module Provider
    class Fusion < Base
      def chat_completion(messages, **options)
        # HTTParty call to Fusion API
        # Same structure as OpenAI
        # Returns: { message: content } or { error: ..., error_code: ... }
      end

      protected

      def default_endpoint
        ENV.fetch('FUSION_API_ENDPOINT', 'https://api.fusion.ai/v1')
      end

      def default_model
        ENV.fetch('FUSION_MODEL', 'fusion-chat')
      end
    end
  end
end
```

### 8.3 `lib/integrations/ai_base_service.rb`

```ruby
class Integrations::AiBaseService
  # Same structure as OpenaiBaseService
  # But uses Ai::Provider instead of direct HTTParty
  
  def make_api_call(body)
    provider = get_provider
    response = provider.chat_completion(
      parse_messages_from_body(body),
      model: parse_model_from_body(body)
    )
    format_response(response)
  end

  private

  def get_provider
    provider_name = hook.settings['provider'] || 
                   ENV['AI_PROVIDER'] || 
                   'openai'
    Ai::Provider.for(
      provider_name,
      api_key: hook.settings['api_key'],
      endpoint: hook.settings['endpoint'],
      model: parse_model_from_body(body)
    )
  end
end
```

### 8.4 `lib/integrations/fusion/processor_service.rb`

```ruby
class Integrations::Fusion::ProcessorService < Integrations::AiBaseService
  # Identical to Openai::ProcessorService
  # All event methods inherited from base
  # Can override if Fusion needs different prompts
end
```

### 8.5 `config/integration/apps.yml` (addition)

```yaml
fusion:
  id: fusion
  logo: fusion.png  # Need to add logo
  i18n_key: fusion
  action: /fusion
  hook_type: account
  allow_multiple_hooks: false
  settings_json_schema:
    {
      'type': 'object',
      'properties': {
        'api_key': { 'type': 'string' },
        'endpoint': { 'type': 'string' },
      },
      'required': ['api_key'],
      'additionalProperties': false,
    }
  settings_form_schema:
    [
      {
        'label': 'API Key',
        'type': 'text',
        'name': 'api_key',
        'validation': 'required',
      },
      {
        'label': 'API Endpoint (optional)',
        'type': 'text',
        'name': 'endpoint',
        'validation': '',
        'help': 'Defaults to https://api.fusion.ai/v1',
      },
    ]
  visible_properties: ['api_key', 'endpoint']
```

---

## 9. Environment Variables

### New Variables

- `AI_PROVIDER` - Global default provider (`openai` or `fusion`)
- `FUSION_API_ENDPOINT` - Fusion API endpoint (default: `https://api.fusion.ai/v1`)
- `FUSION_MODEL` - Default Fusion model (default: `fusion-chat`)

### Existing Variables (Still Used)

- `OPENAI_GPT_MODEL` - OpenAI model (default: `gpt-4o-mini`)
- `CAPTAIN_OPEN_AI_ENDPOINT` - OpenAI endpoint override (used by Integration Hooks for endpoint configuration)

---

## 10. Testing Strategy

### Unit Tests

1. `Ai::Provider::Fusion` - Test API calls, error handling
2. `Integrations::Fusion::ProcessorService` - Test all events
3. `Integrations::AiBaseService` - Test provider switching

### Integration Tests

1. Full flow: Frontend → API → Processor → Fusion API
2. Error scenarios: Invalid API key, network errors, rate limits
3. Caching behavior
4. Token limit handling

### Compatibility Tests

1. OpenAI integration still works
2. Existing hooks continue to function
3. No breaking changes to API contracts

---

## 11. Migration Path

### For Existing Installations

1. **No Breaking Changes:** Existing OpenAI hooks continue to work
2. **Opt-in:** Fusion is a new integration option
3. **Gradual Migration:** Users can create Fusion hooks alongside OpenAI

### For New Installations

1. Set `AI_PROVIDER=fusion` to make Fusion the default
2. Or configure per-hook via settings

---

## 12. Summary of Changes

### Files to Create (7)
1. `lib/ai/provider.rb`
2. `lib/ai/provider/openai.rb`
3. `lib/ai/provider/fusion.rb`
4. `lib/integrations/ai_base_service.rb`
5. `lib/integrations/fusion/processor_service.rb`
6. `lib/integrations/fusion/fusion_prompts/` (directory, optional)
7. `app/javascript/dashboard/api/integrations/fusion.js` (optional)

### Files to Modify (4)
1. `app/models/integrations/hook.rb` - Add Fusion routing
2. `config/integration/apps.yml` - Add Fusion definition
3. `lib/integrations/openai_base_service.rb` - Optionally refactor (or keep as-is)
4. Documentation files

### Files to Keep Unchanged (Many)
- All frontend Vue components (generic integration UI)
- All controllers (generic event processing)
- All prompt files (can be reused)
- All caching logic
- All token limit logic
- All conversation formatting logic

---

## 13. Risk Assessment

### Low Risk
- ✅ Provider abstraction is isolated
- ✅ No changes to existing OpenAI code (backward compatible)
- ✅ Frontend changes minimal
- ✅ API contract unchanged

### Medium Risk
- ⚠️ Provider abstraction adds complexity
- ⚠️ Need to test both providers thoroughly
- ⚠️ Error handling must be consistent

### Mitigation
- Keep OpenAI code path unchanged initially
- Comprehensive testing for both providers
- Clear error messages for debugging
- Feature flag for Fusion (optional)

---

## 14. Next Steps

1. **Review this plan** - Confirm approach and architecture
2. **Create provider abstraction** - Start with Phase 1
3. **Implement Fusion provider** - Phase 2
4. **Test thoroughly** - Phase 4
5. **Deploy incrementally** - Test in staging first

---

**End of Plan**

