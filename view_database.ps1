# PowerShell script to view Chatwoot database
# Run: .\view_database.ps1

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Chatwoot Database Viewer" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan

Write-Host "`n1. Checking PostgreSQL connection..." -ForegroundColor Yellow
docker compose -f docker-compose.production.yaml exec postgres psql -U postgres -d chatwoot -c "\conninfo"

Write-Host "`n2. Listing all tables..." -ForegroundColor Yellow
docker compose -f docker-compose.production.yaml exec postgres psql -U postgres -d chatwoot -c "\dt" | Select-Object -First 50

Write-Host "`n3. Checking Users..." -ForegroundColor Yellow
docker compose -f docker-compose.production.yaml exec postgres psql -U postgres -d chatwoot -c "SELECT id, email, name, type, confirmed_at IS NOT NULL as confirmed FROM users ORDER BY id;"

Write-Host "`n4. Checking Accounts..." -ForegroundColor Yellow
docker compose -f docker-compose.production.yaml exec postgres psql -U postgres -d chatwoot -c "SELECT id, name, created_at FROM accounts ORDER BY id;"

Write-Host "`n5. Checking AccountUsers (user-account links)..." -ForegroundColor Yellow
docker compose -f docker-compose.production.yaml exec postgres psql -U postgres -d chatwoot -c "SELECT au.id, u.email, a.name as account_name, au.role FROM account_users au JOIN users u ON au.user_id = u.id JOIN accounts a ON au.account_id = a.id ORDER BY au.id;"

Write-Host "`n6. Checking Installation Configs (Branding)..." -ForegroundColor Yellow
docker compose -f docker-compose.production.yaml exec postgres psql -U postgres -d chatwoot -c "SELECT name, serialized_value->>'value' as value FROM installation_configs WHERE name IN ('INSTALLATION_NAME', 'BRAND_NAME', 'BRAND_URL') ORDER BY name;"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Done!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan

