const HTTPError = require('./HTTPError')

class ServerError extends HTTPError {
  constructor (message, errors) {
    super(500, message, errors)
  }
}

module.exports = exports = ServerError
