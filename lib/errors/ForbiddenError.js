const HTTPError = require('./HTTPError')

class ForbiddenError extends HTTPError {
  constructor (message, errors) {
    super(403, message, errors)
  }
}

module.exports = exports = ForbiddenError
