/**
 * *Inter-Window Communications*
 * - A simple protocol to wrap communications between iframe and parent
 * - With Lootex ID logic
 */
export const CHANNEL_IDENTIFIER = 'LOOTEX_GAME_IWC'

/**
 * @typedef {object} IWCPayload
 * @property {string} channel (IWC Internal) Defaults to CHANNEL_IDENTIFIER
 * @property {string} action GameEvent uses 'type', IWCPayload uses 'action'
 * @property {object} data Object payload for the action
 */

export class IWCPayload {
  constructor(action = '', data = {}) {
    this.action = action
    this.data = data
    this.channel = CHANNEL_IDENTIFIER
  }
}

/**
 * @const IWCParentActions
 * @type {Array<string>}
 * @description Actions to be fired from the parent
 */
export const IWCParentActions = [
  'GRANTED_ADDRESS',
  'DENIED_ADDRESS',
  'GRANTED_CHALLENGE',
  'DENIED_CHALLENGE',
  'EMAIL_IS_AVAILABLE',
  'EMAIL_IS_TAKEN',
  'EMAIL_CHECK_FAILED',
  'USERNAME_IS_AVAILABLE',
  'USERNAME_IS_TAKEN',
  'USERNAME_CHECK_FAILED',
  'OTP_EMAIL_GRANTED',
  'OTP_EMAIL_DENIED',
  'GRANTED_SIGNATURE',
  'DENIED_SIGNATURE',
  'GRANTED_SIGNUP',
  'DENIED_SIGNUP',
  'GRANTED_SIGNIN',
  'DENIED_SIGNIN',
  'GRANTED_MINT',
  'DENIED_MINT'
]

/**
 * @const IWCChildActions
 * @type {Array<string>}
 * @description Actions to be fired from the child
 */
export const IWCChildActions = [
  'REQUEST_ADDRESS',
  'REQUEST_CHALLENGE',
  'CHECK_EMAIL_AVAILABILITY',
  'CHECK_USERNAME_AVAILABILITY',
  'SEND_OTP_EMAIL',
  'REQUEST_SIGNATURE',
  'REQUEST_SIGNUP',
  'REQUEST_SIGNIN',
  'REQUEST_MINT'
]

/**
 * @const DefinedGameEvents
 * @type {Array<string>}
 * @description Actions used by the GameEventEngine internally with Harlowe scene scripts
 */
export const DefinedGameEvents = []
