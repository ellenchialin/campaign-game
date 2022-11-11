import Axios from 'axios'

export default async function handler(req, res) {
  const { body, method } = req
  const { captcha } = body

  if (method === 'POST') {
    if (!captcha) {
      return res.status(500).json({
        success: false,
        message: 'Please provide the required captcha code'
      })
    }

    try {
      console.log('captcha: ', captcha)

      const response = await Axios(
        `https://www.google.com/recaptcha/api/siteverify?secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${captcha}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        }
      )
      console.log('response: ', response.data)

      const captchaValidation = await response.data
      if (captchaValidation.success) {
        return res.status(200).json({ success: true })
      }

      return res.status(500).json({
        success: false,
        message: 'Invalid captcha code'
      })
    } catch (error) {
      console.log(error)
      return res
        .status(500)
        .json({ success: false, message: 'Something went wrong' })
    }
  }
  return res.status(404).send('Not found')
}
