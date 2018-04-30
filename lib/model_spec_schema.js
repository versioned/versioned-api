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
    coll: {
      type: 'string',
      minLength: 2,
      maxLength: 40,
      pattern: '^[a-z][a-z0-9_]*[a-z0-9]$'
    },
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
    relationships: {
      type: 'object',
      // patternProperties: {
      //   '^[a-z_]+$': {
      //     type: 'object',
      //     properties: {
      //       from_coll: {type: 'string'},
      //       from_model: {type: ['null', 'string']},
      //       from_field: {type: 'string'},
      //       to_field: {type: 'string'},
      //       to_coll: {type: 'string'},
      //       to_model: {type: ['null', 'string']},
      //       find_opts: {
      //         type: 'object',
      //         properties: {
      //           sort: {type: 'object'},
      //           'per-page': {type: 'integer'},
      //           fields: {type: 'array'}
      //         },
      //         additionalProperties: false
      //       }
      //     },
      //     required: ['from_coll', 'from_field', 'to_field', 'to_coll'],
      //     additionalProperties: false
      //   }
      // },
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
  required: ['coll', 'schema']
}
