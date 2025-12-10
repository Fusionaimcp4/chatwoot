# Quick admin user creation script
# Run: docker compose -f docker-compose.production.yaml exec rails bundle exec rails runner "$(cat create_admin_inline.rb)"

puts "\n=== Checking Database ==="
puts "Total Users: #{User.count}"
puts "Total Accounts: #{Account.count}"

if User.count > 0
  puts "\n=== Existing Users ==="
  User.all.each do |u|
    puts "  Email: #{u.email}"
    puts "  Name: #{u.name}"
    puts "  Type: #{u.type || 'User'}"
    puts "  Confirmed: #{u.confirmed?}"
    puts "---"
  end
end

puts "\n=== Creating Admin User ==="

# Create or find account
account = Account.find_or_create_by!(name: 'My Company')
puts "Account: #{account.name} (ID: #{account.id})"

# Set credentials - UPDATE THESE
email = 'admin@voxedesk.com'
password = 'VoxeDesk2024!'
name = 'VoxeDesk Admin'

# Check if user exists
if User.exists?(email: email)
  puts "\nUser #{email} already exists!"
  user = User.find_by(email: email)
  puts "Updating password..."
  user.update!(password: password, password_confirmation: password)
  user.skip_confirmation!
  user.save!
  puts "Password updated for #{email}"
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
  puts "User created: #{user.email}"
end

# Link to account
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

