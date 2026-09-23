# frozen_string_literal: true

class ChangeChannelWebWidgetsWidgetColorDefaultToMint < ActiveRecord::Migration[7.1]
  def change
    change_column_default :channel_web_widgets, :widget_color, from: '#29292B', to: '#78FCD6'
  end
end
