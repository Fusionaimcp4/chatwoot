class ChangeChannelWebWidgetsWidgetColorDefault < ActiveRecord::Migration[7.1]
  def change
    change_column_default :channel_web_widgets, :widget_color, from: '#1f93ff', to: '#29292B'
  end
end
