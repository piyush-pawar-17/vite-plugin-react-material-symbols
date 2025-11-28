export default {
    printWidth: 120,
    arrowParens: 'always',
    bracketSpacing: true,
    jsxSingleQuote: false,
    semi: true,
    singleQuote: true,
    tabWidth: 4,
    trailingComma: 'es5',
    useTabs: false,
    importOrder: ['<BUILTIN_MODULES>', '', '<THIRD_PARTY_MODULES>', '', '^[.]', '', '<TYPES>', '<TYPES>^[.]'],
    plugins: ['@ianvs/prettier-plugin-sort-imports'],
};
