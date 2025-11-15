# Fix: Logo Still Showing Chatwoot After Update

## Problem
You updated the logo files in `public/brand-assets/` but they still show Chatwoot on production.

## Root Causes
1. **Docker build cache** - Docker is using cached old logo files
2. **Browser cache** - Your browser cached the old logo
3. **Widget logo** - There's a separate widget logo that might need updating

---

## Solution Steps

### Step 1: Verify Logo Files Are Updated Locally

Check that your logo files are actually updated:

```bash
# On your local machine
ls -la public/brand-assets/
# Should show your Voxe logos
```

### Step 2: Commit and Push Logo Changes

```bash
# Add logo files
git add public/brand-assets/logo.svg
git add public/brand-assets/logo_dark.svg
git add public/brand-assets/logo_thumbnail.svg

# Commit
git commit -m "Update branding logos to Voxe"

# Push
git push origin develop
```

### Step 3: On Production Server - Pull Latest Code

```bash
cd /opt/voxe  # or your project directory
git pull origin develop
```

### Step 4: Rebuild Docker Image WITHOUT Cache

**This is the key step!** Docker caches the `public/` folder, so you need to rebuild without cache:

```bash
# Stop containers
docker compose -f docker-compose.production.yaml down

# Rebuild WITHOUT cache (this forces Docker to use new logo files)
docker compose -f docker-compose.production.yaml build --no-cache rails

# Start containers
docker compose -f docker-compose.production.yaml up -d
```

**Alternative (faster but less thorough):**
```bash
# Just rebuild the rails service without cache
docker compose -f docker-compose.production.yaml build --no-cache rails
docker compose -f docker-compose.production.yaml up -d rails
```

### Step 5: Verify Logos Are in Container

```bash
# Check if new logos are in the container
docker compose -f docker-compose.production.yaml exec rails ls -la /app/public/brand-assets/

# You should see your Voxe logo files
```

### Step 6: Clear Browser Cache

**Important:** Your browser might be caching the old logo!

1. **Hard refresh:**
   - Chrome/Edge: `Ctrl + Shift + R` (Windows) or `Cmd + Shift + R` (Mac)
   - Firefox: `Ctrl + F5` (Windows) or `Cmd + Shift + R` (Mac)

2. **Or clear cache completely:**
   - Open DevTools (F12)
   - Right-click the refresh button
   - Select "Empty Cache and Hard Reload"

3. **Or use incognito/private mode** to test without cache

### Step 7: Verify Logo URLs

Check that the logo URLs are correct:

```bash
# Check what logo URLs are configured
docker compose -f docker-compose.production.yaml exec rails bundle exec rails console

# In Rails console:
GlobalConfig.get('LOGO', 'LOGO_DARK', 'LOGO_THUMBNAIL')
# Should show: "/brand-assets/logo.svg", etc.

exit
```

---

## Additional: Widget Logo (if needed)

If the **chat widget bubble** still shows Chatwoot logo, you might also need to update:

```bash
# Check widget logo
ls -la app/javascript/widget/assets/images/logo.svg

# If this file exists and shows Chatwoot, update it too
```

Then rebuild:
```bash
docker compose -f docker-compose.production.yaml build --no-cache rails
docker compose -f docker-compose.production.yaml up -d rails
```

---

## Quick Fix Command Sequence

Copy-paste this entire sequence on your production server:

```bash
# 1. Pull latest code
cd /opt/voxe
git pull origin develop

# 2. Rebuild without cache
docker compose -f docker-compose.production.yaml build --no-cache rails

# 3. Restart
docker compose -f docker-compose.production.yaml up -d rails

# 4. Wait a moment
sleep 5

# 5. Verify logos are in container
docker compose -f docker-compose.production.yaml exec rails ls -la /app/public/brand-assets/

# 6. Check logo config
docker compose -f docker-compose.production.yaml exec rails bundle exec rails console
# Then run: GlobalConfig.get('LOGO', 'LOGO_DARK', 'LOGO_THUMBNAIL')
# Type: exit
```

---

## Troubleshooting

### If logos still don't update:

1. **Check file permissions:**
```bash
docker compose -f docker-compose.production.yaml exec rails ls -la /app/public/brand-assets/
# Files should be readable
```

2. **Check if files are actually different:**
```bash
# View the logo file content
docker compose -f docker-compose.production.yaml exec rails cat /app/public/brand-assets/logo.svg | head -20
# Should show your Voxe logo SVG, not Chatwoot
```

3. **Force clear Rails asset cache:**
```bash
docker compose -f docker-compose.production.yaml exec rails bundle exec rails assets:clobber
docker compose -f docker-compose.production.yaml exec rails bundle exec rails assets:precompile
docker compose -f docker-compose.production.yaml restart rails
```

4. **Check nginx/CDN cache (if using):**
   - If you have Cloudflare or nginx in front, clear their cache too
   - Cloudflare: Purge cache in dashboard
   - Nginx: Restart nginx service

---

## Summary

The main issue is **Docker build cache**. The solution is:
1. ✅ Update logo files locally
2. ✅ Push to GitHub
3. ✅ Pull on server
4. ✅ **Rebuild Docker image with `--no-cache`** ← This is critical!
5. ✅ Clear browser cache
6. ✅ Test

The `--no-cache` flag forces Docker to rebuild from scratch and use your new logo files instead of cached old ones.

