const {nestedRelationshipProperties, nestedRelationshipRefs, makeUnique} = require('./relationships_helper')

const definitions = {
  tag: {
    type: 'object',
    'x-meta': {
      relationship: {
        type: 'many-to-one',
        toTypes: ['tags']
      }
    },
    properties: {
      id: {type: 'string'},
      type: {type: 'string'}
    },
    additionalProperties: false
  },
  tagArray: {
    type: 'array',
    'x-meta': {
      relationship: {
        type: 'one-to-many',
        toTypes: ['tags']
      }
    },
    items: {
      type: 'object',
      properties: {
        id: {type: 'string'},
        type: {type: 'string'}
      },
      additionalProperties: false
    }
  }
}

const schema = {
  type: 'object',
  properties: {
    foobar: {type: 'string'},
    tag: definitions.tag,
    tagArray: definitions.tagArray,
    nestedObj: {
      type: 'object',
      properties: {
        foobar: {type: 'string'},
        tag: definitions.tag,
        tagArray: definitions.tagArray,
        nestedArray: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              foobar: {type: 'string'},
              tagArray: definitions.tagArray
            }
          }
        }
      }
    }
  }
}

describe('relationships_helper', () => {
  test('nestedRelationshipProperties - extracts relationship properties and paths', () => {
    expect(nestedRelationshipProperties(schema)).toEqual([
      {
        path: ['tag'],
        property: definitions.tag
      },
      {
        path: ['tagArray'],
        property: definitions.tagArray
      },
      {
        path: ['nestedObj', 'tag'],
        property: definitions.tag
      },
      {
        path: ['nestedObj', 'tagArray'],
        property: definitions.tagArray
      },
      {
        path: ['nestedObj', 'nestedArray', 'tagArray'],
        property: definitions.tagArray
      }
    ])
  })

  test('nestedRelationshipRefs - gets relationship ids (references) and value paths corresponding to a relationship path (expands array)', () => {
    const doc = {
      tag: {id: '1', type: 'tags'},
      tagArray: [{id: '2', type: 'tags'}, {id: '3', type: 'tags'}],
      nestedObj: {
        tag: {id: '4', type: 'tags'},
        tagArray: [{id: '5', type: 'tags'}, {id: '6', type: 'tags'}],
        nestedArray: [
          {
            tagArray: [{id: '7', type: 'tags'}, {id: '8', type: 'tags'}]
          },
          {
            tagArray: [{id: '9', type: 'tags'}, {id: '10', type: 'tags'}]
          }
        ]
      }
    }

    expect(nestedRelationshipRefs(doc, ['foo.bar'])).toEqual([])
    expect(nestedRelationshipRefs(doc, ['tag'])).toEqual([{value: [{id: '1', type: 'tags'}], path: ['tag']}])
    expect(nestedRelationshipRefs(doc, ['tagArray'])).toEqual([{value: [{id: '2', type: 'tags'}, {id: '3', type: 'tags'}], path: ['tagArray']}])
    expect(nestedRelationshipRefs(doc, ['nestedObj', 'tag'])).toEqual([{value: [{id: '4', type: 'tags'}], path: ['nestedObj', 'tag']}])
    expect(nestedRelationshipRefs(doc, ['nestedObj', 'tagArray'])).toEqual([{value: [{id: '5', type: 'tags'}, {id: '6', type: 'tags'}], path: ['nestedObj', 'tagArray']}])
    expect(nestedRelationshipRefs(doc, ['nestedObj', 'nestedArray', 'tagArray'])).toEqual([
      {value: [{id: '7', type: 'tags'}, {id: '8', type: 'tags'}], path: ['nestedObj', 'nestedArray', 0, 'tagArray']},
      {value: [{id: '9', type: 'tags'}, {id: '10', type: 'tags'}], path: ['nestedObj', 'nestedArray', 1, 'tagArray']}
    ])
  })

  test('makeUnique - will make id references in one-to-many relationships unique', () => {
    const doc = {
      foobar: 'hello',
      tag: {id: '1', type: 'tags'},
      tagArray: [{id: '2', type: 'tags'}, {id: '3', type: 'tags'}, {id: '2', type: 'tags'}],
      nestedObj: {
        tag: {id: '4', type: 'tags'},
        tagArray: [{id: '5', type: 'tags'}, {id: '6', type: 'tags'}, {id: '6', type: 'tags'}],
        nestedArray: [
          {
            tagArray: [{id: '7', type: 'tags'}, {id: '8', type: 'tags'}]
          },
          {
            tagArray: [{id: '9', type: 'tags'}, {id: '10', type: 'tags'}, {id: '9', type: 'tags'}]
          }
        ]
      }
    }
    const options = {model: {schema}}
    const expected = {
      foobar: 'hello',
      tag: {id: '1', type: 'tags'},
      tagArray: [{id: '2', type: 'tags'}, {id: '3', type: 'tags'}],
      nestedObj: {
        tag: {id: '4', type: 'tags'},
        tagArray: [{id: '5', type: 'tags'}, {id: '6', type: 'tags'}],
        nestedArray: [
          {
            tagArray: [{id: '7', type: 'tags'}, {id: '8', type: 'tags'}]
          },
          {
            tagArray: [{id: '9', type: 'tags'}, {id: '10', type: 'tags'}]
          }
        ]
      }
    }
    expect(makeUnique(doc, options)).toEqual(expected)
  })
})
