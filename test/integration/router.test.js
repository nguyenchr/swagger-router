const chai = require('chai')
const express = require('express')
const bodyParser = require('body-parser')
const s = require('strummer')

const expect = chai.expect

const { router, errorHandler, errors } = require('../../index')

const swaggerBaseProperties = {
  swagger: '2.0',
  info: {
    description: 'This is my api',
    version: '1.0.0',
    title: 'My api',
    termsOfService: null,
    contact: {
      email: 'hi@hi.com'
    },
    license: {
      name: 'Apache 2.0',
      url: 'http://www.apache.org/licenses/LICENSE-2.0.html'
    }
  },
  host: 'https://myapi.com',
  basePath: '/',
  tags: [{
    name: 'Another tag'
  }],
  consumes: ['application/json'],
  produces: ['application/json'],
  schemes: [
    'https'
  ],
  paths: {},
  securityDefinitions: {},
  definitions: {}
}

const schema = {
  request: {
    query: s.objectWithOnly({
      hello: s.string(),
      world: s.string({ min: 2, max: 4 })
    }),
    params: s.objectWithOnly({
      id: s.integer({ parse: true })
    }),
    body: s.objectWithOnly({
      action: s.enum({ values: ['create', 'update'], verbose: true })
    })
  },
  responses: {
    201: s.objectWithOnly({
      id: s.integer()
    })
  }
}

