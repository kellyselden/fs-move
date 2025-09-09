'use strict';

const {
  defineConfig,
} = require('eslint/config');

const config = require('@kellyselden/eslint-config');

module.exports = defineConfig([
  config,

  {
    rules: {
      'mocha/no-hooks-for-single-case': 'off',
      'mocha/no-setup-in-describe': 'off',
      'mocha/no-nested-tests': 'off',
    },
  },
]);
