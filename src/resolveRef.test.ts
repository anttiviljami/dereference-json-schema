import { resolveRefSync } from './resolveRef';
import { JSONSchema } from './types';

describe('resolveRef', () => {
  it('should resolve simple refs', () => {
    // given
    const schema: JSONSchema = {
      schemas: {
        Person: {
          type: 'object',
        },
        Name: {
          type: 'string',
        },
      },
    };

    // when
    const result1 = resolveRefSync(schema, '#/schemas/Person');
    const result2 = resolveRefSync(schema, '#/schemas/Name');

    // then
    expect(result1).toEqual({
      type: 'object',
    });
    expect(result2).toEqual({
      type: 'string',
    });
  });

  it('should resolve bad refs as null', () => {
    // given
    const schema: JSONSchema = {
      schemas: {
        Person: {
          type: 'object',
        },
      },
    };

    // when
    const result = resolveRefSync(schema, '#/schemas/Name');

    // then
    expect(result).toBeNull();
  });

  it('should cache resolved refs', () => {
    // given
    const schema: JSONSchema = {
      schemas: {
        Person: {
          type: 'object',
        },
      },
    };
    const result1 = resolveRefSync(schema, '#/schemas/Person');

    // when

    // replace Person schema with a new object
    // since we are caching the resolved ref, this should not affect the next result
    schema.schemas.Person = {
      type: 'string',
    };
    const result2 = resolveRefSync(schema, '#/schemas/Person');

    // then
    expect(result1).toEqual({
      type: 'object',
    });
    expect(result1).toBe(result2);
  });
});
