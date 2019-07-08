const HTTPError = require('./HTTPError')

class UnauthorizedError extends HTTPError {
  constructor (message, errors) {
    super(401, message, errors)
  }
}

module.exports = exports = UnauthorizedError
