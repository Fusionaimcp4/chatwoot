# Script to create first admin user
# Usage: docker-compose exec rails bundle exec rails runner create_user.rb

# Check if users exist
if User.count > 0
  puts "Existing users:"
  User.all.each do |u|
    puts "  - Email: #{u.email}, Name: #{u.name}, Type: #{u.type}"
  end
  puts "\nTo create a new user, edit this script and run it again."
else
  puts "No users found. Creating first admin user..."
  
  # Create account
  account = Account.find_or_create_by!(name: 'My Company')
  
  # Create user
  user = User.new(
    name: 'Admin User',
    email: 'admin@example.com',
    password: 'Password1!',
    type: 'SuperAdmin'
  )
  user.skip_confirmation!
  user.save!
  
  # Link user to account as administrator
  AccountUser.find_or_create_by!(
    account_id: account.id,
    user_id: user.id
  ) do |au|
    au.role = :administrator
  end
  
  puts "User created successfully!"
  puts "  Email: #{user.email}"
  puts "  Password: Password1!"
  puts "  Type: #{user.type}"
  puts "\nYou can now login at http://localhost:3000"
end

