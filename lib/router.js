const swaggerUi = require('swagger-ui-express')

const generateSwagger = require('./generate-swagger')
const asyncMiddleware = require('./middleware/async')
const requestValidator = require('./middleware/request-validator')
const responseValidator = require('./middleware/response-validator')

const handle = (
  app,
  method,
  routeDefinitions,
  { validateResponses },
  { url, handlers, schema, isPublic, tags, summary, description, warnOnRequestValidationError }
) => {
  let _handlers = []

  if (routeDefinitions[method][url]) {
    throw new Error(`Route already defined: (${method}) ${url}`)
  }

  routeDefinitions[method][url] = { url, schema, isPublic, tags, summary, description }

  if (schema && schema.request) {
    _handlers.push(requestValidator({ schema: schema.request, warnOnRequestValidationError }))
  }

  if (validateResponses && schema && schema.responses) {
    _handlers.push(responseValidator({ schema: schema.responses }))
  }

  _handlers = [..._handlers, ...handlers].map(handler =>
    asyncMiddleware(handler)
  )
  app[method](url, _handlers)
}

module.exports = exports = (app, opts = { }) => {
  let routeDefinitions = {
    get: {},
    post: {},
    put: {},
    delete: {},
    patch: {}
  }

  return {
    app: app,
    get: handle.bind(null, app, 'get', routeDefinitions, opts),
    post: handle.bind(null, app, 'post', routeDefinitions, opts),
    put: handle.bind(null, app, 'put', routeDefinitions, opts),
    delete: handle.bind(null, app, 'delete', routeDefinitions, opts),
    patch: handle.bind(null, app, 'patch', routeDefinitions, opts),
    schema: ({ url, schema }) => {
      const response = ['get', 'post', 'put'].reduce((response, verb) => {
        if (schema[verb]) {
          const requestSchema = schema[verb].request
          if (requestSchema) {
            response[verb] = Object.keys(requestSchema).reduce(
              (schema, key) => {
                schema[key] = requestSchema[key].toJSONSchema()
                return schema
              },
              {}
            )
          }
        }
        return response
      }, {})
      app.options(url, (req, res, next) => {
        res.json(response)
      })
    },
    toSwagger: () => {
      return generateSwagger(routeDefinitions, opts.swaggerBaseProperties)
    },
    serveSwagger: (path) => {
      app.use(path, swaggerUi.serve, swaggerUi.setup(generateSwagger(routeDefinitions, opts.swaggerBaseProperties)))
    }
  }
}