describe('router', () => {
  let app
  let server
  let routerInstance

  beforeEach(async () => {
    server = express()
    server.use(bodyParser.json())
  })

  afterEach(async () => {
    return new Promise(resolve => app.close(resolve))
  })

  const genericHandler = async (req, res) => {
    return res.status(201).json({
      id: parseInt(req.params.id)
    })
  }

  const setupRoutes = async ({ handler, opts } = {}) => {
    routerInstance = router(server, opts || { validateResponses: true, swaggerBaseProperties })
    routerInstance.put({
      url: '/api/something/:id',
      schema,
      handlers: [handler || genericHandler],
      isPublic: true,
      tags: ['Something'],
      summary: 'This route is about something',
      description: 'This route does something'
    })
    routerInstance.serveSwagger('/docs')
    server.use(errorHandler)
    return new Promise(resolve => {
      app = server.listen(resolve)
    })
  }

  describe('request validation', () => {
    beforeEach(async () => {
      return setupRoutes()
    })

    it('should return if request is valid', async () => {
      const response = await chai.request(app).put('/api/something/123')
        .query({ hello: 'hi', world: 'yes' })
        .send({
          action: 'create'
        })

      expect(response.status).to.eql(201)
      expect(response.body).to.eql({ id: 123 })
    })

    it('should error if query params are invalid', async () => {
      const response = await chai.request(app).put('/api/something/123')
        .query({ world: 'yes' })
        .send({
          action: 'create'
        })

      expect(response.status).to.eql(400)
      expect(response.body).to.eql({
        status: 400,
        message: 'Invalid url query parameters',
        errors: [{
          path: 'hello',
          message: 'should be a string'
        }]
      })
    })

    it('should error if params are invalid', async () => {
      const response = await chai.request(app).put('/api/something/myid123')
        .query({ hello: 'hi', world: 'yes' })
        .send({
          action: 'create'
        })

      expect(response.status).to.eql(400)
      expect(response.body).to.eql({
        status: 400,
        message: 'Invalid url path parameters',
        errors: [{
          path: 'id',
          message: 'should be an integer',
          value: 'myid123'
        }]
      })
    })

    it('should error if payload is invalid', async () => {
      const response = await chai.request(app).put('/api/something/123')
        .query({ hello: 'hi', world: 'yes' })
        .send({
          action: 'delete'
        })

      expect(response.status).to.eql(400)
      expect(response.body).to.eql({
        status: 400,
        message: 'Invalid payload',
        errors: [{
          path: 'action',
          message: 'should be a valid enum value (create,update)',
          value: 'delete'
        }]
      })
    })
  })

  describe('response validation', () => {
    describe('when enabled', () => {
      beforeEach(async () => {
        return setupRoutes({
          handler: async (req, res) => {
            if (req.params.id === '456') {
              return res.status(201).json({
                id: parseInt(req.params.id),
                extraField: 'shouldnotbehere'
              })
            }
            if (req.params.id === '789') {
              return res.status(200).json({
                id: parseInt(req.params.id),
                thiswonterror: 'cos it is not validated'
              })
            }
            return res.status(201).json({
              id: parseInt(req.params.id)
            })
          }
        })
      })

      it('should error if response structure is incorrect', async () => {
        const response = await chai.request(app).put('/api/something/456')
          .query({ hello: 'hi', world: 'yes' })
          .send({
            action: 'create'
          })

        expect(response.status).to.eql(500)
        expect(response.body).to.eql({
          status: 500,
          message: 'Response body does not match the specified schema',
          errors: [{
            path: 'extraField',
            message: 'should not exist',
            value: 'shouldnotbehere'
          }]
        })
      })

      it('should return if status code not mapped', async () => {
        const response = await chai.request(app).put('/api/something/789')
          .query({ hello: 'hi', world: 'yes' })
          .send({
            action: 'create'
          })

        expect(response.status).to.eql(200)
        expect(response.body).to.eql({
          id: 789,
          thiswonterror: 'cos it is not validated'
        })
      })
      it('should return if response structure is valid', async () => {
        const response = await chai.request(app).put('/api/something/123')
          .query({ hello: 'hi', world: 'yes' })
          .send({
            action: 'create'
          })

        expect(response.status).to.eql(201)
        expect(response.body).to.eql({
          id: 123
        })
      })
    })
    describe('when disabled', () => {
      beforeEach(async () => {
        return setupRoutes({
          handler: async (req, res) => {
            return res.status(201).json({
              id: parseInt(req.params.id),
              extraField: 'shouldnotbehere'
            })
          },
          opts: { validateResponses: false, swaggerBaseProperties }
        })
      })

      it('should return because it is not validated', async () => {
        const response = await chai.request(app).put('/api/something/123')
          .query({ hello: 'hi', world: 'yes' })
          .send({
            action: 'create'
          })

        expect(response.status).to.eql(201)
        expect(response.body).to.eql({
          id: 123,
          extraField: 'shouldnotbehere'
        })
      })
    })
  })

  describe('toSwagger', () => {
    beforeEach(async () => {
      return setupRoutes()
    })

    it('should generate swagger', () => {
      expect(routerInstance.toSwagger()).to.eql({
        swagger: '2.0',
        info: {
          description: 'This is my api',
          version: '1.0.0',
          title: 'My api',
          termsOfService: null,
          contact: { email: 'hi@hi.com' },
          license: {
            name: 'Apache 2.0',
            url: 'http://www.apache.org/licenses/LICENSE-2.0.html'
          }
        },
        host: 'https://myapi.com',
        basePath: '/',
        tags: [
          { name: 'Another tag' },
          { name: 'Something' }
        ],
        consumes: ['application/json'],
        produces: ['application/json'],
        schemes: ['https'],
        paths: {
          '/api/something/:id': {
            put: {
              tags: ['Something'],
              summary: 'This route is about something',
              description: 'This route does something',
              responses: {
                201: {
                  schema: {
                    type: 'object',
                    properties: { id: { type: 'integer' } },
                    required: ['id'],
                    additionalProperties: false
                  },
                  description: '201 response'
                }
              },
              parameters: [
                { name: 'id', in: 'path', required: true, type: 'integer' },
                { name: 'hello', in: 'query', required: true, type: 'string' },
                { name: 'world', in: 'query', required: true, type: 'string' },
                {
                  name: 'payload',
                  in: 'body',
                  required: true,
                  schema: {
                    type: 'object',
                    properties: { action: { enum: ['create', 'update'] } },
                    required: ['action'],
                    additionalProperties: false
                  }
                }
              ]
            }
          }
        },
        securityDefinitions: {},
        definitions: {}
      })
    })
  })

  describe('serveSwagger', () => {
    beforeEach(async () => {
      return setupRoutes()
    })

    it('should serve swagger ui with swagger definition', async () => {
      const response = await chai.request(app).get('/docs')
      expect(response).to.be.html()
    })
  })

  describe('errorHandler', () => {
    beforeEach(async () => {
      return setupRoutes({
        handler: async (req, res) => {
          if (req.params.id === '456') {
            throw new errors.UnprocessableEntityError('Unprocessable yo', [{
              path: 'something',
              message: 'hahahehe'
            }])
          }
          if (req.params.id === '789') {
            throw new Error('Unknown error', [])
          }
          return res.status(201).json({
            id: parseInt(req.params.id)
          })
        }
      })
    })

    it('should handle known errors that are thrown', async () => {
      const response = await chai.request(app).put('/api/something/456')
        .query({ hello: 'hi', world: 'yes' })
        .send({
          action: 'create'
        })

      expect(response.status).to.eql(422)
      expect(response.body).to.eql({
        status: 422,
        message: 'Unprocessable yo',
        errors: [{
          path: 'something',
          message: 'hahahehe'
        }]
      })
    })

    it('should coerce unknown errors to a 500', async () => {
      const response = await chai.request(app).put('/api/something/789')
        .query({ hello: 'hi', world: 'yes' })
        .send({
          action: 'create'
        })

      expect(response.status).to.eql(500)
      expect(response.body).to.eql({
        status: 500,
        message: 'Unknown error',
        errors: ['Unknown error']
      })
    })
  })
})
