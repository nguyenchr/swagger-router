const jsonSchemaToParameters = (schema, { into }) => {
  if (!schema.properties) {
    return []
  }
  return Object.keys(schema.properties).map((property) => {
    const schemaProperty = schema.properties[property]
    let result = {
      name: property,
      in: into,
      required: schema.required ? schema.required.includes(property) : false,
      type: schemaProperty.type
    }
    if (schemaProperty.format) {
      result.format = schemaProperty.format
    }
    if (schemaProperty.description) {
      result.description = schemaProperty.description
    }
    if (schemaProperty.enum) {
      result.enum = schemaProperty.enum
    }
    return result
  })
}

const generateParams = (schema) => {
  if (!schema || !schema.params) {
    return []
  }
  return jsonSchemaToParameters(schema.params.toJSONSchema(), { into: 'path' })
}

const generateQueryParams = (schema) => {
  if (!schema || !schema.query) {
    return []
  }
  return jsonSchemaToParameters(schema.query.toJSONSchema(), { into: 'query' })
}

const generatePayload = (schema, definitions) => {
  if (!schema || !schema.body) {
    return []
  }
  let jsonSchema = schema.body.toJSONSchema()
  if (jsonSchema.name) {
    let name = jsonSchema.name
    addDefinitions(definitions, jsonSchema.name, jsonSchema)
    jsonSchema = {
      $ref: `#/definitions/${name}`
    }
  } else {
    findNestedDefinition(jsonSchema, definitions)
  }
  return [{
    name: schema.body.name ? schema.body.name : 'payload',
    in: 'body',
    required: true,
    schema: jsonSchema
  }]
}

const generateAuthDetails = (route) => route.isPublic ? [] : [{
  name: 'X-API-KEY',
  in: 'header',
  description: 'API Key header',
  required: true,
  default: '{{token}}',
  type: 'string'
}]

const findNestedDefinition = (jsonSchema, definitions) => {
  if (jsonSchema.items && jsonSchema.items.name) {
    let name = jsonSchema.items.name
    addDefinitions(definitions, name, jsonSchema.items)
    jsonSchema.items = {
      $ref: `#/definitions/${name}`
    }
  } else {
    for (let key in jsonSchema.properties) {
      let property = jsonSchema.properties[key]
      if (property.name) {
        let name = property.name
        addDefinitions(definitions, property.name, property)
        jsonSchema.properties[key] = {
          $ref: `#/definitions/${name}`
        }
      } else if (property.items && property.items.name) {
        let name = property.items.name
        addDefinitions(definitions, name, property.items)
        property.items = {
          $ref: `#/definitions/${name}`
        }
      } else {
        findNestedDefinition(property, definitions)
      }
    }
  }
}

const addDefinitions = (definitions, name, jsonSchema) => {
  if (!definitions[name]) {
    delete jsonSchema.name
    findNestedDefinition(jsonSchema, definitions)
    definitions[name] = jsonSchema
  }
}

const generateResponseDefinitions = (schema, definitions) => {
  if (!schema) {
    return {}
  }

  const responses = {}

  for (let responseCode of Object.keys(schema)) {
    const name = schema[responseCode].name
    const jsonSchema = schema[responseCode].toJSONSchema()
    if (name) {
      addDefinitions(definitions, name, jsonSchema)
      responses[responseCode] = {
        schema: {
          $ref: `#/definitions/${name}`
        },
        description: `${responseCode} response`
      }
    } else {
      findNestedDefinition(jsonSchema, definitions)
      responses[responseCode] = {
        schema: jsonSchema,
        description: `${responseCode} response`
      }
    }
  }

  return responses
}

const generateRoutes = (routeDefinitions, existingTags) => {
  let definitions = {}
  let tags = {}
  let paths = {}

  const existingTagsByName = existingTags.reduce((acc, tag) => {
    if (tag.name) {
      acc[tag.name] = true
    }
    return acc
  }, {})

  for (let method of Object.keys(routeDefinitions)) {
    for (let path of Object.keys(routeDefinitions[method])) {
      const swaggerPath = path.replace(/\/:([a-zA-Z]*)/g, '/{$1}')

      let route = routeDefinitions[method][path]
      if (!paths[swaggerPath]) {
        paths[swaggerPath] = {}
      }
      paths[swaggerPath][method] = {
        tags: route.tags || [],
        summary: route.summary || '',
        description: route.description || '',
        responses: generateResponseDefinitions(route.schema.responses, definitions),
        parameters: generateParams(route.schema.request)
          .concat(generateQueryParams(route.schema.request))
          .concat(generatePayload(route.schema.request, definitions))
          .concat(generateAuthDetails(route))
      }
      if (route.tags) {
        for (let tag of route.tags) {
          if (!existingTagsByName[tag]) {
            tags[tag] = true
          }
        }
      }
    }
  }

  return {
    definitions,
    paths,
    tags: Object.keys(tags).map(t => ({ name: t }))
  }
}

const generateSwagger = (routeDefinitions, baseProperties) => {
  const existingTags = baseProperties.tags || []
  const result = generateRoutes(routeDefinitions, existingTags)
  return {
    ...baseProperties,
    paths: result.paths,
    definitions: result.definitions,
    tags: existingTags.concat(result.tags)
  }
}

module.exports = generateSwagger
