# frozen_string_literal: true

require 'rails_helper'

RSpec.describe ContentAttributeValidator do
  let(:account) { create(:account) }
  let(:inbox) { create(:inbox, account: account) }
  let(:conversation) { create(:conversation, account: account, inbox: inbox) }

  def build_message(content_type:, items:)
    Message.new(
      account: account,
      inbox: inbox,
      conversation: conversation,
      message_type: :outgoing,
      content: 'Choose a time',
      content_type: content_type,
      content_attributes: { items: items }
    )
  end

  describe 'input_calendar' do
    it 'accepts grouped date items with title/value slots' do
      message = build_message(
        content_type: 'input_calendar',
        items: [
          {
            date: '2026-10-26',
            date_label: 'Mon, Oct 26',
            slots: [
              {
                title: '3:30 AM',
                value: 'booking:calendar_slot:2026-10-26T08:30:00.000Z|2026-10-26T08:45:00.000Z'
              }
            ]
          }
        ]
      )

      expect(message).to be_valid
    end

    it 'rejects calendar items without slots' do
      message = build_message(
        content_type: 'input_calendar',
        items: [{ date: '2026-10-26', date_label: 'Mon, Oct 26' }]
      )

      expect(message).not_to be_valid
      expect(message.errors[:content_attributes].join).to include('slots')
    end

    it 'rejects slots missing title or value' do
      message = build_message(
        content_type: 'input_calendar',
        items: [
          {
            date: '2026-10-26',
            slots: [{ title: '3:30 AM' }]
          }
        ]
      )

      expect(message).not_to be_valid
      expect(message.errors[:content_attributes].join).to include('title and value')
    end
  end
end
