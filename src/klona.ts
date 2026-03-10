/**
 * klona/json - MIT License
 *
 * https://github.com/lukeed/klona/blob/master/license
 *
 * Extended with circular reference tracking to support
 * dereferenced OpenAPI schemas that contain self-referencing types.
 */
export function klona<T>(val: T, seen?: Map<unknown, unknown>): T {
  if (!seen) seen = new Map();

  let index, out, tmp;

  if (Array.isArray(val)) {
    if (seen.has(val)) return seen.get(val) as T;
    out = Array((index = val.length));
    seen.set(val, out);
    while (index--) out[index] = (tmp = val[index]) && typeof tmp === 'object' ? klona(tmp, seen) : tmp;
    return out;
  }

  if (Object.prototype.toString.call(val) === '[object Object]') {
    if (seen.has(val)) return seen.get(val) as T;
    out = {}; // null
    seen.set(val, out);
    for (index in val) {
      if (index === '__proto__') {
        Object.defineProperty(out, index, {
          value: klona(val[index], seen),
          configurable: true,
          enumerable: true,
          writable: true,
        });
      } else {
        out[index] = (tmp = val[index]) && typeof tmp === 'object' ? klona(tmp, seen) : tmp;
      }
    }
    return out;
  }

  return val;
}
