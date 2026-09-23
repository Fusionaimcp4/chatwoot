class ChangeAllowMessagesAfterResolvedDefaultToFalse < ActiveRecord::Migration[7.1]
  def change
    change_column_default :inboxes, :allow_messages_after_resolved, from: true, to: false
  end
end
