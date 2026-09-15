import { ESLint } from "eslint";

async function main() {
  const eslint = new ESLint();
  const results = await eslint.lintFiles(["/var/www/html/product-manager-pro/web/frontend/pages/catalog.jsx"]);
  const formatter = await eslint.loadFormatter("stylish");
  console.log(formatter.format(results));
}

main().catch(console.error);
