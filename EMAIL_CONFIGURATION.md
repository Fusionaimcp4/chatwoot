# Email Sender & Message Templates Configuration

## Email Sender Configuration

### Main Configuration File
**Location:** `app/mailers/application_mailer.rb` (Line 4)

```ruby
default from: ENV.fetch('MAILER_SENDER_EMAIL', 'Chatwoot <accounts@chatwoot.com>')
```

### Environment Variable
Set in your `.env` file:
```env
MAILER_SENDER_EMAIL=noreply@voxe.mcp4.ai
# Or with display name:
MAILER_SENDER_EMAIL=Voxe Support <noreply@voxe.mcp4.ai>
```

### Additional Sender Configuration
**File:** `app/mailers/conversation_reply_mailer.rb`

The email sender can be customized per conversation:
- Uses account support email if configured
- Uses inbox email address
- Uses agent email as fallback
- Format: `"Agent Name" <email@domain.com>` or `"Business Name" <email@domain.com>`

---

## Email Message Templates

### Template Location
**Directory:** `app/views/mailers/conversation_reply_mailer/`

### Available Templates

#### 1. `email_reply.html.erb`
- **Purpose:** Single message email reply
- **Used when:** Sending a single message via email
- **Content:** Message content with markdown rendering, attachments

#### 2. `reply_with_summary.html.erb`
- **Purpose:** Email with conversation summary
- **Used when:** Sending multiple messages with context
- **Content:** 
  - Greeting: "Hi [Contact Name],"
  - Summary: "You have new messages on your conversation."
  - All messages with sender names
  - Attachments

#### 3. `reply_without_summary.html.erb`
- **Purpose:** Simple email reply without summary
- **Used when:** Sending messages without conversation context
- **Content:** Just the message content and attachments

#### 4. `conversation_transcript.html.erb`
- **Purpose:** Full conversation transcript
- **Used when:** Sending complete conversation history
- **Content:** All conversation messages

### Email Layout
**File:** `app/views/layouts/mailer/base.liquid`

This is the HTML wrapper for all emails:
- Email structure and styling
- Branding footer with "Powered by [BRAND_NAME]"
- Responsive design
- Uses Liquid templating

---

## How Email Sender is Determined

The email sender follows this priority:

1. **Conversation Email Address** (if inbound emails enabled)
   - Format: `reply+[conversation-uuid]@[inbound-email-domain]`
   - Example: `reply+abc123@voxe.mcp4.ai`

2. **Inbox Email Address**
   - The email address configured for the inbox

3. **Account Support Email**
   - Set in account settings
   - Format: `MAILER_SENDER_EMAIL` or account support email

4. **Agent Email**
   - The assigned agent's email address

### Sender Name Format

**Friendly Mode:**
```
[Agent Name] from [Business Name] <email@domain.com>
```

**Professional Mode:**
```
[Business Name] <email@domain.com>
```

---

## Customizing Email Templates

### Option 1: Modify Template Files (Recommended for Voxe)

Edit the template files directly:
- `app/views/mailers/conversation_reply_mailer/email_reply.html.erb`
- `app/views/mailers/conversation_reply_mailer/reply_with_summary.html.erb`
- `app/views/mailers/conversation_reply_mailer/reply_without_summary.html.erb`

### Option 2: Database Templates (Dynamic)

Templates can be stored in the database and customized via:
- Super Admin panel
- Account-specific templates
- Installation-wide templates

**Model:** `app/models/email_template.rb`

### Option 3: Customize Email Layout

Edit `app/views/layouts/mailer/base.liquid` to:
- Change email styling
- Update branding
- Modify footer
- Change colors/scheme

---

## Email Content Variables

Available variables in email templates:

- `@message` - The message object
- `@messages` - Array of messages
- `@conversation` - Conversation object
- `@contact` - Contact/recipient
- `@agent` - Assigned agent
- `@account` - Account
- `@inbox` - Inbox
- `@channel` - Channel
- `global_config` - Branding config (BRAND_NAME, BRAND_URL)

---

## SMTP Configuration

**File:** `config/initializers/mailer.rb`

Required environment variables:
```env
SMTP_ADDRESS=smtp.gmail.com
SMTP_PORT=587
SMTP_DOMAIN=voxe.mcp4.ai
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_AUTHENTICATION=plain
SMTP_ENABLE_STARTTLS_AUTO=true
MAILER_SENDER_EMAIL=noreply@voxe.mcp4.ai
```

---

## Example: Customizing Email Reply Template

To customize the email reply message:

1. **Edit the template:**
   ```erb
   # app/views/mailers/conversation_reply_mailer/email_reply.html.erb
   
   <div style="font-family: Arial, sans-serif; padding: 20px;">
     <h2>New Message from Voxe</h2>
     <%= ChatwootMarkdownRenderer.new(@message.outgoing_content).render_message %>
   </div>
   ```

2. **Update branding in layout:**
   ```liquid
   # app/views/layouts/mailer/base.liquid
   # Change "Powered by" section to show Voxe branding
   ```

3. **Set sender email:**
   ```env
   MAILER_SENDER_EMAIL=Voxe Support <support@voxe.mcp4.ai>
   ```

---

## Testing Emails Locally

### Using MailHog (Docker)
```bash
# MailHog is already running in docker-compose
# Access at: http://localhost:8025
```

### Using Letter Opener
```env
# Add to .env
LETTER_OPENER=true
```

---

## Quick Reference

**Email Sender:**
- Config: `app/mailers/application_mailer.rb:4`
- Env Var: `MAILER_SENDER_EMAIL`
- Default: `Chatwoot <accounts@chatwoot.com>`

**Email Templates:**
- Location: `app/views/mailers/conversation_reply_mailer/`
- Layout: `app/views/layouts/mailer/base.liquid`

**SMTP Config:**
- File: `config/initializers/mailer.rb`
- Env Vars: `SMTP_*` variables

**Branding:**
- Uses `global_config['BRAND_NAME']` and `global_config['BRAND_URL']`
- Configured in `config/installation_config.yml`

