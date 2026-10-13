const neostandard = require('neostandard')
const prettierRecommended = require('eslint-plugin-prettier/recommended')

module.exports = [
  ...neostandard({ noStyle: true }),
  prettierRecommended,
  {
    rules: {
      'arrow-body-style': 'off',
      'prefer-arrow-callback': 'off'
    }
  }
]
