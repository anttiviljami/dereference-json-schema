# dereference-json-schema

Dereference $ref pointers in JSONSchema or OpenAPI documents.

Zero dependencies. Synchronous core. Handles recursive refs.

## Usage

```
npm i dereference-json-schema
```

```js
import { dereferenceSync } from 'dereference-json-schema';

const schemaWithRefs = {
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

const schemaWithNoRefs = dereferenceSync(schemaWithRefs);
```
