const babel = require('@babel/core');
const fs = require('fs');

const code = fs.readFileSync('/var/www/html/product-manager-pro/web/frontend/pages/catalog.jsx', 'utf8');

try {
  babel.transformSync(code, {
    presets: ['@babel/preset-react'],
    filename: 'catalog.jsx'
  });
  console.log("Babel parse successful.");
} catch(e) {
  console.error("Syntax error:", e);
}
