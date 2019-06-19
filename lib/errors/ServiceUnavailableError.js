const HTTPError = require('./HTTPError')

class ServiceUnavailableError extends HTTPError {
  constructor (message, errors) {
    super(503, message, errors)
  }
}

module.exports = exports = ServiceUnavailableError
