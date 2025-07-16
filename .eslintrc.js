module.exports = {
  root: true,
  env: {
    node: true,
    browser: true,
    es6: true
  },
  extends: [
    'plugin:vue/essential',
    'eslint:recommended'
  ],
  parserOptions: {
    parser: '@babel/eslint-parser',
    requireConfigFile: false,
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  rules: {
    'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    'vue/multi-word-component-names': 'off',
    'vue/no-deprecated-slot-attribute': 'off',
    'vue/no-deprecated-v-bind-sync': 'off',
    'vue/no-deprecated-v-on-native-modifier': 'off',
    'vue/no-deprecated-destroyed-lifecycle': 'off',
    'no-unused-vars': 'warn',
    'no-undef': 'off'
  },
  globals: {
    localStorage: 'readonly',
    window: 'readonly',
    Int16Array: 'readonly',
    require: 'readonly'
  }
} 