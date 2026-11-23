import { BOT_METHODS } from './bots'
import { BOT_GROUP_METHODS } from './bot-groups'
import { BOT_TAKE_OVER_METHOD } from './bots-take-over'
import { BOT_RUN_SEND_AGAIN_METHOD } from './bots-run-send-again'
import { BOT_LOOK_AROUND_METHODS } from './bots-look-around'
import { BOT_TIDY_UP_METHODS } from './bots-tidy-up'
import { BOT_WORK_METHODS } from './bots-work'
import { BOT_ITEMS_METHODS } from './bots-items'
import { BOT_REQUEST_OUTCOME_METHOD } from './bots-request-outcome'
import { WORKTREE_RELEASE_BOT_HOME_METHOD } from './bots-home-release'

export const LOCAL_BOT_METHODS = [
  ...BOT_METHODS,
  ...BOT_GROUP_METHODS,
  BOT_TAKE_OVER_METHOD,
  BOT_RUN_SEND_AGAIN_METHOD,
  ...BOT_LOOK_AROUND_METHODS,
  ...BOT_TIDY_UP_METHODS,
  ...BOT_WORK_METHODS,
  ...BOT_ITEMS_METHODS,
  BOT_REQUEST_OUTCOME_METHOD,
  WORKTREE_RELEASE_BOT_HOME_METHOD
] as const
