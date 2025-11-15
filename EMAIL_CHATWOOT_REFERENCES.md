# Email Files with "Chatwoot" References - Complete List

This document lists all files that contain "Chatwoot" references related to email sending and receiving.

---

## 📧 Email Sender Configuration Files

### 1. Default Email Sender
**File:** `app/mailers/application_mailer.rb`
- **Line 4:** `default from: ENV.fetch('MAILER_SENDER_EMAIL', 'Chatwoot <accounts@chatwoot.com>')`
- **Impact:** Default sender email when MAILER_SENDER_EMAIL is not set
- **User-facing:** ✅ Yes - appears in "From" field

### 2. Conversation Reply Mailer
**File:** `app/mailers/conversation_reply_mailer.rb`
- **Line 8:** `default from: ENV.fetch('MAILER_SENDER_EMAIL', 'Chatwoot <accounts@chatwoot.com>')`
- **Impact:** Default sender for conversation reply emails
- **User-facing:** ✅ Yes - appears in "From" field

### 3. Devise Mailer (Authentication)
**File:** `config/initializers/devise.rb`
- **Line 15:** `config.mailer_sender = ENV.fetch('MAILER_SENDER_EMAIL', 'Chatwoot <accounts@chatwoot.com>')`
- **Impact:** Sender for password reset, confirmation emails
- **User-facing:** ✅ Yes - appears in "From" field

---

## 📝 Email Template Files (User Receives)

### 4. Account Deletion - User Initiated
**File:** `app/views/mailers/administrator_notifications/account_notification_mailer/account_deletion_user_initiated.liquid`
- **Line 3:** "An account administrator has requested deletion of the **Chatwoot account**..."
- **Line 14:** "— The Chatwoot Team"
- **Impact:** Email sent to users when account deletion is requested
- **User-facing:** ✅ Yes - visible in email body

### 5. Account Deletion - Inactivity
**File:** `app/views/mailers/administrator_notifications/account_notification_mailer/account_deletion_for_inactivity.liquid`
- **Line 3:** "We've noticed that your **Chatwoot account**..."
- **Line 7:** "Log in to your **Chatwoot account**..."
- **Line 17:** `<a href="mailto:hello@chatwoot.com">hello@chatwoot.com</a>`
- **Line 19:** "— The Chatwoot Team"
- **Impact:** Email sent to users for inactive account deletion
- **User-facing:** ✅ Yes - visible in email body + contact email

### 6. Account Deleted (Compliance)
**File:** `app/views/mailers/administrator_notifications/account_compliance_mailer/account_deleted.liquid`
- **Line 3:** "...permanently deleted from your **Chatwoot instance**."
- **Line 6:** "**Chatwoot Installation:** {{ meta.instance_url }}"
- **Line 30:** "Chatwoot System"
- **Impact:** Email sent to instance admin when account is deleted
- **User-facing:** ✅ Yes - visible in email body

### 7. Email Confirmation Instructions (OSS)
**File:** `app/views/devise/mailer/confirmation_instructions.html.erb`
- **Line 6:** "...has invited you to try out <%= global_config['BRAND_NAME'] || 'Chatwoot' %>."
- **Line 10:** "You can login to your <%= global_config['BRAND_NAME'] || 'Chatwoot' %> account..."
- **Line 14:** "Welcome to <%= global_config['BRAND_NAME'] || 'Chatwoot' %>!..."
- **Impact:** Email confirmation/welcome emails
- **User-facing:** ✅ Yes - visible in email body (fallback if BRAND_NAME not set)

### 8. Email Confirmation Instructions (Enterprise)
**File:** `enterprise/app/views/devise/mailer/confirmation_instructions.html.erb`
- **Line 8:** "...has invited you to access <%= global_config['BRAND_NAME'] || 'Chatwoot' %> via Single Sign-On (SSO)."
- **Line 11:** "...has invited you to try out <%= global_config['BRAND_NAME'] || 'Chatwoot' %>."
- **Line 16:** "You can login to your <%= global_config['BRAND_NAME'] || 'Chatwoot' %> account..."
- **Line 20:** "Welcome to <%= global_config['BRAND_NAME'] || 'Chatwoot' %>!..."
- **Impact:** Enterprise email confirmation/welcome emails (with SSO support)
- **User-facing:** ✅ Yes - visible in email body (fallback if BRAND_NAME not set)

