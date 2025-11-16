# Fix: Logo Still Showing After Rebuild

## The Problem

Even after rebuilding, the old logo shows because:
1. **Rails production caches static files for 1 YEAR** (`config/environments/production.rb`)
2. **Browser cache** - Your browser cached the old logo
3. **Docker build cache** - Old files might still be cached
4. **CDN/Proxy cache** - If using Cloudflare/nginx

---

## Complete Fix (Do All Steps)

### Step 1: Verify Files Are Actually Updated

```bash
# On your production server
cd /opt/voxe  # or your project directory

# Check if files are updated
cat public/brand-assets/logo.svg | head -5
# Should show your Voxe logo, not Chatwoot
```

### Step 2: Rebuild Docker WITHOUT Cache

```bash
# Stop services (keeps database safe)
docker compose -f docker-compose.production.yaml down

# Rebuild WITHOUT cache (critical!)
docker compose -f docker-compose.production.yaml build --no-cache rails

# Start services
docker compose -f docker-compose.production.yaml up -d
```

### Step 3: Verify Files Are in Container

```bash
# Check files inside container
docker compose -f docker-compose.production.yaml exec rails ls -la /app/public/brand-assets/

# View actual file content
docker compose -f docker-compose.production.yaml exec rails head -5 /app/public/brand-assets/logo.svg
# Should show your Voxe logo SVG
```

### Step 4: Clear Rails Asset Cache

```bash
# Clear Rails asset cache
docker compose -f docker-compose.production.yaml exec rails bundle exec rails assets:clobber

# Recompile assets (forces Rails to see new files)
docker compose -f docker-compose.production.yaml exec rails bundle exec rails assets:precompile

# Restart Rails
docker compose -f docker-compose.production.yaml restart rails
```

### Step 5: Add Cache-Busting to Logo URLs (Optional but Recommended)

If logos still don't update, you can add a version parameter to force browsers to reload:

**Edit these files:**
- `app/views/super_admin/devise/sessions/new.html.erb`
- `app/views/installation/onboarding/index.html.erb`

Change:
```erb
<img src="/brand-assets/logo.svg" alt="Chatwoot" ...>
```

To:
```erb
<img src="/brand-assets/logo.svg?v=<%= Time.now.to_i %>" alt="Voxe" ...>
```

Or better, use a version constant:
```erb
<img src="/brand-assets/logo.svg?v=2" alt="Voxe" ...>
```

### Step 6: Clear Browser Cache

**Critical!** Your browser has cached the old logo for 1 year!

1. **Hard Refresh:**
   - Windows: `Ctrl + Shift + R` or `Ctrl + F5`
   - Mac: `Cmd + Shift + R`

2. **Or Clear Cache:**
   - Chrome: Settings → Privacy → Clear browsing data → Cached images
   - Firefox: Settings → Privacy → Clear Data → Cached Web Content

3. **Or Test in Incognito/Private Mode**

### Step 7: Clear CDN/Proxy Cache (If Using)

**If you have Cloudflare:**
- Go to Cloudflare dashboard
- Click "Caching" → "Purge Everything"

**If you have nginx:**
```bash
# Restart nginx
sudo systemctl restart nginx
```

---

## Quick Fix Script (Copy-Paste All)

Run this entire sequence on your production server:

```bash
#!/bin/bash

echo "=== Fixing Logo Cache Issue ==="

# 1. Navigate to project
cd /opt/voxe  # or your directory

# 2. Pull latest code
echo "Pulling latest code..."
git pull origin develop

# 3. Rebuild without cache
echo "Rebuilding Docker image without cache..."
docker compose -f docker-compose.production.yaml build --no-cache rails

# 4. Restart services
echo "Restarting services..."
docker compose -f docker-compose.production.yaml up -d

# 5. Wait for services to start
echo "Waiting for services..."
sleep 10

# 6. Verify files in container
echo "Verifying logo files in container..."
docker compose -f docker-compose.production.yaml exec rails ls -la /app/public/brand-assets/

# 7. Clear Rails asset cache
echo "Clearing Rails asset cache..."
docker compose -f docker-compose.production.yaml exec rails bundle exec rails assets:clobber
docker compose -f docker-compose.production.yaml exec rails bundle exec rails assets:precompile

# 8. Restart Rails
echo "Restarting Rails..."
docker compose -f docker-compose.production.yaml restart rails

# 9. Verify logo config
echo "Checking logo configuration..."
docker compose -f docker-compose.production.yaml exec rails bundle exec rails console <<EOF
GlobalConfig.get('LOGO', 'LOGO_DARK', 'LOGO_THUMBNAIL')
exit
EOF

echo ""
echo "=== Done! ==="
echo "Now clear your browser cache (Ctrl+Shift+R) and test!"
```

---

## Alternative: Force Cache Refresh with Version Parameter

If the above doesn't work, add a version parameter to logo URLs to force browsers to reload:

### Edit Login Page

**File:** `app/views/super_admin/devise/sessions/new.html.erb`

Change lines 12-13:
```erb
<img src="/brand-assets/logo.svg" alt="Chatwoot" class="mx-auto h-8 w-auto block dark:hidden">
<img src="/brand-assets/logo_dark.svg" alt="Chatwoot" class="mx-auto h-8 w-auto hidden dark:block">
```

To:
```erb
<img src="/brand-assets/logo.svg?v=2" alt="Voxe" class="mx-auto h-8 w-auto block dark:hidden">
<img src="/brand-assets/logo_dark.svg?v=2" alt="Voxe" class="mx-auto h-8 w-auto hidden dark:block">
```

### Edit Onboarding Page

**File:** `app/views/installation/onboarding/index.html.erb`

Change lines 12-13 the same way.

Then rebuild:
```bash
docker compose -f docker-compose.production.yaml build --no-cache rails
docker compose -f docker-compose.production.yaml up -d rails
```

---

## Why This Happens

Rails production environment (`config/environments/production.rb`) sets:
```ruby
config.public_file_server.headers = {
  'Cache-Control' => "public, max-age=#{1.year.to_i}"
}
```

This tells browsers to cache static files (including logos) for **1 year**! That's why you see the old logo even after updating files.

---

## Summary

1. ✅ Rebuild with `--no-cache`
2. ✅ Clear Rails asset cache
3. ✅ **Clear browser cache** (most important!)
4. ✅ Clear CDN cache (if using)
5. ✅ Add version parameter to logo URLs (if still not working)

The browser cache is usually the culprit! Always do a hard refresh after updating logos.

