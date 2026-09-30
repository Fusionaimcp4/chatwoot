class Internal::Api::V1::WidgetConfigsController < Api::BaseController
  before_action :set_web_widget
  before_action :set_account_context
  before_action :check_admin_authorization

  def show
    render json: {
      hideBranding: @web_widget.hide_branding || false,
      smartPageContext: @web_widget.widget_settings_with_defaults['smart_page_context']
    }
  end

  def update
    params_to_update = update_params
    if params_to_update[:hideBranding].nil? && smart_page_context_param.nil?
      render json: { error: 'hideBranding or smartPageContext parameter is required' }, status: :bad_request
      return
    end

    updates = {}
    unless params_to_update[:hideBranding].nil?
      updates[:hide_branding] = ActiveModel::Type::Boolean.new.cast(params_to_update[:hideBranding])
    end

    if smart_page_context_param
      updates[:widget_settings] = @web_widget.widget_settings_with_defaults.merge(
        'smart_page_context' => normalize_smart_page_context(smart_page_context_param)
      )
    end

    @web_widget.update!(updates)

    render json: {
      hideBranding: @web_widget.hide_branding || false,
      smartPageContext: @web_widget.widget_settings_with_defaults['smart_page_context']
    }
  end

  private

  def set_web_widget
    website_token = params[:website_token]
    @web_widget = ::Channel::WebWidget.find_by(website_token: website_token)

    unless @web_widget
      render json: { error: 'Widget not found' }, status: :not_found
      return
    end
  end

  def set_account_context
    return unless Current.user.is_a?(User)

    account = @web_widget.inbox.account
    Current.account = account
    Current.account_user = account.account_users.find_by(user_id: Current.user.id)

    unless Current.account_user
      render json: { error: 'You are not authorized to access this account' }, status: :unauthorized
      return
    end
  end

  def check_admin_authorization
    unless Current.account_user&.administrator?
      render json: { error: 'Unauthorized - Administrator access required' }, status: :unauthorized
      return
    end
  end

  def update_params
    params.permit(
      :hideBranding,
      smartPageContext: [:enabled, { fields: Channel::WebWidget::SMART_PAGE_CONTEXT_FIELDS }],
      smart_page_context: [:enabled, { fields: Channel::WebWidget::SMART_PAGE_CONTEXT_FIELDS }]
    )
  end

  def smart_page_context_param
    update_params[:smartPageContext] || update_params[:smart_page_context]
  end

  def normalize_smart_page_context(raw)
    fields = raw[:fields] || raw['fields'] || {}
    {
      'enabled' => raw[:enabled] == true || raw['enabled'] == true,
      'fields' => Channel::WebWidget::SMART_PAGE_CONTEXT_FIELDS.index_with do |field|
        value = if fields.respond_to?(:key?) && fields.key?(field)
                  fields[field]
                elsif fields.respond_to?(:key?) && fields.key?(field.to_sym)
                  fields[field.to_sym]
                end
        value.nil? ? true : value == true
      end
    }
  end
end

