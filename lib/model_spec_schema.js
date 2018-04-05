module.exports = {
  type: 'object',
  definitions: {
    callback: {
      type: 'object',
      properties: {
        before_validation: {type: 'array'},
        after_validation: {type: 'array'},
        after_save: {type: 'array'},
        before_delete: {type: 'array'},
        after_delete: {type: 'array'}
      },
      additionalProperties: false
    }
  },
  properties: {
    coll: {
      type: 'string'
    },
    schema: {
      type: 'object'
    },
    features: {
      type: 'array',
      items: {type: 'string'}
    },
    callbacks: {
      type: 'object',
      properties: {
        save: {$ref: '#/definitions/callback'},
        create: {$ref: '#/definitions/callback'},
        update: {$ref: '#/definitions/callback'},
        delete: {$ref: '#/definitions/callback'}
      },
      additionalProperties: false
    },
    relationships: {
      type: 'object',
      patternProperties: {
        '^[a-z_]+$': {
          type: 'object',
          properties: {
            from_coll: {type: 'string'},
            from_model: {type: ['null', 'string']},
            from_field: {type: 'string'},
            to_field: {type: 'string'},
            to_coll: {type: 'string'},
            to_model: {type: ['null', 'string']},
            find_opts: {
              type: 'object',
              properties: {
                sort: {type: 'object'},
                'per-page': {type: 'integer'},
                fields: {type: 'array'}
              },
              additionalProperties: false
            }
          },
          required: ['from_coll', 'from_field', 'to_field', 'to_coll'],
          additionalProperties: false
        }
      },
      additionalProperties: false
    },
    indexes: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          fields: {type: 'array'},
          unique: {type: 'boolean'},
          coll: {type: 'string'}
        },
        required: ['fields']
      }
    },
    routes: {
      type: 'array',
      items: {
        enum: ['list', 'get', 'create', 'update', 'delete']
      }
    }
  },
  required: ['coll', 'schema']
}