---

## 🔧 Email Subject Lines (Mailer Code)

### 9. Account Notification Mailer
**File:** `app/mailers/administrator_notifications/account_notification_mailer.rb`
- **Line 3:** `subject = 'Your Chatwoot account deletion has been scheduled'`
- **Line 15:** `subject = 'Your Chatwoot account is scheduled for deletion due to inactivity'`
- **Impact:** Email subject lines
- **User-facing:** ✅ Yes - appears in email subject

---

## 📋 Email Template Content (Message Rendering)

### 10-13. Conversation Reply Templates
These files use `ChatwootMarkdownRenderer` class (not user-facing text):
- `app/views/mailers/conversation_reply_mailer/email_reply.html.erb` (Line 4)
- `app/views/mailers/conversation_reply_mailer/reply_with_summary.html.erb` (Line 16)
- `app/views/mailers/conversation_reply_mailer/reply_without_summary.html.erb` (Line 4)
- `app/views/mailers/conversation_reply_mailer/conversation_transcript.html.erb` (Line 33)
- **Impact:** Class name only (not visible to users)
- **User-facing:** ❌ No - internal class name

---

## 📊 Summary by Category

### User-Facing Email Content (Need to Change)
1. ✅ `app/mailers/application_mailer.rb` - Default sender
2. ✅ `app/mailers/conversation_reply_mailer.rb` - Reply sender
3. ✅ `config/initializers/devise.rb` - Auth email sender
4. ✅ `app/views/mailers/administrator_notifications/account_notification_mailer/account_deletion_user_initiated.liquid`
5. ✅ `app/views/mailers/administrator_notifications/account_notification_mailer/account_deletion_for_inactivity.liquid`
6. ✅ `app/views/mailers/administrator_notifications/account_compliance_mailer/account_deleted.liquid`
7. ✅ `app/views/devise/mailer/confirmation_instructions.html.erb`
8. ✅ `app/mailers/administrator_notifications/account_notification_mailer.rb` - Subject lines

### Internal/Code References (Optional)
- `ChatwootMarkdownRenderer` class usage (not visible to users)
- `ChatwootExceptionTracker` (error handling, not in emails)

---

## 📧 Email Addresses Found

- `accounts@chatwoot.com` - Default sender email
- `hello@chatwoot.com` - Support contact email (in inactivity deletion template)

---

## 🎯 Priority Files to Update

### High Priority (User Sees These)
1. **Email Sender Defaults:**
   - `app/mailers/application_mailer.rb`
   - `app/mailers/conversation_reply_mailer.rb`
   - `config/initializers/devise.rb`

2. **Email Templates:**
   - `app/views/mailers/administrator_notifications/account_notification_mailer/account_deletion_user_initiated.liquid`
   - `app/views/mailers/administrator_notifications/account_notification_mailer/account_deletion_for_inactivity.liquid`
   - `app/views/mailers/administrator_notifications/account_compliance_mailer/account_deleted.liquid`
   - `app/views/devise/mailer/confirmation_instructions.html.erb`

3. **Email Subjects:**
   - `app/mailers/administrator_notifications/account_notification_mailer.rb`

4. **Enterprise Email Templates:**
   - `enterprise/app/views/devise/mailer/confirmation_instructions.html.erb`

### Low Priority (Internal Code)
- `ChatwootMarkdownRenderer` - Class name (not visible to users)

---

## 📝 Notes

- Most email templates use `global_config['BRAND_NAME']` which should already be set to "Voxe"
- The fallback "Chatwoot" appears when BRAND_NAME is not configured
- Email addresses like `accounts@chatwoot.com` and `hello@chatwoot.com` should be changed to Voxe domains
- The email layout (`app/views/layouts/mailer/base.liquid`) uses `global_config['BRAND_NAME']` and `global_config['BRAND_URL']` which are already configured

---

**Total Files with User-Facing "Chatwoot" References: 9 files**

