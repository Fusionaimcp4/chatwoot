# Fix Production Branding Issue

## Problem
When deploying to production using `docker-compose.production.yaml`, the branding still shows "Chatwoot" instead of "Voxe" even though `config/installation_config.yml` has been updated.

## Root Cause
The `ConfigLoader` class has a `reconcile_only_new: true` flag by default. This means:
- ✅ It creates missing configs from YAML
- ❌ It does NOT update existing configs in the database

If your production database already has "Chatwoot" values, they won't be overwritten by the YAML file.

## Solution Options

### Option 1: Update via Rails Console (Quick Fix)

SSH into your server and run:

```bash
# Enter Rails console
docker compose -f docker-compose.production.yaml exec rails bundle exec rails console

# Update branding configs
InstallationConfig.find_by(name: 'INSTALLATION_NAME')&.update!(value: 'Voxe')
InstallationConfig.find_by(name: 'BRAND_NAME')&.update!(value: 'Voxe')
InstallationConfig.find_by(name: 'BRAND_URL')&.update!(value: 'https://voxe.mcp4.ai')
InstallationConfig.find_by(name: 'WIDGET_BRAND_URL')&.update!(value: 'https://voxe.mcp4.ai')
InstallationConfig.find_by(name: 'TERMS_URL')&.update!(value: 'https://voxe.mcp4.ai/terms-of-service')
InstallationConfig.find_by(name: 'PRIVACY_URL')&.update!(value: 'https://voxe.mcp4.ai/privacy-policy')
InstallationConfig.find_by(name: 'DISPLAY_MANIFEST')&.update!(value: false)

# Clear cache
GlobalConfig.clear_cache

# Exit console
exit
```

### Option 2: Force Update via ConfigLoader (Recommended)

Create a rake task or run this in Rails console:

```bash
docker compose -f docker-compose.production.yaml exec rails bundle exec rails console

# Force update all configs from YAML
ConfigLoader.new.process(reconcile_only_new: false)
GlobalConfig.clear_cache

exit
```

### Option 3: Update via Super Admin Panel

1. Access Super Admin: `https://your-domain/super_admin`
2. Navigate to Installation Configs
3. Manually update each branding config:
   - INSTALLATION_NAME → Voxe
   - BRAND_NAME → Voxe
   - BRAND_URL → https://voxe.mcp4.ai
   - etc.

### Option 4: Create a Rake Task (Best for Automation)

Create `lib/tasks/branding.rake`:

```ruby
namespace :voxe do
  desc 'Update branding to Voxe'
  task update_branding: :environment do
    branding_configs = {
      'INSTALLATION_NAME' => 'Voxe',
      'BRAND_NAME' => 'Voxe',
      'BRAND_URL' => 'https://voxe.mcp4.ai',
      'WIDGET_BRAND_URL' => 'https://voxe.mcp4.ai',
      'TERMS_URL' => 'https://voxe.mcp4.ai/terms-of-service',
      'PRIVACY_URL' => 'https://voxe.mcp4.ai/privacy-policy',
      'DISPLAY_MANIFEST' => false
    }

    branding_configs.each do |name, value|
      config = InstallationConfig.find_by(name: name)
      if config
        config.update!(value: value)
        puts "Updated #{name} = #{value}"
      else
        InstallationConfig.create!(name: name, value: value, locked: true)
        puts "Created #{name} = #{value}"
      end
    end

    GlobalConfig.clear_cache
    puts "Branding updated! Cache cleared."
  end
end
```

Then run:
```bash
docker compose -f docker-compose.production.yaml exec rails bundle exec rake voxe:update_branding
```

---

## Verification

After updating, verify the changes:

```bash
docker compose -f docker-compose.production.yaml exec rails bundle exec rails console

# Check values
puts InstallationConfig.find_by(name: 'INSTALLATION_NAME')&.value
puts InstallationConfig.find_by(name: 'BRAND_NAME')&.value
puts GlobalConfig.get('INSTALLATION_NAME', 'BRAND_NAME')

exit
```

Then restart the Rails container:
```bash
docker compose -f docker-compose.production.yaml restart rails
```

---

## Why This Happens

1. **First Deployment:** ConfigLoader creates configs from YAML → Works fine
2. **Subsequent Deployments:** ConfigLoader sees existing configs → Doesn't update them (reconcile_only_new: true)
3. **Result:** Database keeps old "Chatwoot" values

---

## Prevention

After updating branding, the values will persist in the database. Future deployments won't overwrite them unless you:
- Use `reconcile_only_new: false`
- Manually update via console/rake task
- Update via Super Admin panel

