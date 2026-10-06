# frozen_string_literal: true

class ChangeChannelWebWidgetsReplyTimeDefaultToFewSeconds < ActiveRecord::Migration[7.0]
  def up
    # 3 => Channel::WebWidget.reply_times[:in_a_few_seconds]
    change_column_default :channel_web_widgets, :reply_time, from: 0, to: 3
  end

  def down
    change_column_default :channel_web_widgets, :reply_time, from: 3, to: 0
  end
end
