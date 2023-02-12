import { klona } from './klona';
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
          return resolveRef(cloned, current['$ref']);
        }

        for (const key in current) {
          current[key] = resolve(current[key], `${path}/${key}`);
        }
      }
    }

    return current;
  };

  return resolve(cloned, '#') as DereferencedJSONSchema;
};

/**
 * Resolves a $ref pointer in a schema and returns the referenced value.
 */
export const resolveRef = (schema: JSONSchema, ref: string): unknown => {
  const path = ref.split('/').slice(1);

  let current = schema;
  for (const segment of path) {
    if (!current || typeof current !== 'object') {
      // we've reached a dead end
      return null;
    }
    current = current[segment];
  }
  return current;
};
