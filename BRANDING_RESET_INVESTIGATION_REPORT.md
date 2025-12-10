# Branding Reset Investigation Report

## Executive Summary

**Root Cause Identified**: The application's branding resets every 24 hours due to a scheduled background job that runs daily at 12:00 (noon) UTC. This job reconciles premium configuration settings and overwrites custom branding values with default "Chatwoot" values from the Enterprise edition's premium configuration file.

**Primary Culprit**: `Internal::CheckNewVersionsJob` → `Internal::ReconcilePlanConfigService` → Premium config reconciliation

**Frequency**: Daily at 12:00 UTC (configurable via `config/schedule.yml`)

---

## 1. Source of Truth for Branding

### Database (Primary Source)
- **Table**: `installation_configs`
- **Model**: `InstallationConfig` (`app/models/installation_config.rb`)
- **Storage**: PostgreSQL database with JSONB serialization
- **Key Fields**:
  - `name` (string, unique) - e.g., 'INSTALLATION_NAME', 'BRAND_NAME'
  - `serialized_value` (jsonb) - Contains the actual value
  - `locked` (boolean) - Whether config can be edited via UI

### Configuration Files (Secondary Source - Used for Initialization)
1. **OSS Config**: `config/installation_config.yml`
   - Contains default values for all installation configs
   - Currently has "VoxeDesk" branding values
   - Used by `ConfigLoader` to initialize missing configs

2. **Enterprise Premium Config**: `enterprise/config/premium_installation_config.yml`
   - Contains "Chatwoot" default values for branding
   - Used by `ReconcilePlanConfigService` to reset configs on community plans
   - **THIS IS THE PROBLEM SOURCE**

### Branding Assets (Filesystem)
- **Location**: `public/brand-assets/`
  - `logo.svg`
  - `logo_dark.svg`
  - `logo_thumbnail.svg`
- **Storage**: Persistent Docker volumes (not affected by resets)

---

## 2. Root Cause Analysis

### The 24-Hour Reset Cycle

#### Step 1: Scheduled Job Execution
**File**: `config/schedule.yml` (Line 5-9)
```yaml
internal_check_new_versions_job:
  cron: '0 12 */1 * *'  # Executes at 12:00 UTC every day
  class: 'Internal::CheckNewVersionsJob'
  queue: scheduled_jobs
```

**Job**: `app/jobs/internal/check_new_versions_job.rb`
- Runs daily at 12:00 UTC
- Checks for new Chatwoot versions
- Calls Enterprise extension (if Enterprise edition is present)

#### Step 2: Enterprise Extension
**File**: `enterprise/app/jobs/enterprise/internal/check_new_versions_job.rb`
- Extends the base `CheckNewVersionsJob`
- Calls `reconcile_premium_config_and_features` method
- This invokes `Internal::ReconcilePlanConfigService.new.perform`

#### Step 3: Premium Config Reconciliation
**File**: `enterprise/app/services/internal/reconcile_plan_config_service.rb`

**Critical Logic** (Lines 1-10):
```ruby
def perform
  remove_premium_config_reset_warning
  return if ChatwootHub.pricing_plan != 'community'  # Only runs on community plan
  
  create_premium_config_reset_warning if premium_config_reset_required?
  
  reconcile_premium_config  # THIS RESETS BRANDING
  reconcile_premium_features
end
```

**The Reset Logic** (Lines 38-45):
```ruby
def reconcile_premium_config
  premium_config.each do |config|
    new_config = config.with_indifferent_access
    existing_config = InstallationConfig.find_by(name: new_config[:name])
    next if existing_config&.value == new_config[:value]
    
    existing_config&.update!(value: new_config[:value])  # OVERWRITES CUSTOM VALUES
  end
end
```

**Premium Config Source** (Lines 18-20):
```ruby
def premium_config
  @premium_config ||= YAML.safe_load(File.read("#{config_path}/premium_installation_config.yml")).freeze
end
```

