require 'rails_helper'

RSpec.describe 'Internal widget configuration API', type: :request do
  let!(:account) { create(:account) }
  let!(:admin) { create(:user, :administrator, account: account) }
  let!(:web_widget) { create(:channel_widget, account: account) }
  let(:headers) { { api_access_token: admin.access_token.token } }
  let(:path) { "/internal/api/v1/widget-config?website_token=#{web_widget.website_token}" }

  it 'returns disabled SPC with all fields enabled by default' do
    get path, headers: headers, as: :json

    expect(response).to have_http_status(:success)
    expect(response.parsed_body['smartPageContext']).to eq(
      'enabled' => false,
      'fields' => {
        'page_title' => true,
        'current_page_url' => true,
        'last_context_update_at' => true,
        'chat_start_url' => true,
        'referrer' => true,
        'page_type' => true
      }
    )
  end

  it 'updates SPC without changing Hide Branding' do
    web_widget.update!(hide_branding: true, widget_settings: { layout: 'expanded', future_setting: { enabled: true } })

    put path,
        headers: headers,
        params: {
          smartPageContext: {
            enabled: true,
            fields: { page_title: true, current_page_url: false }
          }
        },
        as: :json

    expect(response).to have_http_status(:success)
    expect(response.parsed_body['hideBranding']).to be true
    expect(response.parsed_body['smartPageContext']).to eq(
      'enabled' => true,
      'fields' => {
        'page_title' => true,
        'current_page_url' => false,
        'last_context_update_at' => true,
        'chat_start_url' => true,
        'referrer' => true,
        'page_type' => true
      }
    )
    expect(web_widget.reload.widget_settings['layout']).to eq('expanded')
    expect(web_widget.reload.widget_settings['future_setting']).to eq('enabled' => true)
  end

  it 'still updates Hide Branding without changing SPC' do
    put path,
        headers: headers,
        params: { hideBranding: true },
        as: :json

    expect(response).to have_http_status(:success)
    expect(response.parsed_body['hideBranding']).to be true
    expect(response.parsed_body['smartPageContext']['enabled']).to be false
  end
end
