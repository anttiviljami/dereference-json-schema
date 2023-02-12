import { klona } from './klona';
import { resolveRefSync } from './resolveRef';
import type { DereferencedJSONSchema, JSONSchema } from './types';

const cache = new Map<JSONSchema, DereferencedJSONSchema>();

/**
 * Resolves all $ref pointers in a schema and returns a new schema without any $ref pointers.
 */
export const dereferenceSync = (schema: JSONSchema) => {
  if (cache.has(schema)) {
    return cache.get(schema);
  }

  const visitedNodes = new Set<unknown>();
  const cloned = klona(schema);

  const resolve = (current: unknown, path: string) => {
    if (typeof current === 'object' && current !== null) {
      // make sure we don't visit the same node twice
      if (visitedNodes.has(current)) {
        return current;
      }
      visitedNodes.add(current);

      if (Array.isArray(current)) {
        // array
        for (let index = 0; index < current.length; index++) {
          current[index] = resolve(current[index], `${path}/${index}`);
        }
      } else {
        // object
        if ('$ref' in current && typeof current['$ref'] === 'string') {
          return resolveRefSync(cloned, current['$ref']);
        }

        for (const key in current) {
          current[key] = resolve(current[key], `${path}/${key}`);
        }
      }
    }

    return current;
  };

  const result = resolve(cloned, '#') as DereferencedJSONSchema;
  cache.set(schema, result);
  return result;
};
