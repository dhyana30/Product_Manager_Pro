const fs = require('fs');
const file = 'web/frontend/pages/catalog.jsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  'const hasVariants = p.variants_list && p.variants_list.length > 0;',
  "const hasVariants = p.variants_list && (p.variants_list.length > 1 || (p.variants_list.length === 1 && p.variants_list[0].title !== 'Default Title'));"
);

fs.writeFileSync(file, content);
console.log('Done replacing hasVariants');
