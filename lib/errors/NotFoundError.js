const HTTPError = require('./HTTPError')

class NotFoundError extends HTTPError {
  constructor (message, errors) {
    super(404, message, errors)
  }
}

module.exports = exports = NotFoundError
