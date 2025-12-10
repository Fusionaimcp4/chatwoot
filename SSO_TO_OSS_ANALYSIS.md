# Moving SSO from Enterprise to Open Source - Analysis

## Short Answer

**YES, it's technically possible** to move SSO from Enterprise to Open Source, but it requires several steps and modifications.

---

## Technical Feasibility

### ✅ What Works:
1. **No Hard Enterprise Dependencies**: The SSO code itself doesn't directly depend on Enterprise-only modules
2. **Standard Libraries**: Uses OmniAuth and standard Rails patterns
3. **Self-Contained**: Most SSO logic is isolated in its own files

### ⚠️ What Needs Changes:
1. **Feature Flag Checks**: Code checks `account.feature_enabled?('saml')` - this needs to be removed or modified
2. **File Locations**: Files are in `enterprise/` directory - need to move to `app/`
3. **Routes**: Routes may need to be moved from enterprise routes to main routes
4. **Initializers**: SAML initializer is in `enterprise/config/` - needs to move to `config/`
5. **Database Migration**: Migration exists but may need to be verified

---

## Files That Need to Be Moved

### Backend Files:
1. `enterprise/app/models/account_saml_settings.rb` → `app/models/account_saml_settings.rb`
2. `enterprise/app/controllers/api/v1/auth_controller.rb` → `app/controllers/api/v1/auth_controller.rb`
3. `enterprise/app/controllers/api/v1/accounts/saml_settings_controller.rb` → `app/controllers/api/v1/accounts/saml_settings_controller.rb`
4. `enterprise/app/builders/saml_user_builder.rb` → `app/builders/saml_user_builder.rb`
5. `enterprise/app/policies/account_saml_settings_policy.rb` → `app/policies/account_saml_settings_policy.rb`
6. `enterprise/app/helpers/saml_authentication_helper.rb` → `app/helpers/saml_authentication_helper.rb`
7. `enterprise/app/controllers/enterprise/devise_overrides/omniauth_callbacks_controller.rb` → `app/controllers/devise_overrides/omniauth_callbacks_controller.rb` (merge with existing)

### Configuration Files:
1. `enterprise/config/initializers/omniauth_saml.rb` → `config/initializers/omniauth_saml.rb`

### Database:
1. `db/migrate/20250825070005_create_account_saml_settings.rb` - Already exists, verify it's run

### Frontend Files (if any):
- Check `app/javascript/` for SAML-related Vue components
- May need to remove Enterprise feature checks

---

## Code Changes Required

### 1. Remove Feature Flag Checks

**In Controllers:**
```ruby
# REMOVE THIS:
def check_saml_feature_enabled
  return if Current.account.feature_enabled?('saml')
  render json: { error: I18n.t('errors.saml.feature_not_enabled') }, status: :forbidden
end

# REPLACE WITH:
# Either remove the check entirely, or make it always return true
```

**In Auth Controller:**
```ruby
# REMOVE THIS:
.find { |account_user| account_user.account.feature_enabled?('saml') }

# REPLACE WITH:
.find { |account_user| account_user.account.saml_settings.present? }
```

### 2. Update Routes

**Current:** Routes may be in enterprise routes
**Action:** Ensure routes are in main `config/routes.rb`:
```ruby
# Should already exist:
post 'auth/saml_login', to: 'auth#saml_login'
resource :saml_settings, only: [:show, :create, :update, :destroy]
```

### 3. Update Initializer

**File:** `config/initializers/omniauth_saml.rb`
- Move from `enterprise/config/initializers/`
- Ensure OmniAuth SAML gem is in Gemfile

### 4. Update Policies

**File:** `app/policies/account_saml_settings_policy.rb`
- Move from enterprise
- May need to adjust authorization logic

### 5. Merge Devise Overrides

**File:** `app/controllers/devise_overrides/omniauth_callbacks_controller.rb`
- Merge SAML handling from enterprise version
- Ensure it doesn't conflict with existing OAuth providers

---

## Dependencies to Verify

### Gems Required:
1. **omniauth-saml** - Check if it's in Gemfile
2. **ruby-saml** - May be a dependency of omniauth-saml

### Check Gemfile:
```bash
grep -i saml Gemfile
grep -i omniauth Gemfile
```

---

## Steps to Move SSO to OSS

### Step 1: Verify Dependencies
- [ ] Check if `omniauth-saml` gem is available
- [ ] Verify database migration has run
- [ ] Check if routes are accessible

### Step 2: Move Files
- [ ] Copy all SSO files from `enterprise/` to `app/`
- [ ] Move initializer to `config/initializers/`
- [ ] Update any file paths/references

### Step 3: Remove Feature Checks
- [ ] Remove `feature_enabled?('saml')` checks
- [ ] Replace with direct SAML settings checks
- [ ] Update authorization logic

### Step 4: Update Routes
- [ ] Verify routes are in main routes file
- [ ] Test route accessibility

### Step 5: Test
- [ ] Test SAML login flow
- [ ] Test SAML settings configuration
- [ ] Test error handling

---

## Potential Issues

### 1. Feature Flag System
- The `feature_enabled?` method is part of the Featurable concern
- You may need to either:
  - Remove the check entirely (always allow SAML)
  - Or modify the check to always return true for SAML

### 2. Authorization
- Enterprise may have different authorization rules
- May need to adjust policies for OSS

### 3. UI Components
- Frontend may have Enterprise-specific UI
- May need to remove paywalls/upgrade prompts

### 4. Database
- Migration should already exist
- Verify `account_saml_settings` table exists

---

## Recommendation

**YES, you can do it**, but:

1. **It's a manual process** - No automated tool
2. **Requires code changes** - Remove feature flag checks
3. **Testing required** - Need to test the full flow
4. **Maintenance** - You'll need to maintain the code yourself

**Alternative Approach:**
- Keep Enterprise directory but remove feature flag enforcement
- Modify `feature_enabled?` to always return true for 'saml'
- Less file moving, but still requires code changes

---

## Summary

**Can you move SSO to OSS?** ✅ **YES**

**Is it simple?** ⚠️ **NO** - Requires:
- Moving multiple files
- Removing feature flag checks  
- Updating routes/initializers
- Testing thoroughly

**Estimated Effort:** 2-4 hours of careful work + testing

**Risk Level:** Medium - Core authentication code, needs thorough testing

---

**Note:** This is a self-hosted installation, so you have full control. The main challenge is ensuring all the pieces work together without the Enterprise feature flag system.


