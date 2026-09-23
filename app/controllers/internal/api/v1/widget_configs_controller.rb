class Internal::Api::V1::WidgetConfigsController < Api::BaseController
  before_action :set_web_widget
  before_action :set_account_context
  before_action :check_admin_authorization

  def show
    render json: {
      hideBranding: @web_widget.hide_branding || false
    }
  end

  def update
    if update_params[:hideBranding].nil?
      render json: { error: 'hideBranding parameter is required' }, status: :bad_request
      return
    end

    @web_widget.update!(hide_branding: ActiveModel::Type::Boolean.new.cast(update_params[:hideBranding]))

    render json: {
      hideBranding: @web_widget.hide_branding || false
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
    params.permit(:hideBranding)
  end
end

