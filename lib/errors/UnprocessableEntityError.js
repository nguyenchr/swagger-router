const HTTPError = require('./HTTPError')

class UnprocessableEntityError extends HTTPError {
  constructor (message, errors) {
    super(422, message, errors)
  }
}

module.exports = exports = UnprocessableEntityError
