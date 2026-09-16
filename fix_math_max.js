const fs = require('fs');
const file = 'web/frontend/pages/catalog.jsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  "width: Math.max(width, 100)",
  "width"
);

content = content.replace(
  "width: Math.max(width, 280)",
  "width"
);

fs.writeFileSync(file, content);
console.log('Done replacing Math.max');
