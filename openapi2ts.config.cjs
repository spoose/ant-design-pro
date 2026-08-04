const { join } = require('node:path');

module.exports = {
  schemaPath: join(__dirname, 'openapi/jushu-api.json'),
  serversPath: join(__dirname, 'src/services'),
  projectName: 'jushu-api',
  namespace: 'JushuAPI',
  requestLibPath: "import { request } from '@umijs/max'",
  requestOptionsType: '{ [key: string]: unknown }',
  mockFolder: undefined,
  hook: {
    customType(schema, namespace, getType) {
      if (schema?.type === 'object' && schema.additionalProperties === true) {
        return 'Record<string, unknown>';
      }
      if (!schema?.nullable) return undefined;
      return `${getType(schema, namespace)} | null`;
    },
  },
};
