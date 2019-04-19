module.exports = {
  root: true,
  parserOptions: {
    ecmaVersion: 2017
  },
  env: {
    es6: true,
    node: true
  },
  plugins: [
    'node'
  ],
  extends: [
    'sane',
    'plugin:node/recommended'
  ],
  overrides: [
    {
      files: [
        'test/**'
      ],
      env: {
        mocha: true
      },
      plugins: [
        'mocha'
      ],
      rules: {
        'mocha/no-exclusive-tests': 'error'
      },
    },
    {
      files: [
        'bin/**'
      ],
      rules: {
        'no-console': 'off',
        'no-process-exit': 'off'
      },
    }
  ]
};
