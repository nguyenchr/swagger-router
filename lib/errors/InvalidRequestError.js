const HTTPError = require('./HTTPError')

class InvalidRequestError extends HTTPError {
  constructor (message, errors) {
    super(400, message, errors)
  }
}

module.exports = exports = InvalidRequestError
