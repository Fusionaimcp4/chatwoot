# SSO Login Configuration Report for VoxeDesk

## Executive Summary

**SSO Status:** ✅ **READY** - SAML SSO is implemented but requires Enterprise Edition and proper configuration.

**SSO Type:** SAML 2.0 (Enterprise Edition Feature)

**Current State:** 
- Code is present and functional
- Requires Enterprise Edition to be enabled
- Requires per-account configuration
- Requires IdP (Identity Provider) setup

---

## 1. SSO Implementation Overview

### 1.1 SSO Type Supported
- **SAML 2.0** (Security Assertion Markup Language)
- Enterprise Edition feature only
- Multi-tenant support (per-account configuration)

### 1.2 Code Location
- **Enterprise files:** `enterprise/` directory
- **Main SSO logic:** `enterprise/app/models/account_saml_settings.rb`
- **Authentication:** `enterprise/app/controllers/api/v1/auth_controller.rb`
- **SAML Initializer:** `enterprise/config/initializers/omniauth_saml.rb`
- **User Builder:** `enterprise/app/builders/saml_user_builder.rb`

---

## 2. Requirements for SSO to Work

### 2.1 Enterprise Edition
- ✅ **MUST have Enterprise Edition enabled**
- Feature flag: `saml` must be enabled for the account
- Check: `account.feature_enabled?('saml')`

### 2.2 Account Configuration (Per Account)
Each account needs SAML settings configured via API:

**Required Fields:**
1. **`sso_url`** - Identity Provider SSO URL (e.g., `https://idp.example.com/sso`)
2. **`certificate`** - X.509 certificate from IdP (PEM format)
3. **`idp_entity_id`** - Identity Provider Entity ID
4. **`sp_entity_id`** - Service Provider Entity ID (auto-generated if not provided)
   - Format: `https://voxe.mcp4.ai/saml/sp/{account_id}`

**Optional Fields:**
- **`role_mappings`** - JSON mapping of SAML groups to Chatwoot roles

### 2.3 User Requirements
- User must exist in VoxeDesk database (can be auto-created)
- User email must match SAML assertion email
- User must be associated with the account that has SAML enabled

---

## 3. SSO Login Flow

### 3.1 Initiation Flow

**Step 1: User Requests SSO Login**
```
POST /api/v1/auth/saml_login
Body: { "email": "user@example.com", "target": "web" }
```

**Step 2: System Validates**
- Checks if user exists
- Finds account with SAML enabled for that user
- Validates SAML settings are configured

**Step 3: Redirect to IdP**
```
GET /auth/saml?account_id={account_id}&RelayState=web
→ Redirects to IdP SSO URL
```

**Step 4: User Authenticates at IdP**
- User logs in at Identity Provider
- IdP validates credentials

**Step 5: SAML Response**
```
POST /omniauth/saml/callback?account_id={account_id}
→ IdP sends SAML assertion back
```

**Step 6: User Creation/Login**
- System validates SAML assertion
- Creates user if doesn't exist
- Logs user in
- Redirects to dashboard

### 3.2 Request Format from voxe.mcp4.ai

**To initiate SSO login, send:**
```http
POST https://voxe.mcp4.ai/api/v1/auth/saml_login
Content-Type: application/json

{
  "email": "user@example.com",
  "target": "web"  // or "mobile"
}
```

**Response:**
- **Success:** HTTP 302 redirect to `/auth/saml?account_id={id}&RelayState=web`
- **Error:** HTTP 400/403 with error message

---

## 4. Configuration Steps

### 4.1 Enable Enterprise Edition
1. Ensure Enterprise Edition is installed
2. Enable `saml` feature for the account:
   ```ruby
   account.enable_features('saml')
   ```

### 4.2 Configure SAML Settings (Per Account)

**Via API:**
```http
POST /api/v1/accounts/{account_id}/saml_settings
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "saml_settings": {
    "sso_url": "https://your-idp.com/sso",
    "certificate": "-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----",
    "idp_entity_id": "https://your-idp.com/entity",
    "sp_entity_id": "https://voxe.mcp4.ai/saml/sp/{account_id}",
    "role_mappings": {
      "admins": { "role": "administrator" },
      "agents": { "role": "agent" }
    }
  }
}
```

**Via Dashboard:**
- Navigate to: Settings → Security → SAML Settings
- Enter IdP details
- Upload certificate
- Configure role mappings (optional)

### 4.3 IdP Configuration (On Identity Provider Side)

**Service Provider (SP) Details to Configure in IdP:**
- **Entity ID:** `https://voxe.mcp4.ai/saml/sp/{account_id}`
- **ACS URL (Assertion Consumer Service):** `https://voxe.mcp4.ai/omniauth/saml/callback?account_id={account_id}`
- **Name ID Format:** `urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress`
- **Attributes Required:**
  - `email` (required)
  - `first_name` (optional)
  - `last_name` (optional)
  - `name` (optional)
  - `groups` (optional, for role mapping)

