module.exports = {
  presets: [
    ['@vue/cli-plugin-babel/preset', {
      useBuiltIns: 'entry',
      corejs: 3,
      targets: {
        node: 'current',
        browsers: ['last 2 versions', 'not dead']
      }
    }]
  ]
} 