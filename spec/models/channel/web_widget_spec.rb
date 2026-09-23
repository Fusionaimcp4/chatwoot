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
      expect(channel_widget.widget_settings_with_defaults).to eq('layout' => 'compact')
    end

    it 'persists supported widget layouts' do
      channel_widget.update!(widget_settings: { layout: 'expanded' })

      expect(channel_widget.reload.widget_layout).to eq('expanded')
    end

    it 'falls back to compact for unsupported widget layouts' do
      channel_widget.update!(widget_settings: { layout: 'unsupported' })

      expect(channel_widget.reload.widget_layout).to eq('compact')
      expect(channel_widget.reload.widget_settings).to eq('layout' => 'compact')
    end
  end
end
