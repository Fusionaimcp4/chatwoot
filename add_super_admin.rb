# Quick script to add SuperAdmin user
# Run: docker compose -f docker-compose.production.yaml exec rails bundle exec rails runner add_super_admin.rb

puts "\n=== Creating SuperAdmin User ==="

# Create or find account
account = Account.find_or_create_by!(name: 'My Company')
puts "Account: #{account.name} (ID: #{account.id})"

# Set your credentials - CHANGE THESE
email = 'admin@voxedesk.com'
password = 'VoxeDesk2024!'
name = 'VoxeDesk Admin'

# Check if user exists
existing_user = User.find_by(email: email)

if existing_user
  puts "\nUser #{email} already exists!"
  puts "Updating to SuperAdmin and resetting password..."
  existing_user.update!(
    name: name,
    type: 'SuperAdmin',
    password: password,
    password_confirmation: password
  )
  existing_user.skip_confirmation!
  existing_user.save!
  user = existing_user
  puts "✓ User updated: #{user.email}"
else
  # Create new user
  user = User.new(
    name: name,
    email: email,
    password: password,
    password_confirmation: password,
    type: 'SuperAdmin'
  )
  user.skip_confirmation!
  user.save!
  puts "✓ User created: #{user.email}"
end

# Link to account as administrator
AccountUser.find_or_create_by!(
  account_id: account.id,
  user_id: user.id
) do |au|
  au.role = :administrator
end

puts "\n=== Login Credentials ==="
puts "Email: #{email}"
puts "Password: #{password}"
puts "\nLogin at: http://localhost:8083"
puts "========================\n"

