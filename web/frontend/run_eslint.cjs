const { ESLint } = require("eslint");

(async function main() {
  const eslint = new ESLint({
    useEslintrc: false,
    overrideConfig: {
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: "module",
        ecmaFeatures: {
          jsx: true
        }
      },
      env: {
        browser: true,
        node: true,
        es2021: true
      },
      rules: {
        "no-undef": "error"
      }
    }
  });

  const results = await eslint.lintFiles(["/var/www/html/product-manager-pro/web/frontend/pages/catalog.jsx"]);
  const formatter = await eslint.loadFormatter("stylish");
  const resultText = formatter.format(results);
  
  console.log(resultText);
})().catch(console.error);
