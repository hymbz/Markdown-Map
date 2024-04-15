module.exports = {
  extends: [
    'stylelint-config-standard',
    'stylelint-prettier/recommended',
    'stylelint-config-clean-order',
  ],
  ignoreFiles: [
    '**/node_modules/**/*.css',
    '**/dist/**/*.css',
    '**/public/**/*.css',
  ],
  plugins: ['stylelint-order', 'stylelint-high-performance-animation'],
  rules: {
    // 允许 css 变量使用任意命名方式
    'custom-property-pattern': null,
    'import-notation': 'string',
    // 允许重复的 css 动画帧
    'keyframe-block-no-duplicate-selectors': null,
    'keyframes-name-pattern': null,

    // 防止使用低性能的动画和过度属性
    'plugin/no-low-performance-animation-properties': true,

    // 允许任意类型的命名方式
    'selector-class-pattern': null,
  },
};
