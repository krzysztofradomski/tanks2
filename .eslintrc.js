module.exports = {
  extends: 'standard',
  rules: {
    'space-before-function-paren': [
      'error',
      {
        anonymous: 'always',
        named: 'never',
        asyncArrow: 'always'
      }
    ]
  },
  env: {
    browser: true,
    node: true
  }
}
