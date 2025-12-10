# Check if widget token exists, create if needed
widget = Channel::WebWidget.find_by(website_token: 'bj1ewRNgi9Hwk3a5hMtVgF3g')

if widget
  puts "✓ Widget found!"
  puts "  Website URL: #{widget.website_url}"
  puts "  Account: #{widget.account.name}"
  puts "  Token: #{widget.website_token}"
else
  puts "Widget not found. Creating one..."
  account = Account.first || Account.create!(name: 'Test Account')
  widget = Channel::WebWidget.create!(
    account: account,
    website_url: 'http://localhost:3000'
  )
  puts "✓ Created widget!"
  puts "  Website URL: #{widget.website_url}"
  puts "  Account: #{widget.account.name}"
  puts "  Token: #{widget.website_token}"
  puts "\n⚠️  Update test_widget.html with the new token: #{widget.website_token}"
end

