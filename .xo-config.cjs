module.exports = {
  prettier: true,
  plugins: ["solid"],
  extends: ["plugin:solid/typescript"],
  ignores: ["*.user.js", "public"],

  rules: {
    // 提示未使用的变量
    "@typescript-eslint/no-unused-vars": "warn",
    // 提示使用了 console
    'no-console': ["warn", { allow: ["warn", "error"] }],
    // 禁止重新赋值函数参数
    "no-param-reassign": "error",

    // 不限制代码深度
    "max-depth": "off",
    // 不限制文件名的大小写样式
    "unicorn/filename-case": "off",
    // 不限制 import 的扩展名
    "import/extensions": "off",
    "n/file-extension-in-import": "off",
    // 不限制循环方式
    "unicorn/no-array-for-each": "off",
    // 不限制注释首字母大小写
    "capitalized-comments": "off",
    // 不强制使用 addEventListener
    "unicorn/prefer-add-event-listener": "off",
    // 不限制代码复杂性
    complexity: "off",
    // 不强制使用 querySelector
    "unicorn/prefer-query-selector": "off",
    // 不限制在 switch case 中使用大括号
    "unicorn/switch-case-braces": 'off',

    // 允许直接传递函数给迭代器方法
    "unicorn/no-array-callback-reference": "off",
    // 允许使用缩写
    "unicorn/prevent-abbreviations": "off",
    // 允许未分配导入
    "import/no-unassigned-import": "off",
    // 允许默认导入变量名称和导入模块名称不同
    "import/no-named-as-default": "off",
    // 允许在 Promise 中返回值
    "no-promise-executor-return": "off",
    // 允许在循环中使用 await
    "no-await-in-loop": "off",
    // 允许使用 js url
    "no-script-url": "off",
    // 允许 TODO 注释
    "no-warning-comments": "off",
    // 允许调用大写开头的函数
    "new-cap": ["error", { "capIsNew": false }],
    // 允许使用复杂的数组解构
    "unicorn/no-unreadable-array-destructuring": "off",
    // 允许正常调用异步函数并使用 catch
    "unicorn/prefer-top-level-await": "off",

    // import 不同分组之间加上空行
    "import/order": ["warn", { "newlines-between": "always" }],

    // 允许在 void 的函数内 return
    "@typescript-eslint/no-confusing-void-expression": "off",
    // 不限制变量名的大小写样式
    "@typescript-eslint/naming-convention": "off",
    // 不限制类型断言的方式
    "@typescript-eslint/consistent-type-assertions": "off",
    // 不限制类型定义的方式
    "@typescript-eslint/consistent-type-definitions": "off",
    // 不强制使用 for of
    "@typescript-eslint/prefer-for-of": "off",
    // 不禁止类型
    "@typescript-eslint/ban-types": "off",
    // 不强制返回 Promise 的函数使用 async
    "@typescript-eslint/promise-function-async": "off",
    // 不强制换行
    "@typescript-eslint/padding-line-between-statements": "off",

    // 允许 switch 省略部分值
    "@typescript-eslint/switch-exhaustiveness-check": "off",
    // 允许浮动 Promise
    "@typescript-eslint/no-floating-promises": "off",
    // 允许使用 any
    "@typescript-eslint/no-unsafe-argument": "off",
    "@typescript-eslint/no-unsafe-assignment": "off",
    "@typescript-eslint/no-unsafe-call": "off",

    // 在判断类型时允许使用 ||
    "@typescript-eslint/prefer-nullish-coalescing": [
      "error",
      { ignorePrimitives: true },
    ],

    "@typescript-eslint/consistent-type-imports": ["error", {
      // 允许 typeof import
      disallowTypeAnnotations: false,
      // 使用 内联类型导入
      fixStyle: "inline-type-imports",
    }],

    // 使用 process
    "n/prefer-global/process": ["error", "always"],

    //
    // 项目特有的规则
    //

    "solid/reactivity": "off",
  },
};
