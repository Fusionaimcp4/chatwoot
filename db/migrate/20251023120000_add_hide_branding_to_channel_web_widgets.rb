class AddHideBrandingToChannelWebWidgets < ActiveRecord::Migration[7.1]
  def change
    add_column :channel_web_widgets, :hide_branding, :boolean, default: false, null: false
  end
end

