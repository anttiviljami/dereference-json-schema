import { printReceived } from 'jest-matcher-utils';
import { dereferenceSync } from './dereference';
import { JSONSchema } from './types';

describe('dereferenceSync', () => {
  it('should return a copy of the same schema if it has no $ref', () => {
    // given
    const schema: JSONSchema = {
      type: 'object',
      properties: {
        name: {
          type: 'string',
        },
      },
    };

    // when
    const result = dereferenceSync(schema);

    // then
    expect(result).toEqual(schema);
    expect(result).not.toBe(schema);
    expect(result).not.toContainRefs();
  });

  it('should dereference simple schema', () => {
    // given
    const schema: JSONSchema = {
      schemas: {
        Person: {
          type: 'object',
          properties: {
            name: {
              $ref: '#/schemas/Name',
            },
          },
        },
        Name: {
          type: 'string',
        },
      },
    };

    // when
    const result = dereferenceSync(schema);

    // then
    expect(result).toEqual({
      schemas: {
        Person: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
            },
          },
        },
        Name: {
          type: 'string',
        },
      },
    });
    expect(result).not.toContainRefs();
  });

  it('should dereference a schema with deeply nested $refs', () => {
    // given
    const schema: JSONSchema = {
      schemas: {
        Person: {
          type: 'object',
          properties: {
            name: {
              $ref: '#/schemas/Name',
            },
          },
        },
        Name: {
          type: 'object',
          properties: {
            first: {
              $ref: '#/schemas/FirstName',
            },
            last: {
              $ref: '#/schemas/LastName',
            },
          },
        },
        FirstName: {
          type: 'string',
        },
        LastName: {
          type: 'string',
        },
      },
    };

    // when
    const result = dereferenceSync(schema);

    // then
    expect(result).toEqual({
      schemas: {
        Person: {
          type: 'object',
          properties: {
            name: {
              type: 'object',
              properties: {
                first: {
                  type: 'string',
                },
                last: {
                  type: 'string',
                },
              },
            },
          },
        },
        Name: {
          type: 'object',
          properties: {
            first: {
              type: 'string',
            },
            last: {
              type: 'string',
            },
          },
        },
        FirstName: {
          type: 'string',
        },
        LastName: {
          type: 'string',
        },
      },
    });
    expect(result).not.toContainRefs();
  });

  it('should dereference a schema with circular $refs', () => {
    // given
    const schema: JSONSchema = {
      schemas: {
        Person: {
          type: 'object',
          properties: {
            name: {
              $ref: '#/schemas/Person',
            },
          },
        },
      },
    };

    // when
    const result = dereferenceSync(schema);

    // then
    const CircularPerson = {
      type: 'object',
      properties: {
        name: {
          $ref: '#/schemas/Person',
        },
      },
    };
    // @ts-ignore
    CircularPerson.properties.name = CircularPerson;

    expect(result).toEqual({
      schemas: {
        Person: CircularPerson,
      },
    });
    expect(result).not.toContainRefs();
  });

  it('should replace a bad ref with null', () => {
    // given
    const schema: JSONSchema = {
      schemas: {
        Person: {
          type: 'object',
          properties: {
            name: {
              $ref: '#/schemas/Name',
            },
          },
        },
      },
    };

    // when
    const result = dereferenceSync(schema);

    // then
    expect(result).toEqual({
      schemas: {
        Person: {
          type: 'object',
          properties: {
            name: null,
          },
        },
      },
    });
    expect(result).not.toContainRefs();
  });

  it('should cache the dereferenced schema', () => {
    // given
    const schema: JSONSchema = {
      schemas: {
        Person: {
          type: 'object',
          properties: {
            name: {
              $ref: '#/schemas/Name',
            },
          },
        },
        Name: {
          type: 'string',
        },
      },
    };
    const result1 = dereferenceSync(schema);

    // when

    // mutate schema
    // since we are caching the clone, dereferenced schema, this should not affect the result
    schema.schemas.Person = {
      type: 'string',
    };
    const result2 = dereferenceSync(schema);

    // then
    expect(result1).toEqual({
      schemas: {
        Person: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
            },
          },
        },
        Name: {
          type: 'string',
        },
      },
    });
    expect(result1).toBe(result2);
  });
});

declare global {
  namespace jest {
    interface Matchers<R> {
      toContainRefs(): CustomMatcherResult;
    }
  }
}

expect.extend({
  toContainRefs(received: unknown) {
    const schemaPrinted = printReceived(received);

    const refsFound = schemaPrinted.match(/\$ref/g);

    return {
      pass: Boolean(refsFound),
      message: () => {
        return `expected ${schemaPrinted} ${refsFound ? 'to not contain' : 'to contain'} $refs`;
      },
    };
  },
});
