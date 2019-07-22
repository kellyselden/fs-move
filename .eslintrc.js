module.exports = {
  root: true,
  parserOptions: {
    ecmaVersion: 2018
  },
  env: {
    es6: true
  },
  extends: [
    'sane-node'
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
      extends: [
        'plugin:mocha/recommended'
      ],
      rules: {
        'mocha/no-hooks-for-single-case': 0,
        'mocha/no-setup-in-describe': 0,
        'mocha/no-nested-tests': 0
      }
    }
  ]
};
