require 'rails_helper'

RSpec.describe 'Internal widget configuration API', type: :request do
  let!(:account) { create(:account) }
  let!(:admin) { create(:user, :administrator, account: account) }
  let!(:web_widget) { create(:channel_widget, account: account) }
  let(:headers) { { api_access_token: admin.access_token.token } }
  let(:path) { "/internal/api/v1/widget-config?website_token=#{web_widget.website_token}" }

  let(:three_questions) do
    [
      {
        id: 'shipping-time',
        question: 'How long does shipping take?',
        type: 'static',
        answer: 'Standard shipping normally takes 3–5 business days.',
        enabled: true,
        targets: { all_pages: true, pages: [] }
      },
      {
        id: 'return-policy',
        question: 'What is your return policy?',
        type: 'static',
        answer: 'Returns are accepted within 30 days.',
        enabled: true,
        targets: { all_pages: true, pages: [] }
      },
      {
        id: 'product-help',
        question: 'Can you help me find the right product?',
        type: 'ai',
        enabled: true,
        targets: { all_pages: true, pages: [] }
      }
    ]
  end

  let(:four_questions) do
    three_questions + [
      {
        id: 'change-order',
        question: 'Can I change or cancel my order?',
        type: 'static',
        answer: 'Orders can be changed within 1 hour of placement.',
        enabled: true,
        targets: { all_pages: true, pages: [] }
      }
    ]
  end

  let(:five_questions) do
    four_questions + [
      {
        id: 'free-returns',
        question: 'Do you offer free returns?',
        type: 'static',
        answer: 'Yes — prepaid return labels are included.',
        enabled: true,
        targets: { all_pages: true, pages: [] }
      }
    ]
  end

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
    expect(response.parsed_body['customerQuestions']).to eq(
      'enabled' => false,
      'items' => []
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

  it 'updates customerQuestions and returns them on GET' do
    put path,
        headers: headers,
        params: { customerQuestions: { enabled: true, items: three_questions } },
        as: :json

    expect(response).to have_http_status(:success)
    expect(response.parsed_body['customerQuestions']['enabled']).to be true
    expect(response.parsed_body['customerQuestions']['items'].pluck('id')).to eq(
      %w[shipping-time return-policy product-help]
    )

    get path, headers: headers, as: :json
    expect(response).to have_http_status(:success)
    expect(response.parsed_body['customerQuestions']['items'].pluck('id')).to eq(
      %w[shipping-time return-policy product-help]
    )
  end

  it 'accepts the snake_case customer_questions alias' do
    put path,
        headers: headers,
        params: { customer_questions: { enabled: true, items: three_questions } },
        as: :json

    expect(response).to have_http_status(:success)
    expect(web_widget.reload.widget_settings['customer_questions']['items'].pluck('id')).to eq(
      %w[shipping-time return-policy product-help]
    )
  end

  it 'replaces the complete customer_questions items array' do
    web_widget.update!(
      widget_settings: {
        layout: 'expanded',
        future_setting: { enabled: true },
        smart_page_context: {
          enabled: true,
          fields: { page_title: true, current_page_url: false }
        },
        customer_questions: { enabled: true, items: five_questions }
      }
    )
    expect(web_widget.reload.widget_settings['customer_questions']['items'].length).to eq(5)

    put path,
        headers: headers,
        params: { customerQuestions: { enabled: true, items: three_questions } },
        as: :json

    expect(response).to have_http_status(:success)
    settings = web_widget.reload.widget_settings
    expect(settings['customer_questions']['items'].pluck('id')).to eq(
      %w[shipping-time return-policy product-help]
    )
    expect(settings['layout']).to eq('expanded')
    expect(settings['future_setting']).to eq('enabled' => true)
    expect(settings['smart_page_context']['enabled']).to be true
    expect(settings['smart_page_context']['fields']['current_page_url']).to be false
    expect(response.parsed_body['smartPageContext']['enabled']).to be true

    put path,
        headers: headers,
        params: { customerQuestions: { enabled: true, items: four_questions } },
        as: :json

    expect(response).to have_http_status(:success)
    expect(web_widget.reload.widget_settings['customer_questions']['items'].pluck('id')).to eq(
      %w[shipping-time return-policy product-help change-order]
    )
    expect(web_widget.reload.widget_settings['smart_page_context']['enabled']).to be true
  end

  it 'rejects requests without a recognized update parameter' do
    put path, headers: headers, params: {}, as: :json

    expect(response).to have_http_status(:bad_request)
    expect(response.parsed_body['error']).to include('customerQuestions')
  end

  it 'rejects unauthorized access tokens' do
    agent = create(:user, account: account, role: :agent)

    put path,
        headers: { api_access_token: agent.access_token.token },
        params: { customerQuestions: { enabled: true, items: three_questions } },
        as: :json

    expect(response).to have_http_status(:unauthorized)
  end

  it 'rejects missing access tokens' do
    put path, params: { customerQuestions: { enabled: true, items: three_questions } }, as: :json

    expect(response).to have_http_status(:unauthorized)
  end
end
