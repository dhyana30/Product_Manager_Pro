const fs = require('fs');

function extractBlock(content, startMarker, endMarker) {
  const startIndex = content.indexOf(startMarker);
  if (startIndex === -1) return null;
  const endIndex = content.indexOf(endMarker, startIndex);
  if (endIndex === -1) return null;
  return content.substring(startIndex, endIndex + endMarker.length);
}

const catalog = fs.readFileSync('/var/www/html/product-manager-pro/web/frontend/pages/catalog.jsx', 'utf8');

const stateBlockStart = '  const [statusFilter, setStatusFilter] = useState("");';
const stateBlockEnd = '  const sortedProducts = useMemo(() => sortProducts(filteredProducts, sortValue), [filteredProducts, sortValue]);';
let stateBlock = catalog.substring(catalog.indexOf(stateBlockStart), catalog.indexOf(stateBlockEnd));

const filtersCompStart = '            <Filters';
const filtersCompEnd = '            </Filters>';
let filtersComp = extractBlock(catalog, filtersCompStart, filtersCompEnd);

const filterPopoverDefStart = 'function FilterPopover(props) {';
let filterPopoverDef = catalog.substring(catalog.indexOf(filterPopoverDefStart));

function patchFile(filePath, isImageManager) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // 1. Rename 'status' property in mapping
  if (isImageManager) {
    content = content.replace(/status: hasImage \? 'Good' : 'No images',/g, 'imageManagerStatus: hasImage ? \'Good\' : \'No images\',');
    content = content.replace(/\{ id, title, sku, imageCount, altCompleteCount, altCompletePercent, missingImages, duplicates, status, lastUpdated, image_url \}/g, 
                              '{ id, title, sku, imageCount, altCompleteCount, altCompletePercent, missingImages, duplicates, imageManagerStatus: status, lastUpdated, image_url }');
  } else {
    content = content.replace(/status = 'Good';/g, 'seoManagerStatus = \'Good\';');
    content = content.replace(/status = 'Critical';/g, 'seoManagerStatus = \'Critical\';');
    content = content.replace(/status = 'Issues';/g, 'seoManagerStatus = \'Issues\';');
    content = content.replace(/status,/g, 'seoManagerStatus: status,');
    content = content.replace(/\{ id, title, sku, image_url, seoTitle, titleLength, metaDescription, descLength, handle, status, issueCount \}/g,
                              '{ id, title, sku, image_url, seoTitle, titleLength, metaDescription, descLength, handle, seoManagerStatus: status, issueCount }');
  }

  // 2. Add full catalog payload mapping
  const mapStart = 'const mappedProducts = payload.data.map((product) => {';
  const newMapStart = `const mappedProducts = payload.data.map((product) => {\n        const fullProduct = { ...product, status: { label: product.status, status: product.status === "active" ? "success" : "attention" }, inventory: String(product.inventory) };`;
  content = content.replace(mapStart, newMapStart);
  content = content.replace(/return \{/g, 'return {\n          ...fullProduct,');

  // 3. Replace state block
  let existingStateStart;
  let existingStateEnd;
  if (isImageManager) {
    existingStateStart = '  const [imageStatus, setImageStatus] = useState("");';
    existingStateEnd = '  const paginatedProducts = sortedProducts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);';
  } else {
    existingStateStart = '  const [statusFilter, setStatusFilter] = useState("");';
    existingStateEnd = '  const paginatedProducts = sortedProducts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);';
  }
  
  const stateEndIndex = content.indexOf(existingStateEnd) + existingStateEnd.length;
  // Let's just find the exact block and replace
  const blockStartRegex = isImageManager ? /const \[imageStatus[\s\S]*?const activeFilterCount[\s\S]*?;/ : /const \[statusFilter[\s\S]*?const activeFilterCount[\s\S]*?;/;
  
  content = content.replace(blockStartRegex, stateBlock.trim());
  
  // Actually we need to make sure `sortProducts` exists. We don't have it imported.
  // Instead of using sortProducts in useMemo, let's just keep the existing sortedProducts logic for now
  content = content.replace('const sortedProducts = useMemo(() => sortProducts(filteredProducts, sortValue), [filteredProducts, sortValue]);', '');

  // But we need filteredProducts! We replace `const sortedProducts = React.useMemo(() => {` to use `filteredProducts` instead of `products`.
  content = content.replace(/const sorted = \[\.\.\.products\];/g, 'const sorted = [...filteredProducts];');

  // 4. Replace Filters invocation
  content = content.replace(/<Filters[\s\S]*?<\/Filters>/, filtersComp);
  
  // Fix the inner children of Filters to have the bulk edit button
  if (isImageManager) {
    content = content.replace(/<SortPopover value=\{sortValue\} onChange=\{setSortValue\} \/>\n.*<Button>Bulk edit<\/Button>/g, 
    '<SortPopover value={sortValue} onChange={setSortValue} />\n                  <Button>Bulk edit</Button>');
  } else {
    content = content.replace(/<SortPopover value=\{sortValue\} onChange=\{setSortValue\} \/>\n.*<Button disabled=\{selectedResources.length === 0\} onClick=\{handleStartBulkEdit\}>Bulk edit SEO<\/Button>/g,
    '<SortPopover value={sortValue} onChange={setSortValue} />\n                <Button disabled={selectedResources.length === 0} onClick={handleStartBulkEdit}>Bulk edit SEO</Button>');
  }

  // 5. Replace FilterPopover definition
  content = content.replace(/function FilterPopover\(props\) \{[\s\S]*$/, filterPopoverDef);

  fs.writeFileSync(filePath, content, 'utf8');
}

try {
  patchFile('/var/www/html/product-manager-pro/web/frontend/pages/imageManager.jsx', true);
  patchFile('/var/www/html/product-manager-pro/web/frontend/pages/seoManager.jsx', false);
  console.log('Patched successfully');
} catch (e) {
  console.error(e);
}
