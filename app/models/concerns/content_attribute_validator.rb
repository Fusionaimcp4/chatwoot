class ContentAttributeValidator < ActiveModel::Validator
  ALLOWED_SELECT_ITEM_KEYS = [:title, :value].freeze
  ALLOWED_CARD_ITEM_KEYS = [:title, :description, :media_url, :actions].freeze
  ALLOWED_CARD_ITEM_ACTION_KEYS = [:text, :type, :payload, :uri].freeze
  ALLOWED_FORM_ITEM_KEYS = [:type, :placeholder, :label, :name, :options, :default, :required, :pattern, :title, :pattern_error].freeze
  ALLOWED_ARTICLE_KEYS = [:title, :description, :link].freeze
  ALLOWED_CALENDAR_ITEM_KEYS = [:date, :date_label, :slots].freeze
  ALLOWED_CALENDAR_SLOT_KEYS = [:title, :value, :start, :end].freeze

  def validate(record)
    case record.content_type
    when 'input_select'
      validate_items!(record)
      validate_item_attributes!(record, ALLOWED_SELECT_ITEM_KEYS)
    when 'cards'
      validate_items!(record)
      validate_item_attributes!(record, ALLOWED_CARD_ITEM_KEYS)
      validate_item_actions!(record)
    when 'form'
      validate_items!(record)
      validate_item_attributes!(record, ALLOWED_FORM_ITEM_KEYS)
    when 'article'
      validate_items!(record)
      validate_item_attributes!(record, ALLOWED_ARTICLE_KEYS)
    when 'input_calendar'
      validate_calendar_items!(record)
    end
  end

  private

  def validate_items!(record)
    record.errors.add(:content_attributes, 'At least one item is required.') if record.items.blank?
    record.errors.add(:content_attributes, 'Items should be a hash.') if record.items.reject { |item| item.is_a?(Hash) }.present?
  end

  def validate_item_attributes!(record, valid_keys)
    item_keys = record.items.collect(&:keys).flatten.filter_map(&:to_sym)
    invalid_keys = item_keys - valid_keys
    record.errors.add(:content_attributes, "contains invalid keys for items : #{invalid_keys}") if invalid_keys.present?
  end

  def validate_item_actions!(record)
    if record.items.select { |item| item[:actions].blank? }.present?
      record.errors.add(:content_attributes, 'contains items missing actions') && return
    end

    validate_item_action_attributes!(record)
  end

  def validate_item_action_attributes!(record)
    item_action_keys = record.items.collect { |item| item[:actions].collect(&:keys) }
    invalid_keys = item_action_keys.flatten.compact.map(&:to_sym) - ALLOWED_CARD_ITEM_ACTION_KEYS
    record.errors.add(:content_attributes, "contains invalid keys for actions:  #{invalid_keys}") if invalid_keys.present?
  end

  def validate_calendar_items!(record)
    validate_items!(record)
    return if record.errors[:content_attributes].present?

    validate_item_attributes!(record, ALLOWED_CALENDAR_ITEM_KEYS)
    return if record.errors[:content_attributes].present?

    record.items.each do |item|
      slots = item[:slots] || item['slots']
      if slots.blank? || !slots.is_a?(Array)
        record.errors.add(:content_attributes, 'calendar items must include a slots array')
        next
      end

      slots.each do |slot|
        unless slot.is_a?(Hash)
          record.errors.add(:content_attributes, 'calendar slots must be hashes')
          next
        end

        slot_keys = slot.keys.map(&:to_sym)
        invalid_keys = slot_keys - ALLOWED_CALENDAR_SLOT_KEYS
        if invalid_keys.present?
          record.errors.add(:content_attributes, "contains invalid keys for calendar slots : #{invalid_keys}")
        end

        title = slot[:title] || slot['title']
        value = slot[:value] || slot['value']
        if title.blank? || value.blank?
          record.errors.add(:content_attributes, 'calendar slots require title and value')
        end
      end
    end
  end
end
