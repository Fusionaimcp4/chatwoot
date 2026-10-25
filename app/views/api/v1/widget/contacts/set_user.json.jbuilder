json.id @contact.id
json.has_email @contact.email.present?
json.has_name @contact.name.present?
json.has_phone_number @contact.phone_number.present?
json.identifier @contact.identifier
json.email @contact.email
json.name @contact.name
json.custom_attributes @contact.custom_attributes
json.additional_attributes @contact.additional_attributes
json.widget_auth_token @widget_auth_token if @widget_auth_token.present?