#### Step 4: The Premium Config File
**File**: `enterprise/config/premium_installation_config.yml`

Contains default "Chatwoot" branding values:
- `INSTALLATION_NAME: 'Chatwoot'`
- `BRAND_NAME: 'Chatwoot'`
- `BRAND_URL: 'https://www.chatwoot.com'`
- `WIDGET_BRAND_URL: 'https://www.chatwoot.com'`
- `TERMS_URL: 'https://www.chatwoot.com/terms-of-service'`
- `PRIVACY_URL: 'https://www.chatwoot.com/privacy-policy'`
- `DISPLAY_MANIFEST: true`

**Result**: Every day at 12:00 UTC, if the installation is on a "community" plan, these values overwrite any custom branding in the database.

---

## 3. Other Potential Reset Triggers (Investigated)

### A. Database Migrations
**File**: `lib/tasks/db_enhancements.rake` (Lines 1-7)
- `ConfigLoader` runs after every `db:migrate`
- **Impact**: LOW - Only runs when migrations are executed
- **Behavior**: Uses `reconcile_only_new: true` by default, so it won't overwrite existing configs
- **Not the cause** of daily resets

### B. Database Seeds
**File**: `db/seeds.rb` (Lines 1-3)
- Calls `ConfigLoader.new.process` on seed
- **Impact**: LOW - Only runs when `rake db:seed` is executed
- **Behavior**: Uses `reconcile_only_new: true` by default
- **Not the cause** of daily resets

### C. Container Restarts
**File**: `docker/entrypoints/rails.sh`
- Entrypoint script does NOT call ConfigLoader
- Only waits for database and runs bundle install
- **Impact**: NONE - No branding reset on container restart
- **Not the cause** of daily resets

### D. Docker Build Process
**File**: `docker/Dockerfile`
- Build process does NOT touch database or configs
- Only compiles assets and installs dependencies
- **Impact**: NONE - No branding reset on rebuild
- **Not the cause** of daily resets

### E. Other Scheduled Jobs
**File**: `config/schedule.yml`
- Reviewed all scheduled jobs:
  - `trigger_scheduled_items_job` - Every 5 minutes (conversations, campaigns)
  - `trigger_imap_email_inboxes_job` - Every minute (email fetching)
  - `remove_stale_contact_inboxes_job` - Daily at 22:30 UTC (cleanup)
  - `remove_stale_redis_keys_job` - Daily at 22:30 UTC (cleanup)
  - `process_stale_contacts_job` - Daily at 04:30 UTC (cleanup)
  - `delete_accounts_job` - Daily at 01:00 UTC (account deletion)
  - `bulk_auto_assignment_job` - Every 15 minutes (conversation assignment)
- **None of these jobs touch branding configuration**
- **Not the cause** of daily resets

---

## 4. Why It Happens Every 24 Hours

The timing aligns with the scheduled job:
- **Schedule**: `'0 12 */1 * *'` = 12:00 UTC every day
- **Execution**: Job runs → Calls ReconcilePlanConfigService → Resets branding
- **User Experience**: Branding appears to reset "every 24 hours" because the job runs once per day

**Note**: The exact time depends on your timezone. If you're in a timezone ahead of UTC, you might notice the reset earlier in your day. If you're behind UTC, it might appear later.

---

## 5. Files Responsible for the Reset

### Primary Files
1. **`config/schedule.yml`** (Line 5-9)
   - Defines the daily cron schedule

2. **`app/jobs/internal/check_new_versions_job.rb`**
   - Base job that runs daily

3. **`enterprise/app/jobs/enterprise/internal/check_new_versions_job.rb`**
   - Enterprise extension that adds config reconciliation

4. **`enterprise/app/services/internal/reconcile_plan_config_service.rb`**
   - Service that performs the actual reset

5. **`enterprise/config/premium_installation_config.yml`**
   - Contains the default "Chatwoot" values that overwrite custom branding

