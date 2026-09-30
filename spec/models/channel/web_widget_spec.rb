# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Channel::WebWidget do
  context 'when
  web widget channel' do
    let!(:channel_widget) { create(:channel_widget) }

    it 'pre chat options' do
      expect(channel_widget.pre_chat_form_options['pre_chat_message']).to eq 'Share your queries or comments here.'
      expect(channel_widget.pre_chat_form_options['pre_chat_fields'].length).to eq 3
    end

    it 'defaults existing widgets to the compact layout' do
      expect(channel_widget.widget_layout).to eq('compact')
      settings = channel_widget.widget_settings_with_defaults
      expect(settings['layout']).to eq('compact')
      expect(settings['smart_page_context']['enabled']).to be false
      expect(settings['smart_page_context']['fields']).to eq(
        'page_title' => true,
        'current_page_url' => true,
        'last_context_update_at' => true,
        'chat_start_url' => true,
        'referrer' => true,
        'page_type' => true
      )
    end

    it 'persists supported widget layouts' do
      channel_widget.update!(widget_settings: { layout: 'expanded' })

      expect(channel_widget.reload.widget_layout).to eq('expanded')
    end

    it 'falls back to compact for unsupported widget layouts' do
      channel_widget.update!(widget_settings: { layout: 'unsupported' })

      expect(channel_widget.reload.widget_layout).to eq('compact')
      expect(channel_widget.reload.widget_settings['layout']).to eq('compact')
      expect(channel_widget.reload.widget_settings['smart_page_context']['enabled']).to be false
    end

    it 'preserves SPC and unrelated widget settings during normalization' do
      channel_widget.update!(
        widget_settings: {
          layout: 'expanded',
          future_setting: { 'enabled' => true },
          smart_page_context: {
            enabled: true,
            fields: {
              page_title: true,
              current_page_url: false,
              last_context_update_at: true,
              chat_start_url: false,
              referrer: true,
              page_type: false
            }
          }
        }
      )

      settings = channel_widget.reload.widget_settings
      expect(settings['layout']).to eq('expanded')
      expect(settings['future_setting']).to eq('enabled' => true)
      expect(settings['smart_page_context']).to eq(
        'enabled' => true,
        'fields' => {
          'page_title' => true,
          'current_page_url' => false,
          'last_context_update_at' => true,
          'chat_start_url' => false,
          'referrer' => true,
          'page_type' => false
        }
      )

      channel_widget.update!(widget_settings: { layout: 'compact' })
      expect(channel_widget.reload.widget_settings['future_setting']).to eq('enabled' => true)
      expect(channel_widget.reload.widget_settings['smart_page_context']['enabled']).to be true
    end
  end
end
