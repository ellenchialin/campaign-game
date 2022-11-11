import { Contract, providers, utils, constants, Wallet } from 'ethers'

import { CHANNEL_IDENTIFIER, IWCChildActions } from './shared'

class IWCPayload {
  constructor(action = '', data = {}) {
    this.action = action
    this.data = data
    this.channel = CHANNEL_IDENTIFIER
  }
}

export class ShellEventEngine extends EventTarget {
  // @dev event helpers
  once(eventName, listener) {
    this.addEventListener(eventName, listener, { once: true })
  }
  on(eventName, listener) {
    this.addEventListener(eventName, listener)
  }
  off(eventName, listener) {
    this.removeEventListener(eventName, listener)
  }
  // @dev dialogue/user input helpers
  //      NOTE: replace native calls with your own
  _alert(message = '') {
    alert(message)
  }
  _confirm(message = '') {
    return confirm(message)
  }
  _prompt(message = '', defaultValue = '') {
    return prompt(message, defaultValue)
  }
  /**
   * *ShellEventEngine*
   * - Harlowe/Twine Interactive Scripting Engine Support
   * @class ShellEventEngine
   * @augments EventTarget
   * @param {string} apiBaseUrl Endpoint prefix for communication with API back-end, without trailing /
   * @param {string} deploymentOrigin Deployment TLD for messaging to work
   * @param {HTMLIFrameElement} iframe the child iframe reference
   */
  constructor(
    apiBaseUrl = 'https://lootex.dev',
    // deploymentOrigin = 'http://localhost:3000',
    deploymentOrigin = 'https://campaign-game.vercel.app',
    iframe
  ) {
    super()
    this._channelIdentifier = CHANNEL_IDENTIFIER
    this._apiBaseUrl = apiBaseUrl
    this._deploymentOrigin = deploymentOrigin
    this._child = iframe
    window.addEventListener('message', (event) => {
      this._handleMessage(event)
    })
  }
  /**
   * @private
   * @function _handleMessage
   * @description From-child message handler, we interact with the outside world and pass
   *              the results back to child by calling self._postMessage()
   * @param {MessageEvent} event MessageEvent object fired from the child iframe window
   */
  _handleMessage(event) {
    const self = this
    /** @type {IWCPayload} */
    const payload = event.data
    if (!IWCChildActions.includes(payload.action)) return
    switch (payload.action) {
      // @dev data: {}
      case 'REQUEST_ADDRESS':
        self.handleRequestAccounts()
        break
      // @dev data: { address: string }
      case 'REQUEST_CHALLENGE':
        self.handleGetChallenge(payload.data.address)
        break
      // @dev data: { original: string }
      case 'REQUEST_SIGNATURE':
        self.handleRequestSignature(payload.data.original)
        break
      // @dev data: { email: string }
      case 'CHECK_EMAIL_AVAILABILITY':
        self.handleCheckUserEmail(payload.data.email)
        break
      // @dev data: { username: string }
      case 'CHECK_USERNAME_AVAILABILITY':
        self.handleCheckUsername(payload.data.username)
        break
      // @dev data: { email: string }
      case 'SEND_OTP_EMAIL':
        self.handleSendOtpEmail(payload.data.email)
        break
      // @dev data: { address: string, username: string, email: string, otpCode: string, signature: string }
      case 'REQUEST_SIGNUP':
        self.handleSignUp(
          payload.data.address,
          payload.data.username,
          payload.data.email,
          payload.data.otpCode,
          payload.data.signature
        )
        break
      // @dev data: { address: string, signature: string }
      case 'REQUEST_SIGNIN':
        self.handleSignIn(payload.data.address, payload.data.signature)
        break

      case 'REQUEST_MINT':
        self.handleMintNFT(payload.data.address, payload.data.referrer)
        break
    }
  }
  /**
   * @private
   * @function _postMessage
   * @description sends an IWCPayload to the child iframe window
   * @param {IWCPayload} payload
   */
  _postMessage(payload = new IWCPayload()) {
    this._child.contentWindow.postMessage(payload, this._deploymentOrigin)
  }
  /**
   * @function postToChild
   * @description *explicitly* sends an IWCPayload to the child iframe window
   * @param {string} action action name
   * @param {object} data data object to send
   */
  postToChild(action = '', data = {}) {
    const payload = new IWCPayload(action, data)
    this._postMessage(payload)
  }
  // @dev wallet-related functions
  /**
   * @async
   * @function handleRequestAccounts
   * @description "Connect Wallet" for injected providers (wallet browsers or browsers with wallet extensions)
   * @return {string | null} address
   */
  async handleRequestAccounts() {
    const self = this
    if (!window.ethereum) {
      self._alert('handleRequestAccounts: no injected provider available')
      return null
    }
    return window.ethereum
      .request({
        method: 'eth_requestAccounts'
      })
      .then((addresses) => {
        if (addresses.length > 0) {
          self._postMessage(
            new IWCPayload('GRANTED_ADDRESS', { address: addresses[0] })
          )
          return addresses[0]
        } else {
          // change DENIED_ACCESS to DENIED_ADDRESS
          self._postMessage(new IWCPayload('DENIED_ADDRESS'))
          return null
        }
      })
      .catch(() => {
        self._postMessage(new IWCPayload('DENIED_ADDRESS'))
        return null
      })
  }
  /**
   * @async
   * @function handleRequestSignature
   * @description generates a signature according to the provider specs
   * @param {string} digestToSign the content to generate signature from
   * @return {string | null} generated signature
   */
  async handleRequestSignature(digestToSign = '') {
    const self = this
    if (!window.ethereum) {
      self._alert('handleRequestSignature: no injected provider available')
      return null
    }
    return window.ethereum
      .request({
        method: 'eth_requestAccounts'
      })
      .then((addresses) => {
        if (addresses.length === 0) {
          self._postMessage(new IWCPayload('DENIED_SIGNATURE'))
          return null
        }
        const addressToUse = addresses[0]
        const signingRpcMethod = window.ethereum.isMetaMask
          ? 'personal_sign'
          : 'eth_sign'
        const utf8ToHex = (str) => {
          return (
            '0x' +
            Array.from(str)
              .map((c) =>
                c.charCodeAt(0) < 128
                  ? c.charCodeAt(0).toString(16)
                  : encodeURIComponent(c).replace(/\%/g, '').toLowerCase()
              )
              .join('')
          )
        }
        const _digestToSign = utf8ToHex(digestToSign)
        const params = window.ethereum.isMetaMask
          ? [_digestToSign, addressToUse]
          : [addressToUse, _digestToSign]
        window.ethereum
          .request({
            method: signingRpcMethod,
            params
          })
          .then((sig) => {
            self._postMessage(
              new IWCPayload('GRANTED_SIGNATURE', { signature: sig })
            )
          })
          .catch(() => {
            self._postMessage(new IWCPayload('DENIED_SIGNATURE'))
            return null
          })
      })
      .catch(() => {
        self._postMessage(new IWCPayload('DENIED_SIGNATURE'))
        return null
      })
  }
  /**
   * @private
   * @async
   * @function _getRequest
   * @description GET request to a specified endpoint
   * @param {string} endpoint API endpoint, e.g. /api/v3/auth/challenge/get
   * @param {object} query HTTP query parameters
   * @return {string | object} responseContent
   */
  async _getRequest(endpoint = '', query = {}) {
    if (!endpoint) return
    const self = this
    const queryString = new URLSearchParams(query).toString()
    const url =
      queryString.length === 0
        ? `${self._apiBaseUrl}${endpoint}`
        : `${self._apiBaseUrl}${endpoint}?${queryString}`
    const rawResponse = await fetch(url)
    const contentType = rawResponse.headers.get('content-type')
    const responseContent =
      contentType.toLowerCase().indexOf('json') !== -1
        ? rawResponse.json()
        : rawResponse.text()
    if (!rawResponse.ok) throw responseContent
    return responseContent
  }
  /**
   * @private
   * @async
   * @function _postRequest
   * @description POST request to a specified endpoint
   * @param {string} endpoint API endpoint, e.g. /api/v3/auth/web3/sign-up
   * @param {object | FormData | any} body request body/payload, usually an object
   * @param {object} query HTTP query parameters
   * @return {string | object} responseContent
   */
  async _postRequest(endpoint = '', body = {}, query = {}) {
    if (!endpoint) return
    const self = this
    const queryString = new URLSearchParams(query).toString()
    const url =
      queryString.length === 0
        ? `${self._apiBaseUrl}${endpoint}`
        : `${self._apiBaseUrl}${endpoint}?${queryString}`
    const rawResponse = await fetch(url, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    })
    const contentType = rawResponse.headers.get('content-type')
    const responseContent =
      contentType.toLowerCase().indexOf('json') !== -1
        ? rawResponse.json()
        : rawResponse.text()
    if (!rawResponse.ok) throw responseContent
    return responseContent
  }
  // @dev BEGIN actual Lootex ID logic
  /**
   * @async
   * @function handleGetChallenge
   * @description gets a challenge for the user and post the results back to child
   * @param {string} address ETH address to get challenge for
   * @return {object} challenge object
   */
  async handleGetChallenge(address = '') {
    const self = this
    return self
      ._getRequest('/api/v3/auth/challenge/get', {
        chainFamily: 'ETH',
        address
      })
      .then((response) => {
        self._postMessage(new IWCPayload('GRANTED_CHALLENGE', response))
        return response
      })
      .catch((error) => {
        self._postMessage(
          new IWCPayload('DENIED_CHALLENGE', { error: error.message })
        )
        return error
      })
  }
  /**
   * @async
   * @function handleCheckUserEmail
   * @description checks email availability and posts the result back to child
   * @param {string} email email address to check the back-end against
   * @return {boolean} isAvailable
   */
  async handleCheckUserEmail(email = '') {
    const self = this
    return self
      ._getRequest('/api/v3/auth/email/available', {
        email
      })
      .then((response) => {
        // @REVISED
        if (response === 'true') {
          self._postMessage(new IWCPayload('EMAIL_IS_AVAILABLE'))
          return true
        }
        self._postMessage(new IWCPayload('EMAIL_IS_TAKEN'))
        return false
      })
      .catch((error) => {
        self._postMessage(
          new IWCPayload('EMAIL_CHECK_FAILED', { error: error.message })
        )
        return error
      })
  }
  /**
   * @async
   * @function handleCheckUsername
   * @description checks username availability and posts the result back to child
   * @param {string} username '@username' for the user to check
   */
  async handleCheckUsername(username = '') {
    const self = this
    const res = true
    if (res) {
      self._postMessage(new IWCPayload('USERNAME_IS_AVAILABLE'))
      return true
    }
    self._postMessage(new IWCPayload('USERNAME_IS_TAKEN'))
    return false
    // return self
    //   ._getRequest("/api/v3/auth/username/available", {
    //     username
    //   })
    //   .then((response) => {
    //     if (Boolean(response)) {
    //       self._postMessage(new IWCPayload("USERNAME_IS_AVAILABLE"));
    //       return true;
    //     }
    //     self._postMessage(new IWCPayload("USERNAME_IS_TAKEN"));
    //     return false;
    //   })
    //   .catch((error) => {
    //     self._postMessage(
    //       new IWCPayload("USERNAME_CHECK_FAILED", { error: error.message })
    //     );
    //     return error;
    //   });
  }
  /**
   * @async
   * @function handleSendOtpEmail
   * @description sends an OTP email to the user's mailbox
   * @param {string} email email address to get an OTP code with
   */
  async handleSendOtpEmail(email = '') {
    const self = this
    return self
      ._getRequest('/api/v3/auth/email/send', {
        email
      })
      .then(() => {
        self._postMessage(new IWCPayload('OTP_EMAIL_GRANTED'))
      })
      .catch((error) => {
        self._postMessage(
          new IWCPayload('OTP_EMAIL_DENIED', { error: error.message })
        )
        return error
      })
  }
  /**
   * @async
   * @function handleSignUp
   * @description make a call to the back-end API server for sign-up
   *              WARNING: Does NOT throw error if request failed
   * @param {string} address ETH wallet address
   * @param {string} username '@username' of the user
   * @param {string} email email address
   * @param {string} otpCode email-sent OTP code
   * @param {string} signature the signature generated from challenge
   */
  async handleSignUp(
    address = '',
    username = '',
    email = '',
    otpCode = '',
    signature = ''
  ) {
    if (!window.ethereum)
      throw new TypeError('handleSignUp: ETH injected provider required')
    const self = this
    const signUpPayload = {
      chainFamily: 'ETH',
      provider: 'COMPATIBLE_INJECTED',
      transport: 'Injected',
      address,
      username,
      email,
      otpCode,
      isErc1271Wallet: window.ethereum['isBlocto'] ? true : false,
      signature
    }
    return self
      ._postRequest('/api/v3/auth/web3/sign-up', signUpPayload)
      .then((response) => {
        self._postMessage(new IWCPayload('GRANTED_SIGNUP', response))
        return response
      })
      .catch((error) => {
        self._postMessage(
          new IWCPayload('DENIED_SIGNUP', { error: error.message })
        )
        return error
      })
  }
  /**
   * @async
   * @function handleSignIn
   * @description make a call to the back-end API server for sign-in
   *              WARNING: Does NOT throw error if request failed
   * @param {string} address wallet address
   * @param {string} signature the signature generated from challenge
   */
  async handleSignIn(address = '', signature = '') {
    if (!window.ethereum)
      throw new TypeError('handleSignUp: ETH injected provider required')
    const self = this
    const signInPayload = {
      chainFamily: 'ETH',
      provider: 'COMPATIBLE_INJECTED',
      transport: 'Injected',
      address,
      isErc1271Wallet: window.ethereum['isBlocto'] ? true : false,
      signature
    }
    return self
      ._postRequest('/api/v3/auth/web3/sign-in', signInPayload)
      .then((response) => {
        self._postMessage(new IWCPayload('GRANTED_SIGNIN'))
        return response
      })
      .catch((error) => {
        self._postMessage(
          new IWCPayload('DENIED_SIGNIN', { error: error.message })
        )
        return error
      })
  }

  /**
   * @addedByEllen
   * @TODO
    - replace referrer with user input referrer
    - replace address with campaign contract & tokenUri
   */
  async handleMintNFT(address = '', referrer = '') {
    const self = this
    if (!window.ethereum) {
      self._alert('handleMintNFT: no injected provider available')
      return null
    }
    const TOKEN_URI = 'ipfs://tokenUri/'
    // const TOKEN_URI = "ipfs://QmZjzDHNWC5F3upH1zFiKqjWLksonMYSWkmn7jhSmMiePY/";

    const provider = new providers.Web3Provider(window.ethereum)
    const signer = provider.getSigner()
    const campaignContract = new Contract(
      '0x98F30E87eBda3fa6577F52B113DC8aD4E199236c',
      abi,
      signer
    )

    const signatureSigner =
      provider &&
      new Wallet(
        'dced2ee6587d34b8653a75decb7caa3e5ccd1013fcfae910ba223791d2dfb5df',
        provider
      )

    const sign = async () => {
      const hash = utils.solidityKeccak256(
        ['address', 'string', 'address'],
        [address, TOKEN_URI, constants.AddressZero]
      )
      const hashBytes = utils.arrayify(hash)
      const flatSignature = await signatureSigner.signMessage(hashBytes)
      return flatSignature
    }

    const signature = await sign()

    return campaignContract
      .mint(signature, TOKEN_URI, constants.AddressZero)
      .then((nftTxn) => {
        self._postMessage(new IWCPayload('GRANTED_MINT'), {
          transaction: nftTxn.hash
        })

        console.log(`Succesfully minted. Transaction hash: ${nftTxn.hash}`)
        self._alert(`Succesfully minted. Transaction hash: ${nftTxn.hash}`)
        return nftTxn
      })
      .catch((error) => {
        console.error('DENIED_MINT', error?.message)
        self._postMessage(
          new IWCPayload('DENIED_MINT', { error: error.message })
        )
        return error
      })
  }
}
