# Safe Rebuild Guide - Keep Your Database

## ⚠️ Important: Your Database is Safe IF You Follow These Steps

Your `docker-compose.production.yaml` is correctly configured with volumes. The database will persist **UNLESS** you use the `-v` flag.

---

## ✅ Safe Rebuild Commands (Database Preserved)

### Option 1: Rebuild Only Rails Service (Recommended)
```bash
# This rebuilds ONLY the rails image, database stays untouched
docker compose -f docker-compose.production.yaml build rails

# Restart only rails service
docker compose -f docker-compose.production.yaml up -d rails
```

### Option 2: Rebuild and Restart (Safe)
```bash
# Rebuild without cache
docker compose -f docker-compose.production.yaml build --no-cache rails

# Restart services (database container stays running)
docker compose -f docker-compose.production.yaml up -d
```

### Option 3: Full Rebuild (Still Safe)
```bash
# Stop services (does NOT remove volumes)
docker compose -f docker-compose.production.yaml down

# Rebuild
docker compose -f docker-compose.production.yaml build --no-cache rails

# Start services (database data is preserved)
docker compose -f docker-compose.production.yaml up -d
```

---

## ❌ DANGEROUS Commands (Will Delete Database!)

**NEVER use these if you want to keep your data:**

```bash
# ❌ This REMOVES volumes (deletes database!)
docker compose -f docker-compose.production.yaml down -v

# ❌ This also removes volumes
docker compose -f docker-compose.production.yaml down --volumes

# ❌ This removes everything including volumes
docker compose -f docker-compose.production.yaml rm -v
```

---

## 🔍 Verify Your Database is Safe

### Check if volumes exist:
```bash
docker volume ls | grep postgres_data
```

### Check volume details:
```bash
docker volume inspect chatwoot_postgres_data
```

### Verify database is running:
```bash
docker compose -f docker-compose.production.yaml ps postgres
```

---

## 📋 Complete Safe Rebuild Workflow

```bash
# 1. Pull latest code
git pull origin develop

# 2. Rebuild rails service (database untouched)
docker compose -f docker-compose.production.yaml build --no-cache rails

# 3. Restart services
docker compose -f docker-compose.production.yaml up -d

# 4. Verify database is still there
docker compose -f docker-compose.production.yaml exec rails bundle exec rails db:migrate:status

# 5. Run branding update if needed
docker compose -f docker-compose.production.yaml exec rails bundle exec rake voxe:update_branding
```

---

## 🛡️ Backup Before Rebuild (Extra Safety)

If you want to be extra safe, backup first:

```bash
# Backup database
docker compose -f docker-compose.production.yaml exec postgres pg_dump -U postgres chatwoot > backup_$(date +%Y%m%d_%H%M%S).sql

# Then proceed with rebuild
```

---

## 💡 Why This Happens

- `docker compose build` - Only rebuilds images, **never touches volumes**
- `docker compose down` - Stops containers, **keeps volumes** ✅
- `docker compose down -v` - Stops containers **AND removes volumes** ❌

Your volumes are defined at the bottom of `docker-compose.production.yaml`:
```yaml
volumes:
  storage_data:      # File uploads
  postgres_data:     # Database data
  redis_data:        # Redis cache
```

These persist even when containers are stopped or rebuilt.

---

## 🎯 Quick Reference

| Command | Database Safe? | Use Case |
|---------|---------------|----------|
| `build` | ✅ Yes | Rebuild images |
| `up -d` | ✅ Yes | Start services |
| `down` | ✅ Yes | Stop services |
| `down -v` | ❌ **NO!** | Remove everything |
| `restart` | ✅ Yes | Restart containers |

---

## Summary

**Your setup is correct!** Just make sure you:
1. ✅ Use `build` without `-v` flag
2. ✅ Use `down` without `-v` flag  
3. ✅ Never use `rm -v` or `down --volumes`

Your database will persist across rebuilds! 🎉

