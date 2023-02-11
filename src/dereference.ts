import { klona } from './klona';
import type { DereferencedJSONSchema, JSONSchema } from './types';

/**
 * Resolves all $ref pointers in a schema and returns a new schema without any $ref pointers.
 */
export const dereferenceSync = (schema: JSONSchema) => {
  const refs = new Map<string, unknown>();
  const visitedNodes = new Set<unknown>();

  let cloned = klona(schema);

  // first pass: gather $ref pointers recursively from the schema
  const gather = (current: unknown, path: string) => {
    refs.set(path, current);

    if (typeof current === 'object' && current !== null) {
      // make sure we don't visit the same node twice
      if (visitedNodes.has(current)) {
        return current;
      }
      visitedNodes.add(current);

      if (Array.isArray(current)) {
        // array
        for (const [index, value] of current.entries()) {
          current[index] = gather(value, `${path}/${index}`);
        }
      } else {
        // object
        for (const [key, value] of Object.entries(current)) {
          // ignore $ref pointers while gathering
          if (key !== '$ref') {
            current[key] = gather(value, `${path}/${key}`);
          }
        }
      }
    }

    return current;
  };
  gather(cloned, '#');
  visitedNodes.clear();

  // second pass: resolve $ref pointers in place
  const resolve = (current: unknown, path: string) => {
    if (typeof current === 'object' && current !== null) {
      // make sure we don't visit the same node twice
      if (visitedNodes.has(current)) {
        return current;
      }
      visitedNodes.add(current);

      if (Array.isArray(current)) {
        // array
        for (const [index, value] of current.entries()) {
          current[index] = resolve(value, `${path}/${index}`);
        }
      } else {
        // object
        for (const [key, value] of Object.entries(current)) {
          if (key === '$ref' && typeof value === 'string' && refs.has(value)) {
            return refs.get(value);
          } else {
            current[key] = resolve(value, `${path}/${key}`);
          }
        }
      }
    }

    return current;
  };

  return resolve(cloned, '#') as DereferencedJSONSchema;
};
