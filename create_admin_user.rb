# Create first admin user for Chatwoot
# Run with: docker-compose exec rails bundle exec rails runner create_admin_user.rb

# Check existing users
if User.count > 0
  puts "\n=== Existing Users ==="
  User.all.each do |u|
    puts "  Email: #{u.email}"
    puts "  Name: #{u.name}"
    puts "  Type: #{u.type}"
    puts "  Confirmed: #{u.confirmed?}"
    puts "  Accounts: #{u.accounts.pluck(:name).join(', ')}"
    puts "---"
  end
end

# Create new admin user
puts "\n=== Creating New Admin User ==="

# Create or find account
account = Account.find_or_create_by!(name: 'My Company')
puts "Account: #{account.name} (ID: #{account.id})"

# Set your credentials here
email = 'admin@example.com'  # CHANGE THIS
password = 'Password1!'      # CHANGE THIS
name = 'Admin User'           # CHANGE THIS

# Check if user already exists
if User.exists?(email: email)
  puts "\nERROR: User with email #{email} already exists!"
  puts "Please change the email in this script and run again."
else
  # Create user
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
  
  # Link user to account as administrator
  AccountUser.find_or_create_by!(
    account_id: account.id,
    user_id: user.id
  ) do |au|
    au.role = :administrator
  end
  
  puts "\n=== Login Credentials ==="
  puts "Email: #{email}"
  puts "Password: #{password}"
  puts "\nLogin at: http://localhost:3000"
  puts "========================\n"
end
