# == Schema Information
#
# Table name: channel_web_widgets
#
#  id                    :integer          not null, primary key
#  allowed_domains       :text             default("")
#  continuity_via_email  :boolean          default(TRUE), not null
#  feature_flags         :integer          default(7), not null
#  hide_branding         :boolean          default(FALSE), not null
#  hmac_mandatory        :boolean          default(FALSE)
#  hmac_token            :string
#  pre_chat_form_enabled :boolean          default(FALSE)
#  pre_chat_form_options :jsonb
#  reply_time            :integer          default("in_a_few_seconds")
#  website_token         :string
#  website_url           :string
#  welcome_tagline       :string
#  welcome_title         :string
#  widget_color          :string           default("#78FCD6")
#  widget_settings       :jsonb            not null
#  created_at            :datetime         not null
#  updated_at            :datetime         not null
#  account_id            :integer
#
# Indexes
#
#  index_channel_web_widgets_on_hmac_token     (hmac_token) UNIQUE
#  index_channel_web_widgets_on_website_token  (website_token) UNIQUE
#

class Channel::WebWidget < ApplicationRecord
  include Channelable
  include FlagShihTzu

  self.table_name = 'channel_web_widgets'
  WIDGET_LAYOUTS = %w[compact expanded].freeze
  DEFAULT_WIDGET_LAYOUT = 'compact'
  SMART_PAGE_CONTEXT_FIELDS = %w[
    page_title
    current_page_url
    last_context_update_at
    chat_start_url
    referrer
    page_type
  ].freeze
  DEFAULT_SMART_PAGE_CONTEXT = {
    'enabled' => false,
    'fields' => SMART_PAGE_CONTEXT_FIELDS.index_with { true }
  }.freeze
  CUSTOMER_QUESTION_TYPES = %w[static ai].freeze
  CUSTOMER_QUESTIONS_MAX_ITEMS = 5
  DEFAULT_CUSTOMER_QUESTIONS = {
    'enabled' => false,
    'items' => []
  }.freeze

  EDITABLE_ATTRS = [:website_url, :widget_color, :welcome_title, :welcome_tagline, :reply_time, :pre_chat_form_enabled,
                    :continuity_via_email, :hmac_mandatory, :allowed_domains, :hide_branding,
                    { widget_settings: [
                      :layout,
                      { smart_page_context: [:enabled, { fields: SMART_PAGE_CONTEXT_FIELDS }] },
                      { customer_questions: [
                        :enabled,
                        { items: [
                          :id, :question, :type, :answer, :enabled,
                          { targets: [:all_pages, { pages: [] }] }
                        ] }
                      ] }
                    ] },
                    { pre_chat_form_options: [:pre_chat_message, :require_email,
                                              { pre_chat_fields:
                                                [:field_type, :label, :placeholder, :name, :enabled, :type, :enabled, :required,
                                                 :locale, { values: [] }, :regex_pattern, :regex_cue] }] },
                    { selected_feature_flags: [] }].freeze

  before_validation :validate_pre_chat_options
  before_validation :normalize_widget_settings
  validates :website_url, presence: true
  validates :widget_color, presence: true
  has_many :portals, foreign_key: 'channel_web_widget_id', dependent: :nullify, inverse_of: :channel_web_widget

  has_secure_token :website_token
  has_secure_token :hmac_token

  has_flags 1 => :attachments,
            2 => :emoji_picker,
            3 => :end_conversation,
            4 => :use_inbox_avatar_for_bot,
            :column => 'feature_flags',
            :check_for_column => false

  enum reply_time: { in_a_few_minutes: 0, in_a_few_hours: 1, in_a_day: 2, in_a_few_seconds: 3 },
       _default: :in_a_few_seconds

  def widget_layout
    layout = widget_settings.to_h.stringify_keys['layout']
    WIDGET_LAYOUTS.include?(layout) ? layout : DEFAULT_WIDGET_LAYOUT
  end

  def widget_settings_with_defaults
    settings = widget_settings.respond_to?(:to_h) ? widget_settings.to_h.deep_stringify_keys : {}
    settings['layout'] = widget_layout
    settings['smart_page_context'] = normalized_smart_page_context(settings['smart_page_context'])
    settings['customer_questions'] = normalized_customer_questions(settings['customer_questions'])
    settings
  end

  def name
    'Website'
  end

  def web_widget_script
    sdk_cache_bust = defined?(GIT_HASH) && GIT_HASH.present? ? GIT_HASH : Chatwoot.config[:version]
    "
    <script>
      (function(d,t) {
        var BASE_URL=\"#{ENV.fetch('FRONTEND_URL', '')}\";
        var g=d.createElement(t),s=d.getElementsByTagName(t)[0];
        g.src=BASE_URL+\"/packs/js/sdk.js?v=#{sdk_cache_bust}\";
        g.async = true;
        s.parentNode.insertBefore(g,s);
        g.onload=function(){
          window.chatwootSDK.run({
            websiteToken: '#{website_token}',
            baseUrl: BASE_URL
          })
        }
      })(document,\"script\");
    </script>
    "
  end

  def validate_pre_chat_options
    return if pre_chat_form_options.with_indifferent_access['pre_chat_fields'].present?

    self.pre_chat_form_options = {
      pre_chat_message: 'Share your queries or comments here.',
      pre_chat_fields: [
        {
          'field_type': 'standard', 'label': 'Email Id', 'name': 'emailAddress', 'type': 'email', 'required': true, 'enabled': false
        },
        {
          'field_type': 'standard', 'label': 'Full name', 'name': 'fullName', 'type': 'text', 'required': false, 'enabled': false
        },
        {
          'field_type': 'standard', 'label': 'Phone number', 'name': 'phoneNumber', 'type': 'text', 'required': false, 'enabled': false
        }
      ]
    }
  end

  def normalize_widget_settings
    incoming = widget_settings.respond_to?(:to_h) ? widget_settings.to_h.deep_stringify_keys : {}
    previous = if persisted? && respond_to?(:widget_settings_was)
                 widget_settings_was.to_h.deep_stringify_keys
               else
                 {}
               end
    settings = previous.deep_merge(incoming)
    settings['layout'] = WIDGET_LAYOUTS.include?(settings['layout']) ? settings['layout'] : DEFAULT_WIDGET_LAYOUT
    settings['smart_page_context'] = normalized_smart_page_context(settings['smart_page_context'])
    settings['customer_questions'] = normalized_customer_questions(settings['customer_questions'])

    self.widget_settings = settings
  end

  def normalized_smart_page_context(raw)
    input = raw.respond_to?(:to_h) ? raw.to_h.deep_stringify_keys : {}
    input_fields = input['fields'].respond_to?(:to_h) ? input['fields'].to_h.deep_stringify_keys : {}

    {
      'enabled' => input['enabled'] == true,
      'fields' => SMART_PAGE_CONTEXT_FIELDS.index_with do |field|
        input_fields.key?(field) ? input_fields[field] == true : true
      end
    }
  end

  def normalized_customer_questions(raw)
    input = raw.respond_to?(:to_h) ? raw.to_h.deep_stringify_keys : {}
    items = Array(input['items']).filter_map { |item| normalized_customer_question_item(item) }

    {
      'enabled' => input['enabled'] == true,
      'items' => items
    }
  end

  def normalized_customer_question_item(raw)
    return unless raw.respond_to?(:to_h)

    item = raw.to_h.deep_stringify_keys
    id = item['id'].to_s.strip
    question = item['question'].to_s.strip
    type = item['type'].to_s.strip
    return if id.blank? || question.blank?
    return unless CUSTOMER_QUESTION_TYPES.include?(type)

    answer = item['answer'].to_s.strip
    return if type == 'static' && answer.blank?

    normalized = {
      'id' => id,
      'question' => question,
      'type' => type,
      'enabled' => item.key?('enabled') ? item['enabled'] == true : true,
      'targets' => normalized_customer_question_targets(item['targets'])
    }
    normalized['answer'] = answer if type == 'static'
    normalized
  end

  def normalized_customer_question_targets(raw)
    input = raw.respond_to?(:to_h) ? raw.to_h.deep_stringify_keys : {}
    pages = Array(input['pages']).map { |page| page.to_s.strip }.reject(&:blank?).uniq

    {
      'all_pages' => input['all_pages'] == true,
      'pages' => pages
    }
  end

  def create_contact_inbox(additional_attributes = {})
    ::ContactInboxWithContactBuilder.new({
                                           inbox: inbox,
                                           contact_attributes: { additional_attributes: additional_attributes }
                                         }).perform
  end
end
