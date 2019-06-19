class HTTPError extends Error {
  constructor (code, message, errors) {
    super(message)
    Error.captureStackTrace(this, HTTPError)
    this.code = code
    this.errors = errors || [message]
    this.responseJson = {
      status: this.code,
      message: this.message,
      errors: this.errors
    }
  }
}

module.exports = exports = HTTPError
