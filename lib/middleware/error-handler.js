const { HTTPError, ServerError } = require('../errors')

module.exports = exports = (err, req, res, next) => {
  if (!(err instanceof HTTPError)) {
    console.error('Unexpected error', err)
    err = new ServerError(err.message || 'Something went wrong')
  }

  res.status(err.code).json(err.responseJson)
}
