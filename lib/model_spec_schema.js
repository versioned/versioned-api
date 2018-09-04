module.exports = {
  type: 'object',
  definitions: {
    callback: {
      type: 'object',
      properties: {
        before: {type: 'array'},
        after: {type: 'array'}
      },
      additionalProperties: false
    },
    afterCallback: {
      type: 'object',
      properties: {
        after: {type: 'array'}
      },
      additionalProperties: false
    },
    saveCallback: {
      type: 'object',
      properties: {
        beforeValidation: {type: 'array'},
        afterValidation: {type: 'array'},
        afterSave: {type: 'array'}
      },
      additionalProperties: false
    }
  },
  properties: {
    // Internal flag to keep track of whether model has been generated (features added) - not an idempotent operation
    generated: {type: 'boolean'},
    // Database names cannot be empty and must have fewer than 64 characters.
    // database names are case insensitive in MongoDB
    'x-meta': {
      type: 'object',
      properties: {
        spaceId: {type: 'string'},
        writeRequiresAdmin: {type: 'boolean'},
        dataModel: {type: 'boolean'},
        titleProperty: {type: 'string'},
        propertiesOrder: {type: 'array', items: {type: 'string'}},
        idSequence: {type: 'boolean'}
      },
      additionalProperties: false
    },
    coll: {
      type: 'string',
      minLength: 2,
      maxLength: 40,
      pattern: '^[a-z][a-z0-9_]*[a-z0-9]$'
    },
    type: {type: 'string'},
    schema: {
      type: 'object',
      properties: {
        type: {enum: ['object']},
        properties: {
          type: 'object'
        },
        required: {type: 'array', items: {type: 'string'}}
      },
      required: ['type', 'properties']
    },
    features: {
      type: 'array',
      items: {type: 'string'}
    },
    callbacks: {
      type: 'object',
      properties: {
        list: {$ref: '#/definitions/callback'},
        get: {$ref: '#/definitions/callback'},
        save: {$ref: '#/definitions/saveCallback'},
        create: {$ref: '#/definitions/saveCallback'},
        update: {$ref: '#/definitions/saveCallback'},
        delete: {$ref: '#/definitions/callback'},
        routeCreate: {$ref: '#/definitions/afterCallback'}
      },
      additionalProperties: false
    },
    indexes: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          keys: {type: 'object'},
          options: {type: 'object'}
        },
        additionalProperties: false,
        required: ['keys']
      }
    },
    routes: {
      anyOf: [
        {
          type: 'array',
          items: {enum: ['list', 'get', 'create', 'update', 'delete']}
        },
        {
          type: 'object',
          properties: {
            list: {type: 'object'},
            get: {type: 'object'},
            create: {type: 'object'},
            update: {type: 'object'},
            delete: {type: 'object'}
          },
          additionalProperties: false
        }
      ]
    }
  },
  required: ['type', 'coll', 'schema']
}
