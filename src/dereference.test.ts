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

  it('should allow a schema to be garbage collected once nothing else references it', async () => {
    if (typeof global.gc !== 'function') {
      throw new Error('This test must be run with --expose-gc (see the "test" script in package.json)');
    }

    // given
    let schema: JSONSchema | undefined = {
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
    const weakRef = new WeakRef(schema);
    dereferenceSync(schema);

    // when
    schema = undefined; // drop the only remaining strong reference

    global.gc();
    // let any pending microtasks release their references before a second,
    // final collection pass
    await new Promise((resolve) => setImmediate(resolve));
    global.gc();

    // then
    // if the cache were a plain Map keyed by the schema object, this would
    // still be reachable (and therefore defined) no matter how much we GC,
    // since the Map itself holds a strong reference to it forever.
    expect(weakRef.deref()).toBeUndefined();
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
