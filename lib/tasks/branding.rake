namespace :voxe do
  desc 'Update branding configuration to Voxe'
  task update_branding: :environment do
    puts 'Updating branding to Voxe...'

    branding_configs = {
      'INSTALLATION_NAME' => 'Voxe',
      'BRAND_NAME' => 'Voxe',
      'BRAND_URL' => 'https://voxe.mcp4.ai',
      'WIDGET_BRAND_URL' => 'https://voxe.mcp4.ai',
      'TERMS_URL' => 'https://voxe.mcp4.ai/terms-of-service',
      'PRIVACY_URL' => 'https://voxe.mcp4.ai/privacy-policy',
      'DISPLAY_MANIFEST' => false
    }

    branding_configs.each do |name, value|
      config = InstallationConfig.find_by(name: name)
      if config
        old_value = config.value
        config.update!(value: value)
        puts "  ✓ Updated #{name}: '#{old_value}' → '#{value}'"
      else
        InstallationConfig.create!(name: name, value: value, locked: true)
        puts "  ✓ Created #{name} = '#{value}'"
      end
    end

    GlobalConfig.clear_cache
    puts "\n✅ Branding updated successfully! Cache cleared."
    puts "\nNote: You may need to restart the Rails container for changes to take effect:"
    puts "  docker compose -f docker-compose.production.yaml restart rails"
  end

  desc 'Verify current branding configuration'
  task verify_branding: :environment do
    puts 'Current Branding Configuration:'
    puts '=' * 50

    branding_keys = %w[
      INSTALLATION_NAME
      BRAND_NAME
      BRAND_URL
      WIDGET_BRAND_URL
      TERMS_URL
      PRIVACY_URL
      DISPLAY_MANIFEST
    ]

    branding_keys.each do |key|
      config = InstallationConfig.find_by(name: key)
      value = config ? config.value : '(not set)'
      status = value.to_s.include?('Voxe') || value.to_s.include?('voxe.mcp4.ai') ? '✓' : '✗'
      puts "#{status} #{key}: #{value}"
    end

    puts "\nGlobal Config Cache:"
    puts "  INSTALLATION_NAME: #{GlobalConfig.get('INSTALLATION_NAME')['INSTALLATION_NAME']}"
    puts "  BRAND_NAME: #{GlobalConfig.get('BRAND_NAME')['BRAND_NAME']}"
  end
end

