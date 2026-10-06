module WidgetHelper
  def widget_connected_agent_bot(web_widget)
    inbox = web_widget.inbox
    agent_bot = inbox.agent_bot
    return nil unless agent_bot
    return nil unless inbox.agent_bot_inbox&.active?

    {
      id: agent_bot.id,
      name: agent_bot.name,
      avatarUrl: agent_bot.avatar_url.presence || inbox.avatar_url,
      active: true
    }
  end

  def build_contact_inbox_with_token(web_widget, additional_attributes = {})
    contact_inbox = web_widget.create_contact_inbox(additional_attributes)
    payload = { source_id: contact_inbox.source_id, inbox_id: web_widget.inbox.id }
    token = ::Widget::TokenService.new(payload: payload).generate_token

    [contact_inbox, token]
  end
end
