# Exact Steps to Fix Production Branding

## Step-by-Step Instructions

### Step 1: Commit and Push Changes to GitHub

On your local machine:

```bash
# Check what files need to be committed
git status

# Add the new files
git add lib/tasks/branding.rake
git add FIX_PRODUCTION_BRANDING.md
git add EMAIL_CHATWOOT_REFERENCES.md
git add EMAIL_CONFIGURATION.md

# Commit
git commit -m "Add branding fix rake task and documentation"

# Push to GitHub
git push origin develop
```

---

### Step 2: Pull Changes on Production Server

SSH into your production server:

```bash
# Navigate to your project directory
cd /opt/voxe  # or wherever you deployed the code

# Pull latest changes
git pull origin develop

# Verify the new files are there
ls -la lib/tasks/branding.rake
ls -la FIX_PRODUCTION_BRANDING.md
```

---

### Step 3: Rebuild Docker Containers (if needed)

If you made code changes, rebuild:

```bash
# Rebuild containers with new code
docker compose -f docker-compose.production.yaml build rails

# Restart containers
docker compose -f docker-compose.production.yaml up -d
```

---

### Step 4: Run the Branding Fix

**This is the key step that fixes the branding:**

```bash
# Run the rake task to update branding in database
docker compose -f docker-compose.production.yaml exec rails bundle exec rake voxe:update_branding
```

Expected output:
```
Updating branding to Voxe...
  ✓ Updated INSTALLATION_NAME: 'Chatwoot' → 'Voxe'
  ✓ Updated BRAND_NAME: 'Chatwoot' → 'Voxe'
  ✓ Updated BRAND_URL: 'https://www.chatwoot.com' → 'https://voxe.mcp4.ai'
  ...

✅ Branding updated successfully! Cache cleared.
```

---

### Step 5: Restart Rails Container

```bash
# Restart to apply changes
docker compose -f docker-compose.production.yaml restart rails

# Wait a few seconds for it to start
sleep 5

# Check if it's running
docker compose -f docker-compose.production.yaml ps rails
```

---

### Step 6: Verify the Fix

```bash
# Verify branding values
docker compose -f docker-compose.production.yaml exec rails bundle exec rake voxe:verify_branding
```

You should see:
```
Current Branding Configuration:
==================================================
✓ INSTALLATION_NAME: Voxe
✓ BRAND_NAME: Voxe
✓ BRAND_URL: https://voxe.mcp4.ai
...
```

---

### Step 7: Test in Browser

1. Open your production URL: `https://voxe.mcp4.ai`
2. Check:
   - Browser tab title shows "Voxe"
   - Login page shows Voxe logo
   - Dashboard shows "Voxe" branding
   - Emails show Voxe branding

---

## Complete Command Sequence (Copy-Paste Ready)

```bash
# On Production Server - Run all these commands:

# 1. Pull latest code
cd /opt/voxe
git pull origin develop

# 2. Rebuild if needed (only if code changed)
docker compose -f docker-compose.production.yaml build rails
docker compose -f docker-compose.production.yaml up -d

# 3. Fix branding
docker compose -f docker-compose.production.yaml exec rails bundle exec rake voxe:update_branding

# 4. Restart
docker compose -f docker-compose.production.yaml restart rails

# 5. Verify
docker compose -f docker-compose.production.yaml exec rails bundle exec rake voxe:verify_branding

# 6. Check logs if needed
docker compose -f docker-compose.production.yaml logs rails --tail=50
```

---

## Troubleshooting

### If rake task not found:
```bash
# Make sure you're in the right directory and code is pulled
cd /opt/voxe
git pull origin develop
ls -la lib/tasks/branding.rake  # Should exist
```

### If database connection error:
```bash
# Check if database is running
docker compose -f docker-compose.production.yaml ps postgres

# Check database connection
docker compose -f docker-compose.production.yaml exec rails bundle exec rails db:migrate:status
```

### If changes don't appear:
```bash
# Clear cache manually
docker compose -f docker-compose.production.yaml exec rails bundle exec rails console
# In console:
GlobalConfig.clear_cache
exit

# Restart all services
docker compose -f docker-compose.production.yaml restart
```

---

## Summary

1. ✅ Push `branding.rake` to GitHub
2. ✅ Pull on server
3. ✅ Run `rake voxe:update_branding`
4. ✅ Restart Rails container
5. ✅ Verify and test

That's it! The branding will be updated in the database and will persist.

