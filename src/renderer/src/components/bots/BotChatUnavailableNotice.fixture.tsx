import { defineFixture } from '../../component-fixtures/component-fixture'
import { BotChatUnavailableNotice } from './BotChatUnavailableNotice'
import { INTRANET_BOT_MODEL_REQUIRED } from '../../../../shared/intranet/intranet-bot-errors'

export const modelRequired = defineFixture({
  width: 720,
  render: () => (
    <div className="bg-background">
      <BotChatUnavailableNotice
        error={new Error(INTRANET_BOT_MODEL_REQUIRED)}
        pending={false}
        onRetry={() => {}}
      />
    </div>
  )
})