---

## 5. What Needs to Be Done

### 5.1 Immediate Actions Required

1. **Verify Enterprise Edition**
   - [ ] Check if Enterprise Edition is installed
   - [ ] Verify `enterprise/` directory exists
   - [ ] Check if SAML feature is available

2. **Enable SAML Feature for Account**
   ```ruby
   # In Rails console
   account = Account.find_by(name: 'Your Account')
   account.enable_features('saml')
   ```

3. **Configure SAML Settings**
   - [ ] Get SSO URL from Identity Provider
   - [ ] Get X.509 certificate from IdP
   - [ ] Get IdP Entity ID
   - [ ] Configure in VoxeDesk (via API or Dashboard)

4. **Configure Identity Provider**
   - [ ] Add VoxeDesk as Service Provider
   - [ ] Configure SP Entity ID
   - [ ] Configure ACS URL
   - [ ] Map user attributes

### 5.2 Testing Checklist

- [ ] User can initiate SSO login
- [ ] Redirect to IdP works
- [ ] IdP authentication succeeds
- [ ] SAML assertion is received
- [ ] User is created/logged in
- [ ] Role mappings work (if configured)
- [ ] Error handling works for invalid credentials

---

## 6. API Endpoints

### 6.1 Initiate SSO Login
```
POST /api/v1/auth/saml_login
Body: { "email": "user@example.com", "target": "web" }
```

### 6.2 SAML Settings Management
```
GET    /api/v1/accounts/{account_id}/saml_settings
POST   /api/v1/accounts/{account_id}/saml_settings
PUT    /api/v1/accounts/{account_id}/saml_settings
DELETE /api/v1/accounts/{account_id}/saml_settings
```

### 6.3 SAML Authentication Routes
```
GET  /auth/saml?account_id={id}&RelayState={target}
POST /omniauth/saml/callback?account_id={id}
```

---

## 7. Request Format from External System

### 7.1 From voxe.mcp4.ai to Initiate SSO

**Option 1: Direct Redirect (Recommended)**
```html
<!-- Redirect user to this URL -->
<a href="https://voxe.mcp4.ai/api/v1/auth/saml_login?email=user@example.com&target=web">
  Login with SSO
</a>
```

**Option 2: POST Request**
```javascript
fetch('https://voxe.mcp4.ai/api/v1/auth/saml_login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    email: 'user@example.com',
    target: 'web'
  })
})
.then(response => {
  if (response.redirected) {
    window.location.href = response.url; // Redirect to IdP
  }
});
```

**Option 3: Frontend Integration**
```javascript
// In your login page
const initiateSSO = async (email) => {
  const response = await fetch('/api/v1/auth/saml_login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, target: 'web' })
  });
  
  if (response.ok) {
    const data = await response.json();
    window.location.href = data.redirect_url;
  }
};
```

---

## 8. Error Scenarios

### 8.1 Common Errors

1. **"saml-authentication-failed"**
   - User doesn't exist
   - No account with SAML enabled for user
   - SAML settings not configured

2. **"saml.feature_not_enabled"**
   - SAML feature not enabled for account
   - Enterprise Edition not available

3. **"invalid_certificate"**
   - Certificate format is invalid
   - Certificate is not X.509 PEM format

4. **"saml.invalid_email"**
   - Email parameter missing or invalid

---

## 9. Security Considerations

1. **Certificate Validation:** X.509 certificates are validated
2. **Token Expiry:** SSO auth tokens expire after 5 minutes
3. **HTTPS Required:** All SSO communication should use HTTPS
4. **Entity ID Validation:** SP Entity ID must match configured value
5. **Email Matching:** SAML assertion email must match user email

---

## 10. Summary

### ✅ What's Ready:
- SAML SSO code is implemented
- Multi-tenant support (per-account)
- User auto-creation
- Role mapping support
- Error handling

### ⚠️ What Needs Configuration:
1. **Enterprise Edition** must be enabled
2. **SAML feature** must be enabled per account
3. **SAML settings** must be configured (SSO URL, certificate, Entity IDs)
4. **Identity Provider** must be configured with VoxeDesk as SP

### 📋 Request Format from voxe.mcp4.ai:
```http
POST https://voxe.mcp4.ai/api/v1/auth/saml_login
Content-Type: application/json

{
  "email": "user@example.com",
  "target": "web"
}
```

**Response:** Redirects to IdP for authentication, then back to VoxeDesk after successful login.

---

## 11. Next Steps

1. **Verify Enterprise Edition** is installed
2. **Enable SAML feature** for your account(s)
3. **Configure SAML settings** with your IdP details
4. **Configure your IdP** with VoxeDesk SP details
5. **Test the flow** end-to-end
6. **Integrate SSO button** in your login page

---

**Report Generated:** Based on codebase analysis
**Date:** Current
**Status:** SSO is ready but requires Enterprise Edition and configuration