### Supporting Files
- **`config/initializers/sidekiq.rb`** (Lines 35-37)
  - Loads the schedule.yml and registers cron jobs
- **`app/models/installation_config.rb`**
  - Model that stores branding configuration
- **`lib/global_config.rb`**
  - Caches configuration values (cleared after updates)

---

## 6. Why This Design Exists

The `ReconcilePlanConfigService` is designed to:
1. **Enforce Premium Plan Restrictions**: Reset premium features/configs to defaults on community plans
2. **Prevent Feature Theft**: Ensure community installations don't use premium features
3. **Maintain Branding Control**: Keep default Chatwoot branding on community installations

**However**, this design assumes that:
- Community installations should always show "Chatwoot" branding
- Custom branding is a premium feature
- Daily reconciliation is acceptable

**For self-hosted installations with custom branding**, this behavior is problematic.

---

## 7. Structural Issues Identified

### Issue 1: No Exclusion for Custom Branding
The `reconcile_premium_config` method doesn't check if a config is:
- User-modified (vs. system-default)
- Locked/unlocked status
- Part of a custom branding setup

### Issue 2: Hardcoded Premium Config Source
The service always reads from `enterprise/config/premium_installation_config.yml` without considering:
- User's custom branding preferences
- Installation-specific overrides
- Environment-specific configurations

### Issue 3: No Opt-Out Mechanism
There's no way to disable premium config reconciliation for specific configs or globally.

### Issue 4: Timing Not Configurable
The daily reset happens at a fixed time (12:00 UTC) with no way to change it without modifying the schedule file.

---

## 8. Recommendations for Making Branding Permanent

### Immediate Solutions (No Code Changes Required)

#### Option A: Disable the Scheduled Job (Quick Fix)
**Action**: Comment out or remove the job from `config/schedule.yml`
```yaml
# internal_check_new_versions_job:
#   cron: '0 12 */1 * *'
#   class: 'Internal::CheckNewVersionsJob'
#   queue: scheduled_jobs
```
**Pros**: Immediate fix, no code changes
**Cons**: Loses version checking functionality

#### Option B: Update Premium Config File
**Action**: Modify `enterprise/config/premium_installation_config.yml` to match your branding
- Change all "Chatwoot" values to "VoxeDesk"
- Change all URLs to your domain
**Pros**: Keeps version checking, fixes branding
**Cons**: File may be overwritten on code updates

#### Option C: Set Pricing Plan to Non-Community
**Action**: Ensure `ChatwootHub.pricing_plan` returns something other than `'community'`
**Pros**: Disables reconciliation entirely
**Cons**: May require Enterprise edition or custom configuration

### Long-Term Solutions (Requires Code Changes)

#### Option D: Exclude Branding Configs from Reconciliation
**Modify**: `enterprise/app/services/internal/reconcile_plan_config_service.rb`
- Add a whitelist/blacklist of configs to exclude
- Skip branding-related configs during reconciliation

#### Option E: Add User Override Flag
**Modify**: `InstallationConfig` model and reconciliation service
- Add `user_modified` or `custom_branding` flag
- Skip reconciliation for user-modified configs

#### Option F: Make Reconciliation Configurable
**Modify**: Add environment variable or installation config
- `DISABLE_PREMIUM_CONFIG_RECONCILIATION=true`
- `EXCLUDE_BRANDING_FROM_RECONCILIATION=true`

#### Option G: Change Reconciliation Frequency
**Modify**: `config/schedule.yml`
- Change cron to run less frequently (weekly, monthly)
- Or remove the reconciliation call from the version check job

---

## 9. Specific Non-Code Recommendations

### Recommendation 1: Immediate Workaround
**Priority**: HIGH
**Action**: Update `enterprise/config/premium_installation_config.yml` with your branding values
**Steps**:
1. Edit `enterprise/config/premium_installation_config.yml`
2. Replace all "Chatwoot" values with "VoxeDesk"
3. Replace all URLs with your domain
4. Commit and deploy
5. Run `rake voxe:update_branding` to sync database
**Risk**: File may be overwritten on upstream updates

