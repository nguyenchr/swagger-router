const { InvalidRequestError } = require('../errors')

module.exports = ({ schema }) => {
  return (req, res, next) => {
    if (schema.params) {
      let errors = schema.params.match(req.params)

      if (errors.length) {
        throw new InvalidRequestError('Invalid url path parameters', errors)
      }
    }
    if (schema.query) {
      let errors = schema.query.match(req.query)
      if (errors.length) {
        throw new InvalidRequestError('Invalid url query parameters', errors)
      }
    }
    if (schema.body) {
      let errors = schema.body.match(req.body)
      if (errors.length) {
        throw new InvalidRequestError('Invalid payload', errors)
      }
    }
    next()
  }
}
