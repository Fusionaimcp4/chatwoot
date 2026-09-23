# frozen_string_literal: true

class AddWidgetSettingsToChannelWebWidgets < ActiveRecord::Migration[7.1]
  def change
    add_column :channel_web_widgets, :widget_settings, :jsonb, null: false, default: {}
  end
end