### Recommendation 2: Disable Version Check Job
**Priority**: MEDIUM
**Action**: Comment out the job in `config/schedule.yml`
**Steps**:
1. Edit `config/schedule.yml`
2. Comment out `internal_check_new_versions_job` section
3. Restart Sidekiq to reload schedule
**Risk**: Lose automatic version checking (can check manually)

### Recommendation 3: Create Custom Reconciliation Exclusion
**Priority**: MEDIUM
**Action**: Create a custom rake task that runs after reconciliation to restore branding
**Steps**:
1. Create a new scheduled job that runs after the version check
2. Job restores branding values from a custom config file
3. Schedule it to run at 12:05 UTC (5 minutes after reset)
**Risk**: Temporary reset still occurs, but gets fixed quickly

### Recommendation 4: Fork and Modify Enterprise Code
**Priority**: LOW (if other options don't work)
**Action**: Modify `enterprise/app/services/internal/reconcile_plan_config_service.rb`
**Steps**:
1. Add branding configs to exclusion list
2. Or add check for custom branding flag
3. Test thoroughly
**Risk**: Requires maintaining custom fork

### Recommendation 5: Monitor and Alert
**Priority**: LOW
**Action**: Set up monitoring to detect branding resets
**Steps**:
1. Create a monitoring job that checks branding values
2. Alert if values change unexpectedly
3. Auto-restore if reset detected
**Risk**: Reactive, not preventive

---

## 10. Verification Steps

To confirm this is the issue:

1. **Check Current Branding**:
   ```bash
   docker compose -f docker-compose.production.yaml exec rails bundle exec rails console
   InstallationConfig.where(name: ['INSTALLATION_NAME', 'BRAND_NAME']).pluck(:name, :value)
   ```

2. **Check Sidekiq Schedule**:
   ```bash
   docker compose -f docker-compose.production.yaml exec sidekiq bundle exec rails console
   Sidekiq::Cron::Job.all.map { |j| [j.name, j.cron] }
   ```

3. **Check Last Execution**:
   - Review Sidekiq logs around 12:00 UTC
   - Look for `Internal::CheckNewVersionsJob` execution
   - Look for `ReconcilePlanConfigService` calls

4. **Monitor Tomorrow**:
   - Check branding values before 12:00 UTC
   - Check again after 12:00 UTC
   - Compare values to confirm reset

---

## 11. Summary

### Root Cause
The branding resets every 24 hours because:
1. A scheduled job (`Internal::CheckNewVersionsJob`) runs daily at 12:00 UTC
2. This job calls `ReconcilePlanConfigService` (Enterprise edition)
3. The service resets premium configs to defaults for "community" plans
4. The premium config file contains "Chatwoot" branding values
5. These values overwrite your custom "VoxeDesk" branding in the database

### Responsible Files
- `config/schedule.yml` - Defines the schedule
- `enterprise/app/services/internal/reconcile_plan_config_service.rb` - Performs the reset
- `enterprise/config/premium_installation_config.yml` - Contains default values

### Quick Fix
Update `enterprise/config/premium_installation_config.yml` with your branding values, or disable the scheduled job.

### Long-Term Fix
Modify the reconciliation service to exclude branding configs, or add a mechanism to prevent reset of user-customized values.

---

## 12. Additional Notes

- **Database Persistence**: The branding is stored in the database, which persists across container restarts
- **Volume Persistence**: Docker volumes are correctly configured and not causing resets
- **Build Process**: Docker build does not affect branding
- **Migration Process**: Migrations don't reset branding (uses `reconcile_only_new: true`)
- **Seed Process**: Seeds don't reset branding (uses `reconcile_only_new: true`)

The issue is **solely** caused by the scheduled job reconciliation process.

---

**Report Generated**: Based on codebase analysis
**Investigation Date**: Current
**Status**: Root cause identified and documented

