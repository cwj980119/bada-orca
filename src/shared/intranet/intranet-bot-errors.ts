export const INTRANET_BOT_MODEL_REQUIRED = 'intranet_bot_model_required'
export const INTRANET_BOT_MODEL_UNREGISTERED = 'intranet_bot_model_unregistered'

export function isIntranetBotModelError(error: unknown): error is Error {
  return (
    error instanceof Error &&
    [
      INTRANET_BOT_MODEL_REQUIRED,
      INTRANET_BOT_MODEL_UNREGISTERED,
      '설정 → 사내 연결에서 이 실행 도구의 사내 모델을 먼저 등록해 주세요.',
      '이 Bot의 모델이 사내 연결에 등록되어 있지 않습니다. Bot 설정에서 등록된 모델을 선택해 주세요.'
    ].includes(error.message)
  )
}
