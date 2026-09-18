import { useEffect, useMemo, useState, Fragment, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  ActionList,
  Badge,
  Button,
  ButtonGroup,
  Checkbox,
  Icon,
  IndexTable,
  Modal,
  Page,
  Popover,
  Select,
  Text,
  TextField,
  Tooltip,
  useIndexResourceState,
  Card,
  Stack,
  Filters,
  ChoiceList
} from "@shopify/polaris";
import {
  CashDollarMinor,
  Columns3Minor,
  EditMinor,
  ExportMinor,
  FilterMinor,
  HorizontalDotsMinor,
  ImageMajor,
  ImportMinor,
  PlusMinor,
  ArrowLeftMinor,
  SearchMinor,
  SelectMinor,
  SortMinor,
  ViewMinor, ChevronUpMinor, ChevronDownMinor,
} from "@shopify/polaris-icons";
import { TitleBar, Toast } from "@shopify/app-bridge-react";
import { useAuthenticatedFetch } from "../hooks/useAuthenticatedFetch";

// ---------------------------------------------------------------------------
// Data wiring below (state, loadProducts, syncCatalog, readApiResponse) is
// unchanged from the previous version of this page — same endpoints, same
// request/response handling. Everything else is presentation only.
// ---------------------------------------------------------------------------

const PAGE_SIZE = 20;

const ALL_COLUMNS = [
  { key: "product", label: "Product", locked: true },
  { key: "variants", label: "Variants" },
  { key: "status", label: "Status" },
  { key: "vendor", label: "Vendor" },
  { key: "inventory", label: "Inventory" },
  { key: "sku", label: "SKU" },
  { key: "price", label: "Price" },
  { key: "published_at", label: "Publish Date" },
];

const BULK_EDIT_COLUMNS = [
  { key: "title", label: "Title", type: "text" },
  { key: "status", label: "Status", type: "select", options: [
    { label: "Active", value: "active" },
    { label: "Draft", value: "draft" },
    { label: "Archived", value: "archived" },
  ] },
  { key: "vendor", label: "Vendor", type: "text" },
  { key: "sku", label: "SKU", type: "text" },
  { key: "price", label: "Price", type: "number" },
  { key: "handle", label: "URL handle", type: "text" },
  { key: "meta_title", label: "SEO title", type: "text" },
  { key: "meta_description", label: "SEO description", type: "multiline" },
];

const SORT_OPTIONS = [
  { value: "title-asc", label: "Product title (A-Z)" },
  { value: "title-desc", label: "Product title (Z-A)" },
  { value: "price-asc", label: "Price (low to high)" },
  { value: "price-desc", label: "Price (high to low)" },
  { value: "created-desc", label: "Created (newest)" },
  { value: "created-asc", label: "Created (oldest)" },
];

export default function Catalog() {
  const navigate = useNavigate();
  
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [confirmPushOpen, setConfirmPushOpen] = useState(false);
  const [error, setError] = useState("");
  const [syncMessage, setSyncMessage] = useState("");
  const authenticatedFetch = useAuthenticatedFetch();

  const loadProducts = async () => {
    setIsLoading(true);
    setError("");
    try {
      const response = await authenticatedFetch(`/api/products?search=${encodeURIComponent(query)}`);
      const payload = await readApiResponse(response);
      if (!response.ok) throw new Error(payload.message || "Unable to load catalog data.");
      setProducts(payload.data.map((product) => ({
        ...product,
        status: { label: product.status, status: product.status === "active" ? "success" : "attention" },
        inventory: String(product.inventory),
      })));
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadProducts(); }, [query]);

  const syncCatalog = async () => {
    setIsSyncing(true);
    setError("");
    try {
      const response = await authenticatedFetch("/api/sync/pull", { method: "POST" });
      const payload = await readApiResponse(response);
      if (!response.ok) throw new Error(payload.message || "Catalog sync failed.");
      await loadProducts();
      setSyncMessage(payload.message || "Catalog synced successfully.");
    } catch (syncError) {
      setError(syncError.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const syncToShopify = async () => {
    setIsPushing(true);
    setError("");
    try {
      const response = await authenticatedFetch("/api/sync/push", { method: "POST" });
      const payload = await readApiResponse(response);
      if (!response.ok) throw new Error(payload.message || "Push sync failed.");
      setSyncMessage(payload.message || "Changes pushed to Shopify successfully.");
    } catch (pushError) {
      setError(pushError.message);
    } finally {
      setIsPushing(false);
    }
  };

  // -- Presentation-only state below: selection, filters, sort, columns,
  // pagination and the various popovers/modals. None of it touches the
  // request/response handling above or issues new network calls. --

  const [confirmSyncOpen, setConfirmSyncOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [vendorFilter, setVendorFilter] = useState("");
  const [inventoryFilter, setInventoryFilter] = useState("");
  const [imagesFilter, setImagesFilter] = useState("");
  const [seoFilter, setSeoFilter] = useState("");
  const [tagsFilter, setTagsFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [sortValue, setSortValue] = useState("title-asc");
    const [page, setPage] = useState(1);
  const [previewProductId, setPreviewProductId] = useState(null);
  const [imagePopup, setImagePopup] = useState(null);

  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [bulkEditorOpen, setBulkEditorOpen] = useState(false);
  const [viewProduct, setViewProduct] = useState(null);
  const [bulkEditorColumns, setBulkEditorColumns] = useState(["title", "status", "vendor", "price"]);
  const [isSavingBulk, setIsSavingBulk] = useState(false);

  const vendorOptions = useMemo(() => {
    const vendors = Array.from(new Set(products.map((p) => p.vendor).filter(Boolean))).sort();
    return vendors.map((v) => ({ label: v, value: v }));
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (statusFilter !== "" && p.status.label !== statusFilter) return false;
      if (vendorFilter !== "" && p.vendor !== vendorFilter) return false;
      
      if (inventoryFilter !== "") {
        const inv = parseInt(p.inventory, 10);
        if (inventoryFilter === "in-stock" && inv <= 0) return false;
        if (inventoryFilter === "out-of-stock" && inv > 0) return false;
        if (inventoryFilter === "low-stock" && (inv <= 0 || inv > 10)) return false;
      }
      
      if (imagesFilter !== "") {
        if (imagesFilter === "has-images" && !p.image_url) return false;
        if (imagesFilter === "missing-images" && p.image_url) return false;
      }
      
      if (seoFilter !== "") {
        if (seoFilter === "missing-seo" && p.meta_title && p.meta_description) return false;
      }
      
      if (tagsFilter) {
        if (!p.tags || p.tags.length === 0) return false;
        const tagMatch = p.tags.some(t => t.toLowerCase().includes(tagsFilter.toLowerCase()));
        if (!tagMatch) return false;
      }

      if (dateFilter !== "" && p.updated_at) {
        const updatedDate = new Date(p.updated_at);
        const now = new Date();
        const diffDays = (now - updatedDate) / (1000 * 60 * 60 * 24);
        if (dateFilter === "last-7-days" && diffDays > 7) return false;
        if (dateFilter === "last-30-days" && diffDays > 30) return false;
      }

      return true;
    });
  }, [products, statusFilter, vendorFilter, inventoryFilter, imagesFilter, seoFilter, tagsFilter, dateFilter]);

  const sortedProducts = useMemo(() => sortProducts(filteredProducts, sortValue), [filteredProducts, sortValue]);

  const activeFilterCount = (statusFilter !== "" ? 1 : 0) + 
                            (vendorFilter !== "" ? 1 : 0) +
                            (inventoryFilter !== "" ? 1 : 0) +
                            (imagesFilter !== "" ? 1 : 0) +
                            (seoFilter !== "" ? 1 : 0) +
                            (tagsFilter ? 1 : 0) +
                            (dateFilter !== "" ? 1 : 0);

  useEffect(() => { setPage(1); }, [query, statusFilter, vendorFilter, inventoryFilter, imagesFilter, seoFilter, tagsFilter, dateFilter, sortValue]);

  const pageCount = Math.max(1, Math.ceil(sortedProducts.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageRows = sortedProducts.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const { selectedResources, allResourcesSelected, handleSelectionChange } = useIndexResourceState(pageRows, {
    resourceIDResolver: (resource) => String(resource.id),
  });

  
  const handleStartEdit = (row) => {
    navigate(`/product/${row.id}`, { state: { product: row } });
  };
  const handleCancelEdit = () => {
    setEditingId(null);
  };

  const handleSaveEdit = async () => {
    setIsSavingEdit(true);
    try {
      const response = await authenticatedFetch(`/api/products/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editData),
      });
      if (!response.ok) throw new Error("Failed to save product");
      
      setProducts(products.map(p => {
        if (p.id === editingId) {
          return { ...p, title: editData.title, vendor: editData.vendor, price: editData.price, sku: editData.sku };
        }
        return p;
      }));
      setEditingId(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleSaveBulkEdit = async (changes) => {
    setIsSavingBulk(true);
    try {
      await Promise.all(Object.entries(changes).map(async ([id, values]) => {
        const response = await authenticatedFetch(`/api/products/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        });
        const payload = await readApiResponse(response);
        if (!response.ok) throw new Error(payload.message || "Failed to save bulk changes.");
      }));

      setProducts((currentProducts) => currentProducts.map((product) => {
        const values = changes[String(product.id)];
        if (!values) return product;
        return {
          ...product,
          ...values,
          status: values.status
            ? { label: values.status, status: values.status === "active" ? "success" : "attention" }
            : product.status,
        };
      }));
      setBulkEditorOpen(false);
      setSyncMessage("Bulk changes saved successfully.");
    } catch (bulkError) {
      setError(bulkError.message);
    } finally {
      setIsSavingBulk(false);
    }
  };

  const selectedProducts = products.filter((product) => selectedResources.includes(String(product.id)));

  if (bulkEditorOpen) {
    return (
      <CatalogBulkEditor
        products={selectedProducts}
        columns={bulkEditorColumns}
        onColumnsChange={setBulkEditorColumns}
        onSave={handleSaveBulkEdit}
        isSaving={isSavingBulk}
        onDiscard={() => setBulkEditorOpen(false)}
      />
    );
  }

  return (
    <Page fullWidth>
      <TitleBar title="Catalog & Inventory" />

      {syncMessage && (
        <Toast content={syncMessage} onDismiss={() => setSyncMessage("")} />
      )}
      {error && (
        <Toast content={error} error onDismiss={() => setError("")} />
      )}

      <Card>
        <div style={{ padding: '16px', borderBottom: '1px solid #dfe3e8' }}>
          <Stack alignment="center" distribution="equalSpacing">
            <Text variant="headingMd">Products</Text>
            <ButtonGroup>
              <Button icon={ImportMinor} loading={isSyncing} onClick={() => setConfirmSyncOpen(true)}>
                Shopify → App
              </Button>
              <Button icon={ExportMinor} loading={isPushing} onClick={() => setConfirmPushOpen(true)}>
                App → Shopify
              </Button>
              <CreateProductButton />
            </ButtonGroup>
          </Stack>
        </div>

        <div style={{ padding: '0 16px 16px', borderBottom: '1px solid #dfe3e8' }}>
          <Filters
            queryValue={query}
            queryPlaceholder="Search products by title, SKU, barcode..."
            filters={[]}
            appliedFilters={[
              ...(statusFilter !== "" ? [{
                key: "status",
                label: `Status is ${statusFilter}`,
                onRemove: () => setStatusFilter(""),
              }] : []),
              ...(vendorFilter !== "" ? [{
                key: "vendor",
                label: `Vendor is ${vendorFilter}`,
                onRemove: () => setVendorFilter(""),
              }] : []),
              ...(inventoryFilter !== "" ? [{
                key: "inventory",
                label: `Inventory is ${inventoryFilter}`,
                onRemove: () => setInventoryFilter(""),
              }] : []),
              ...(imagesFilter !== "" ? [{
                key: "images",
                label: `Images is ${imagesFilter}`,
                onRemove: () => setImagesFilter(""),
              }] : []),
              ...(seoFilter !== "" ? [{
                key: "seo",
                label: `SEO is ${seoFilter}`,
                onRemove: () => setSeoFilter(""),
              }] : []),
              ...(tagsFilter ? [{
                key: "tags",
                label: `Tags contain "${tagsFilter}"`,
                onRemove: () => setTagsFilter(""),
              }] : []),
              ...(dateFilter !== "" ? [{
                key: "date",
                label: `Updated ${dateFilter}`,
                onRemove: () => setDateFilter(""),
              }] : [])
            ]}
            onQueryChange={setQuery}
            onQueryClear={() => setQuery('')}
            onClearAll={() => { 
              setStatusFilter("any"); 
              setVendorFilter("any"); 
              setInventoryFilter("any");
              setImagesFilter("any");
              setSeoFilter("any");
              setTagsFilter("");
              setDateFilter("any");
              setQuery(""); 
            }}
          >
            <div style={{ paddingLeft: '8px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <FilterPopover 
                statusFilter={statusFilter} setStatusFilter={setStatusFilter}
                vendorFilter={vendorFilter} setVendorFilter={setVendorFilter} vendorOptions={vendorOptions}
                inventoryFilter={inventoryFilter} setInventoryFilter={setInventoryFilter}
                imagesFilter={imagesFilter} setImagesFilter={setImagesFilter}
                seoFilter={seoFilter} setSeoFilter={setSeoFilter}
                tagsFilter={tagsFilter} setTagsFilter={setTagsFilter}
                dateFilter={dateFilter} setDateFilter={setDateFilter}
                activeFilterCount={activeFilterCount}
                onClearAll={() => { 
                  setStatusFilter(""); 
                  setVendorFilter(""); 
                  setInventoryFilter("");
                  setImagesFilter("");
                  setSeoFilter("");
                  setTagsFilter("");
                  setDateFilter("");
                  setQuery(""); 
                }}
              />
              <SortPopover value={sortValue} onChange={setSortValue} />
                            <BulkEditPopover
                disabled={selectedResources.length === 0}
                count={selectedResources.length}
                onSelect={() => setBulkEditorOpen(true)}
              />
              <PriceButton disabled={selectedResources.length === 0} count={selectedResources.length} />
            </div>
          </Filters>
        </div>
        <IndexTable
          resourceName={{ singular: "product", plural: "products" }}
          itemCount={pageRows.length}
          selectedItemsCount={allResourcesSelected ? "All" : selectedResources.length}
          onSelectionChange={handleSelectionChange}
          headings={[...ALL_COLUMNS.map((c) => ({ title: c.label })), { title: "" }]}
          loading={isLoading}
        >
          {pageRows.map((row, index) => (
            <ProductRow
                  key={row.id}
                  row={row}
                  index={index}
                  columns={ALL_COLUMNS}
                  selected={selectedResources.includes(String(row.id))}
                  isEditing={editingId === row.id}
                  editData={editData}
                  onEditDataChange={setEditData}
                  onStartEdit={() => handleStartEdit(row)}
                  onCancelEdit={handleCancelEdit}
                  onSaveEdit={handleSaveEdit}
                  isSaving={isSavingEdit && editingId === row.id}
                  onViewProduct={(r) => setViewProduct(r)}
                />
          ))}
        </IndexTable>

        {!isLoading && pageRows.length === 0 && (
          <div style={s.emptyState}>
            <Text as="p" color="subdued">
              {products.length === 0 ? "No products found. Try syncing from Shopify." : "No products match the current filters."}
            </Text>
          </div>
        )}

        <div style={s.footer}>
          <Text as="span" color="subdued">
            Showing {sortedProducts.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1} to{" "}
            {Math.min(currentPage * PAGE_SIZE, sortedProducts.length)} of {sortedProducts.length} products
          </Text>
          <PaginationBar page={currentPage} pageCount={pageCount} onChange={setPage} />
        </div>
      </Card>

      <ConfirmPushModal
        open={confirmPushOpen}
        loading={isPushing}
        onCancel={() => setConfirmPushOpen(false)}
        onConfirm={() => { setConfirmPushOpen(false); syncToShopify(); }}
      />
      <ConfirmSyncModal
        open={confirmSyncOpen}
        loading={isSyncing}
        onCancel={() => setConfirmSyncOpen(false)}
        onConfirm={() => { setConfirmSyncOpen(false); syncCatalog(); }}
      />
      
      {imagePopup && (
        <Modal
          open={!!imagePopup}
          onClose={() => setImagePopup(null)}
          title={imagePopup.title}
        >
          <Modal.Section>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <img src={imagePopup.image_url} alt={imagePopup.title} style={{ maxWidth: '100%', maxHeight: '60vh', objectFit: 'contain', borderRadius: '8px' }} />
            </div>
          </Modal.Section>
        </Modal>
      )}
    
      {viewProduct && (
        <Modal
          open={!!viewProduct}
          onClose={() => setViewProduct(null)}
          title="Product details"
          large
        >
          <Modal.Section>
            <div style={{ display: 'flex', gap: '24px', marginBottom: '32px' }}>
              <div style={{ width: '120px', height: '120px', flexShrink: 0, border: '1px solid #e1e3e5', borderRadius: '8px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f4f6f8' }}>
                {viewProduct.image_url ? (
                  <img src={viewProduct.image_url} alt={viewProduct.title} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                ) : (
                  <Icon source={ImageMajor} color="subdued" />
                )}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <Text variant="headingLg" as="h2">{viewProduct.title}</Text>
                  <Badge status={viewProduct.status?.status || 'success'}>{viewProduct.status?.label || viewProduct.status}</Badge>
                </div>
                <Text color="subdued" as="p" variant="bodyMd">/{viewProduct.handle || '—'}</Text>
                
                <div style={{ display: 'flex', gap: '32px', marginTop: '24px' }}>
                  <div>
                    <Text color="subdued" as="p">Price</Text>
                    <Text fontWeight="medium" as="p">{viewProduct.price ? '$'+viewProduct.price : '—'}</Text>
                  </div>
                  <div>
                    <Text color="subdued" as="p">Inventory</Text>
                    <Text fontWeight="medium" as="p">{viewProduct.inventory ?? '—'}</Text>
                  </div>
                  <div>
                    <Text color="subdued" as="p">Vendor</Text>
                    <Text fontWeight="medium" as="p">{viewProduct.vendor || '—'}</Text>
                  </div>
                  <div>
                    <Text color="subdued" as="p">Product type</Text>
                    <Text fontWeight="medium" as="p">{viewProduct.product_type || '—'}</Text>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ marginBottom: '32px' }}>
              <Text variant="headingMd" as="h3">SEO details</Text>
              <div style={{ display: 'flex', gap: '32px', marginTop: '16px' }}>
                <div style={{ flex: 1 }}>
                  <Text color="subdued" as="p">Meta title</Text>
                  <Text fontWeight="medium" as="p">{viewProduct.meta_title || '—'}</Text>
                </div>
                <div style={{ flex: 2 }}>
                  <Text color="subdued" as="p">Meta description</Text>
                  <Text fontWeight="medium" as="p">{viewProduct.meta_description || '—'}</Text>
                </div>
              </div>
            </div>

            <div>
              <div style={{ marginBottom: '16px' }}>
                <Text variant="headingMd" as="h3">Variants ({viewProduct.variants_list?.length || 0})</Text>
              </div>
              <Card padding="0">
                <IndexTable
                  resourceName={{ singular: 'variant', plural: 'variants' }}
                  itemCount={(viewProduct.variants_list || []).length}
                  headings={[
                    { title: 'Variant' },
                    { title: 'SKU' },
                    { title: 'Price' },
                    { title: 'Inventory' },
                  ]}
                  selectable={false}
                >
                  {(viewProduct.variants_list || []).map((v, i) => (
                    <IndexTable.Row id={i.toString()} key={i} position={i}>
                      <IndexTable.Cell>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ width: '32px', height: '32px', border: '1px solid #e1e3e5', borderRadius: '4px', overflow: 'hidden', flexShrink: 0, backgroundColor: '#f4f6f8' }}>
                            {viewProduct.image_url ? <img src={viewProduct.image_url} alt="" style={{width: '100%', height:'100%', objectFit: 'contain'}} /> : <Icon source={ImageMajor} color="subdued" />}
                          </div>
                          <Text variant="bodyMd" fontWeight="medium" as="span">{v.title || 'Default Title'}</Text>
                        </div>
                      </IndexTable.Cell>
                      <IndexTable.Cell><Text as="span" color="subdued">{v.sku || '—'}</Text></IndexTable.Cell>
                      <IndexTable.Cell><Text as="span" color="subdued">{v.price ? '$'+v.price : '—'}</Text></IndexTable.Cell>
                      <IndexTable.Cell><Text as="span" color="subdued">{v.inventory ?? '—'}</Text></IndexTable.Cell>
                    </IndexTable.Row>
                  ))}
                </IndexTable>
              </Card>
            </div>
          </Modal.Section>

        </Modal>
      )}
    </Page>
  );
}

// ---------------------------------------------------------------------------
// Row
// ---------------------------------------------------------------------------

function ProductRow({ row, index, columns, selected, isEditing, editData, onEditDataChange, onStartEdit, onCancelEdit, onSaveEdit, isSaving, onViewProduct }) {
  return (
    <IndexTable.Row id={String(row.id)} key={row.id} position={index} selected={selected} onClick={isEditing ? undefined : onStartEdit}>
      {columns.map((col) => (
        <IndexTable.Cell key={col.key}>
          {col.key === "product" && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '40px', height: '40px', border: '1px solid #e1e3e5', borderRadius: '4px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f4f6f8' }}>
                {row.image_url ? (
                  <img src={row.image_url} alt={row.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <Icon source={ImageMajor} color="subdued" />
                )}
              </div>
              <div style={{ minWidth: '150px', display: 'flex', flexDirection: 'column' }}>
                {isEditing ? (
                  <div onClick={(e) => e.stopPropagation()}><TextField value={editData.title} onChange={(v) => onEditDataChange({...editData, title: v})} autoComplete="off" /></div>
                ) : (
                  <Text variant="bodyMd" fontWeight="bold" as="span">{row.title}</Text>
                )}
              </div>
            </div>
          )}
          {col.key === "variants" && <Text as="span" color="subdued">{row.variants_list ? row.variants_list.length : "—"}</Text>}
          {col.key === "status" && (
            <Badge status={row.status?.status || 'success'}>{row.status?.label || row.status}</Badge>
          )}
          {col.key === "vendor" && <Text as="span" color="subdued">{row.vendor || "—"}</Text>}
          {col.key === "inventory" && <Text as="span" color="subdued">{row.inventory ?? "—"}</Text>}
          {col.key === "sku" && (
            isEditing ? (
              <div onClick={(e) => e.stopPropagation()} style={{ minWidth: '120px' }}><TextField value={editData.sku} onChange={(v) => onEditDataChange({...editData, sku: v})} autoComplete="off" /></div>
            ) : (
              <Text as="span" color="subdued">{row.sku || "—"}</Text>
            )
          )}
          {col.key === "price" && (
            isEditing ? (
              <div onClick={(e) => e.stopPropagation()} style={{ minWidth: '100px' }}><TextField type="number" prefix="$" value={editData.price} onChange={(v) => onEditDataChange({...editData, price: v})} autoComplete="off" /></div>
            ) : (
              <Text as="span" color="subdued">{row.price ? '$'+row.price : "—"}</Text>
            )
          )}
          {col.key === "published_at" && <Text as="span" color="subdued">{row.published_at || "—"}</Text>}
        </IndexTable.Cell>
      ))}
      <IndexTable.Cell>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
          <Button icon={ViewMinor} accessibilityLabel="View" onClick={() => onViewProduct(row)} />
          {isEditing ? (
            <ButtonGroup segmented>
              <Button onClick={onCancelEdit}>Cancel</Button>
              <Button primary onClick={onSaveEdit} loading={isSaving}>Save</Button>
            </ButtonGroup>
          ) : (
            <Button size="slim" onClick={onStartEdit}>Edit</Button>
          )}
        </div>
      </IndexTable.Cell>
    </IndexTable.Row>
  );
}
function ImagePlaceholder() {
  return (
    <div style={s.imagePlaceholder}>
      <Icon source={ImageMajor} color="subdued" />
    </div>
  );
}

function ProductPreview({ row, onClose }) {
  return (
    <div style={s.previewCard}>
      <div style={s.previewHeader}>
        <div style={s.previewImage}>
          <Icon source={ImageMajor} color="subdued" />
        </div>
        <div style={{ flex: 1 }}>
          <Text as="h3" variant="headingSm">{row.title}</Text>
          <Badge status={row.status.status}>{row.status.label}</Badge>
        </div>
        <Button plain icon={HorizontalDotsMinor} accessibilityLabel="Close" onClick={onClose} />
      </div>
      <div style={s.previewRows}>
        <PreviewRow label="SKU" value={row.sku || "—"} />
        <PreviewRow label="Vendor" value={row.vendor || "—"} />
        <PreviewRow label="Inventory" value={row.inventory} />
        <PreviewRow label="Barcode" value="—" />
        <PreviewRow label="Variants" value={`${row.variants || 0} variant${row.variants !== 1 ? 's' : ''}`} />
      </div>
      <div style={s.previewActions}>
        <Tooltip content="Opening products in Shopify admin isn't wired up yet.">
          <Button plain disabled>View in Shopify</Button>
        </Tooltip>
        <Tooltip content="The product editor is coming in a later step.">
          <Button primary disabled>Edit</Button>
        </Tooltip>
      </div>
    </div>
  );
}

function PreviewRow({ label, value }) {
  return (
    <div style={s.previewRow}>
      <Text as="span" color="subdued">{label}</Text>
      <Text as="span">{value}</Text>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Toolbar pieces
// ---------------------------------------------------------------------------

function CreateProductButton() {
  const navigate = useNavigate();
  return (
    <Button primary icon={PlusMinor} onClick={() => navigate('/product-create')}>
      Create product
    </Button>
  );
}

function FilterPopover(props) {
  const [open, setOpen] = useState(false);

  return (
    <Popover active={open} onClose={() => setOpen(false)} activator={
      <Button icon={FilterMinor} disclosure onClick={() => setOpen((v) => !v)}>
        {props.activeFilterCount > 0 ? `Filters (${props.activeFilterCount})` : "Filters"}
      </Button>
    }>
      <div style={{ padding: '16px', minWidth: '250px', maxHeight: '400px', overflowY: 'auto' }}>
        <Stack vertical spacing="tight">
          <Select label="Status" placeholder="Select status" options={[
            { label: "Active", value: "active" },
            { label: "Draft", value: "draft" },
            { label: "Archived", value: "archived" },
          ]} value={props.statusFilter} onChange={props.setStatusFilter} />
          <Select label="Vendor" placeholder="Select vendor" options={props.vendorOptions} value={props.vendorFilter} onChange={props.setVendorFilter} />
          <Select label="Inventory" placeholder="Select inventory" options={[
            {label: 'In Stock', value: 'in-stock'},
            {label: 'Low Stock (< 10)', value: 'low-stock'},
            {label: 'Out of Stock', value: 'out-of-stock'},
          ]} value={props.inventoryFilter} onChange={props.setInventoryFilter} />
          <Select label="Images" placeholder="Select images" options={[
            {label: 'Has Images', value: 'has-images'},
            {label: 'Missing Images', value: 'missing-images'},
          ]} value={props.imagesFilter} onChange={props.setImagesFilter} />
          <Select label="SEO" placeholder="Select SEO" options={[
            {label: 'Missing SEO', value: 'missing-seo'},
          ]} value={props.seoFilter} onChange={props.setSeoFilter} />
          <TextField label="Tags" placeholder="Search tags" value={props.tagsFilter} onChange={props.setTagsFilter} autoComplete="off" />
          <Select label="Updated Date" placeholder="Select date" options={[
            {label: 'Last 7 days', value: 'last-7-days'},
            {label: 'Last 30 days', value: 'last-30-days'},
          ]} value={props.dateFilter} onChange={props.setDateFilter} />
        </Stack>
        <div style={{ marginTop: '16px', borderTop: '1px solid #dfe3e8', paddingTop: '16px' }}>
          <Button plain onClick={() => { props.onClearAll(); setOpen(false); }}>
            Clear filters
          </Button>
        </div>
      </div>
    </Popover>
  );
}

function SortPopover({ value, onChange }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover active={open} onClose={() => setOpen(false)} activator={
      <Button icon={SortMinor} disclosure onClick={() => setOpen((v) => !v)}>Sort</Button>
    }>
      <ActionList
        items={SORT_OPTIONS.map((opt) => ({
          content: opt.label,
          active: opt.value === value,
          onAction: () => { onChange(opt.value); setOpen(false); },
        }))}
      />
    </Popover>
  );
}



function BulkSalesChannels({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const channels = value ? value.split(',').map(s => s.trim()).filter(Boolean) : [];
  
  // Dynamic options based on what's available or commonly used. 
  // Ideally this would come from a global store, but for now we'll just allow typing or show the current ones.
  // Actually Shopify bulk editor allows selecting from installed channels. 
  // We'll just show the channels that are currently selected plus a few common ones as a fallback.
  const options = Array.from(new Set(["Online Store", "Point of Sale", ...channels]));

  const toggle = (opt) => {
    if (channels.includes(opt)) {
      onChange(channels.filter(c => c !== opt).join(', '));
    } else {
      onChange([...channels, opt].join(', '));
    }
  };

  return (
    <div style={{ width: '100%', height: '100%', padding: '4px 8px', position: 'relative', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '4px', cursor: 'pointer' }} onClick={() => setOpen(true)}>
      {channels.length === 0 ? <span style={{ color: '#8c9196' }}>—</span> : channels.map(c => (
        <span key={c} style={{ background: '#e4e5e7', padding: '2px 8px', borderRadius: '12px', fontSize: '12px', color: '#202223', whiteSpace: 'nowrap' }}>
          {c.length > 15 ? c.substring(0, 15) + '...' : c}
        </span>
      ))}
      
      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={(e) => { e.stopPropagation(); setOpen(false); }} />
          <div style={{ position: 'absolute', top: '100%', left: 0, background: '#fff', border: '1px solid #dfe3e8', borderRadius: '8px', boxShadow: '0 5px 15px rgba(0,0,0,0.1)', zIndex: 50, minWidth: '220px', padding: '8px 0', marginTop: '4px' }} onClick={e => e.stopPropagation()}>
            {options.map(opt => (
              <label key={opt} style={{ display: 'flex', alignItems: 'center', padding: '6px 12px', cursor: 'pointer', fontSize: '13px', color: '#202223' }}>
                <input type="checkbox" checked={channels.includes(opt)} onChange={() => toggle(opt)} style={{ marginRight: '8px', accentColor: '#008060' }} />
                {opt}
              </label>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function BulkCheckbox({ value, onChange }) {
  const isChecked = value === true || value === 'true' || value === 'yes';
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <input 
        type="checkbox" 
        checked={isChecked} 
        onChange={(e) => onChange(e.target.checked ? 'true' : 'false')}
        style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#008060' }}
      />
    </div>
  );
}

function BulkJsonInput({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleFormat = () => {
    try {
      if (value) {
        const parsed = JSON.parse(value);
        onChange(JSON.stringify(parsed, null, 2));
      }
    } catch (e) {
      // do nothing if invalid json
    }
  };

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div 
        style={{ width: '100%', height: '100%', padding: '0 12px', display: 'flex', alignItems: 'center', cursor: 'text' }}
        onClick={() => setOpen(true)}
      >
        <input
          type="text"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent', textAlign: 'left', fontSize: '14px', fontFamily: 'inherit' }}
        />
      </div>
      
      {open && (
        <div style={{ position: 'absolute', top: '100%', left: 0, zIndex: 100, background: '#fff', border: '1px solid #c9cccf', borderRadius: '8px', boxShadow: '0 4px 8px rgba(0,0,0,0.1)', padding: '12px', width: '300px', marginTop: '2px' }}>
          <div style={{ position: 'relative' }}>
            <textarea
              value={value || ''}
              onChange={(e) => onChange(e.target.value)}
              style={{ width: '100%', minHeight: '100px', padding: '8px', border: '2px solid #2c6ecb', borderRadius: '4px', outline: 'none', fontSize: '13px', fontFamily: 'monospace', resize: 'vertical' }}
            />
            <div style={{ position: 'absolute', top: '8px', right: '8px', cursor: 'pointer', background: '#fff' }}>
              <svg viewBox="0 0 20 20" style={{ width: '12px', height: '12px', fill: '#202223' }}>
                <path d="M12.5 3.5l1.8 1.8-3.3 3.3 1.4 1.4 3.3-3.3 1.8 1.8v-5h-5zM7.5 16.5l-1.8-1.8 3.3-3.3-1.4-1.4-3.3 3.3-1.8-1.8v5h5z"/>
              </svg>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
            <span style={{ fontSize: '13px', color: '#8c9196', cursor: 'pointer', fontWeight: 500 }} onClick={handleFormat}>Format JSON</span>
            <span style={{ fontSize: '13px', color: '#8c9196', cursor: 'pointer', fontWeight: 500 }} onClick={() => onChange('')}>Clear</span>
          </div>
        </div>
      )}
    </div>
  );
}

function BulkTags({ value, onChange }) {
  // Value is likely an array or comma-separated string
  const displayValue = Array.isArray(value) ? value.join(', ') : (value || '');
  
  return (
    <BulkInput 
      value={displayValue} 
      onChange={(v) => {
        // If they type a comma-separated string, we can store it as is,
        // or split it back to an array depending on how the backend expects it.
        // Let's store it as the string for now, or array if backend needs array.
        // The api.php expects an array of strings for tags.
        const arr = v.split(',').map(s => s.trim()).filter(s => s);
        onChange(arr);
      }} 
    />
  );
}
function BulkInput({ value, onChange, type = "text", align = "left", prefix, suffix, placeholder }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', width: '100%', height: '100%', padding: '0 12px' }}>
      {prefix && <span style={{ color: '#8c9196', marginRight: '4px', fontSize: '14px' }}>{prefix}</span>}
      <input
        type={type}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        style={{
          width: '100%',
          border: 'none',
          outline: 'none',
          background: 'transparent',
          textAlign: align,
          fontSize: '14px',
          fontFamily: 'inherit',
          padding: '10px 0',
          color: '#202223'
        }}
      />
      {suffix && <span style={{ color: '#8c9196', marginLeft: '4px', fontSize: '14px' }}>{suffix}</span>}
    </div>
  );
}

function AddPackageModal({ open, onClose, onAdd }) {
  const [type, setType] = useState('box');
  const [length, setLength] = useState('');
  const [width, setWidth] = useState('');
  const [height, setHeight] = useState('');
  const [dimUnit, setDimUnit] = useState('cm');
  const [weight, setWeight] = useState('');
  const [weightUnit, setWeightUnit] = useState('kg');
  const [name, setName] = useState('');
  const [isDefault, setIsDefault] = useState(false);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add package"
      primaryAction={{
        content: 'Add package',
        onAction: () => {
          onAdd({ name: name || 'Custom package', desc: `${length} × ${width} × ${height} ${dimUnit}, ${weight || 0} ${weightUnit}` });
          onClose();
        },
      }}
      secondaryActions={[
        {
          content: 'Cancel',
          onAction: onClose,
        },
      ]}
    >
      <Modal.Section>
        <div style={{ marginBottom: '16px' }}>
          <Text variant="bodyMd" as="p" fontWeight="semibold" paddingBottom="200">Package type</Text>
          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
            <div 
              onClick={() => setType('box')}
              style={{ flex: 1, padding: '8px', border: type === 'box' ? '2px solid #2c6ecb' : '1px solid #c9cccf', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: type === 'box' ? '#f0f4f8' : '#fff' }}
            >
              <svg viewBox="0 0 20 20" style={{ width: '16px', height: '16px', fill: '#5c5f62', marginRight: '6px' }}><path fillRule="evenodd" d="M14 6a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2h8zm-8 2h8v6H6V8zm1.5 1.5a.5.5 0 00-.5.5v1a.5.5 0 00.5.5h1a.5.5 0 00.5-.5v-1a.5.5 0 00-.5-.5h-1zM5 3a1 1 0 000 2h10a1 1 0 100-2H5z"/></svg>
              <span style={{ fontSize: '13px' }}>Box</span>
            </div>
            <div 
              onClick={() => setType('envelope')}
              style={{ flex: 1, padding: '8px', border: type === 'envelope' ? '2px solid #2c6ecb' : '1px solid #c9cccf', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: type === 'envelope' ? '#f0f4f8' : '#fff' }}
            >
              <svg viewBox="0 0 20 20" style={{ width: '16px', height: '16px', fill: '#5c5f62', marginRight: '6px' }}><path d="M17.5 4.5h-15c-.827 0-1.5.673-1.5 1.5v8c0 .827.673 1.5 1.5 1.5h15c.827 0 1.5-.673 1.5-1.5v-8c0-.827-.673-1.5-1.5-1.5zm-15 1.5h15v.854l-7.5 4.286-7.5-4.286v-.854zm0 8v-5.698l7.004 4.002a.997.997 0 00.992 0l7.004-4.002v5.698h-15z"/></svg>
              <span style={{ fontSize: '13px' }}>Envelope</span>
            </div>
            <div 
              onClick={() => setType('soft')}
              style={{ flex: 1, padding: '8px', border: type === 'soft' ? '2px solid #2c6ecb' : '1px solid #c9cccf', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: type === 'soft' ? '#f0f4f8' : '#fff' }}
            >
              <svg viewBox="0 0 20 20" style={{ width: '16px', height: '16px', fill: '#5c5f62', marginRight: '6px' }}><path d="M15 3h-10c-1.103 0-2 .897-2 2v10c0 1.103.897 2 2 2h10c1.103 0 2-.897 2-2v-10c0-1.103-.897-2-2-2zm-10 2h10v3h-10v-3zm0 10v-5h10v5h-10z"/></svg>
              <span style={{ fontSize: '13px' }}>Soft package</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
          <div style={{ flex: 3 }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <div style={{ flex: 1 }}>
                <TextField label="Length" type="number" value={length} onChange={setLength} autoComplete="off" />
              </div>
              <div style={{ flex: 1 }}>
                <TextField label="Width" type="number" value={width} onChange={setWidth} autoComplete="off" />
              </div>
              <div style={{ flex: 1 }}>
                <TextField label="Height" type="number" value={height} onChange={setHeight} autoComplete="off" />
              </div>
              <div style={{ flex: 1 }}>
                <Select label={<span style={{opacity: 0}}>Unit</span>} options={['cm', 'in']} value={dimUnit} onChange={setDimUnit} />
              </div>
            </div>
          </div>
          <div style={{ flex: 2 }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <div style={{ flex: 2 }}>
                <TextField label="Weight (empty)" type="number" value={weight} onChange={setWeight} autoComplete="off" />
              </div>
              <div style={{ flex: 1 }}>
                <Select label={<span style={{opacity: 0}}>Unit</span>} options={['kg', 'g', 'lb', 'oz']} value={weightUnit} onChange={setWeightUnit} />
              </div>
            </div>
          </div>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <TextField label="Package name" value={name} onChange={setName} autoComplete="off" />
        </div>

        <div style={{ marginTop: '16px' }}>
          <Checkbox 
            label="Use as default package for all products" 
            helpText="Used to calculate rates at checkout and pre-selected when buying labels"
            checked={isDefault}
            onChange={setIsDefault}
          />
        </div>
      </Modal.Section>
    </Modal>
  );
}


function BulkPackage({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [customPackages, setCustomPackages] = useState([]);
  const containerRef = useRef(null);
  
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  
  const options = [
    { value: 'Store default', label: 'Store default', icon: 'box' },
    { value: 'Sample box', label: 'Sample box', desc: '22 × 13.7 × 4.2 cm, 0 kg', icon: 'box' },
    ...customPackages
  ];
  
  const displayValue = options.find(o => o.value === value) || { label: value || 'Store default' };
  
  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', padding: '4px 12px', display: 'flex', alignItems: 'center', position: 'relative' }}>
      <div 
        style={{ width: '100%', height: '100%', border: open ? '2px solid #2c6ecb' : '1px solid #c9cccf', borderRadius: '4px', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 8px', cursor: 'pointer' }}
        onClick={() => setOpen(!open)}
      >
        <span style={{ fontSize: '13px', color: '#202223', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{displayValue.label}</span>
        <div style={{ display: 'flex', flexDirection: 'column', marginLeft: '8px' }}>
          <svg viewBox="0 0 20 20" style={{ width: '10px', height: '10px', fill: '#5c5f62' }}><path d="M10 6.5L14 10.5H6L10 6.5Z"/></svg>
          <svg viewBox="0 0 20 20" style={{ width: '10px', height: '10px', fill: '#5c5f62' }}><path d="M10 13.5L6 9.5H14L10 13.5Z"/></svg>
        </div>
      </div>
      
      {open && (
        <div style={{ position: 'absolute', top: '100%', left: '12px', right: '12px', background: '#fff', border: '1px solid #c9cccf', borderRadius: '4px', zIndex: 100, boxShadow: '0 4px 8px rgba(0,0,0,0.1)', marginTop: '2px', overflow: 'hidden' }}>
          <div style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', cursor: 'pointer', borderBottom: '1px solid #ebeef0' }} onClick={() => { setOpen(false); setModalOpen(true); }}>
             <svg viewBox="0 0 20 20" style={{ width: '16px', height: '16px', fill: '#2c6ecb', marginRight: '8px' }}>
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z"/>
             </svg>
             <span style={{ color: '#2c6ecb', fontSize: '13px', fontWeight: 500 }}>Add new package</span>
          </div>
          
          <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
            {options.map((o, i) => (
              <div 
                key={o.value}
                style={{ padding: '8px 12px', display: 'flex', alignItems: 'flex-start', cursor: 'pointer', background: value === o.value ? '#f4f6f8' : '#fff', borderBottom: i < options.length - 1 ? '1px solid #ebeef0' : 'none' }}
                onClick={() => { onChange(o.value); setOpen(false); }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f4f6f8'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = value === o.value ? '#f4f6f8' : '#fff'}
              >
                <div style={{ marginTop: '2px', marginRight: '8px' }}>
                  <svg viewBox="0 0 20 20" style={{ width: '16px', height: '16px', fill: '#5c5f62' }}>
                    <path fillRule="evenodd" d="M14 6a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2h8zm-8 2h8v6H6V8zm1.5 1.5a.5.5 0 00-.5.5v1a.5.5 0 00.5.5h1a.5.5 0 00.5-.5v-1a.5.5 0 00-.5-.5h-1zM5 3a1 1 0 000 2h10a1 1 0 100-2H5z"/>
                  </svg>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '13px', color: '#202223' }}>{o.label}</span>
                  {o.desc && <span style={{ fontSize: '12px', color: '#6d7175' }}>{o.desc}</span>}
                </div>
              </div>
            ))}
          </div>
          
          <div style={{ padding: '8px 12px', cursor: 'pointer', borderTop: '1px solid #ebeef0', fontSize: '13px', color: '#202223', fontWeight: 500 }} onClick={() => setOpen(false)}>
             Manage packages
          </div>
        </div>
      )}
      
      <AddPackageModal 
        open={modalOpen} 
        onClose={() => setModalOpen(false)} 
        onAdd={(newPkg) => {
          const newOpt = { value: newPkg.name, label: newPkg.name, desc: newPkg.desc, icon: 'box' };
          setCustomPackages([...customPackages, newOpt]);
          onChange(newPkg.name);
        }} 
      />
    </div>
  );
}

function BulkWeight({ weight, unit, onChange }) {
  const [open, setOpen] = useState(false);
  const units = ['lb', 'oz', 'kg', 'g'];
  
  return (
    <div style={{ padding: '4px 8px', height: '100%', display: 'flex', alignItems: 'center' }}>
      <div style={{ display: 'flex', border: '1px solid #c9cccf', borderRadius: '4px', overflow: 'visible', background: '#fff', width: '100%' }}>
        <input 
          type="number"
          value={weight}
          onChange={(e) => onChange(e.target.value, unit)}
          style={{ width: '100%', minWidth: '40px', padding: '4px 8px', border: 'none', outline: 'none', textAlign: 'left', fontSize: '13px' }}
        />
        <div 
          style={{ display: 'flex', alignItems: 'center', background: '#fafbfc', padding: '4px 8px', cursor: 'pointer', position: 'relative', borderLeft: '1px solid #c9cccf' }}
          onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        >
          <span style={{ fontSize: '13px', marginRight: '4px' }}>{unit}</span>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <svg viewBox="0 0 20 20" style={{ width: '8px', height: '8px', fill: '#5c5f62' }}><path d="M10 6.5L14 10.5H6L10 6.5Z"/></svg>
            <svg viewBox="0 0 20 20" style={{ width: '8px', height: '8px', fill: '#5c5f62' }}><path d="M10 13.5L6 9.5H14L10 13.5Z"/></svg>
          </div>
          {open && (
            <div style={{ position: 'absolute', top: '100%', right: '-1px', background: '#fff', border: '1px solid #c9cccf', borderRadius: '4px', zIndex: 50, width: '60px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', marginTop: '2px' }}>
              {units.map(u => (
                <div 
                  key={u} 
                  style={{ padding: '6px 12px', fontSize: '13px', cursor: 'pointer', background: unit === u ? '#2c6ecb' : '#fff', color: unit === u ? '#fff' : '#202223' }}
                  onClick={(e) => { e.stopPropagation(); onChange(weight, u); setOpen(false); }}
                >
                  {u}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function BulkUnitPrice({ value, onChange, basePrice }) {
  const [open, setOpen] = useState(false);
  const [focusField, setFocusField] = useState(null);
  const [openDropdown, setOpenDropdown] = useState(null);
  
  let parsed = { totalMeasure: '', totalUnit: 'g', baseMeasure: '1', baseUnit: 'g' };
  try { if (value) parsed = JSON.parse(value); } catch(e) {}
  
  const priceNum = parseFloat(basePrice);
  const totalNum = parseFloat(parsed.totalMeasure);
  const baseNum = parseFloat(parsed.baseMeasure);
  
  let calculatedUnitPrice = null;
  if (!isNaN(priceNum) && !isNaN(totalNum) && totalNum !== 0 && !isNaN(baseNum)) {
    calculatedUnitPrice = ((priceNum / totalNum) * baseNum).toFixed(2);
  }
  const displayString = calculatedUnitPrice ? `${calculatedUnitPrice}/${parsed.baseUnit}` : '--';

  const unitGroups = [
    { label: 'Weight', options: [ { value: 'mg', label: 'Milligram', abbr: 'mg' }, { value: 'g', label: 'Gram', abbr: 'g' }, { value: 'kg', label: 'Kilogram', abbr: 'kg' } ] },
    { label: 'Volume', options: [ { value: 'ml', label: 'Milliliter', abbr: 'ml' }, { value: 'cl', label: 'Centiliter', abbr: 'cl' }, { value: 'l', label: 'Liter', abbr: 'L' }, { value: 'm3', label: 'Cubic meter', abbr: 'm³' } ] },
    { label: 'Size', options: [ { value: 'mm', label: 'Millimeter', abbr: 'mm' }, { value: 'cm', label: 'Centimeter', abbr: 'cm' }, { value: 'm', label: 'Meter', abbr: 'm' } ] },
    { label: 'Area', options: [ { value: 'm2', label: 'Square meter', abbr: 'm²' } ] },
    { label: 'Per item', options: [ { value: 'item', label: 'Item', abbr: 'item' } ] }
  ];

  const getGroupForUnit = (u) => unitGroups.find(g => g.options.some(o => o.value === u)) || unitGroups[0];
  const totalGroup = getGroupForUnit(parsed.totalUnit);

  const getAbbr = (u) => {
    for (const g of unitGroups) {
      for (const o of g.options) {
        if (o.value === u) return o.abbr;
      }
    }
    return u;
  };

  const ConnectedInput = ({ label, measureVal, unitVal, onMeasureChange, onUnitChange, fieldName, availableGroups }) => (
    <div style={{ marginBottom: '12px', position: 'relative' }}>
      <div style={{ fontSize: '13px', color: '#202223', marginBottom: '4px' }}>{label}</div>
      <div style={{ 
        display: 'flex', 
        border: focusField === fieldName ? '2px solid #005bd3' : '1px solid #c9cccf',
        margin: focusField === fieldName ? '-1px' : '0',
        borderRadius: '4px', 
        overflow: 'visible',
        background: '#fff'
      }}>
        <input 
          type="text" 
          value={measureVal} 
          onChange={(e) => onMeasureChange(e.target.value)} 
          onFocus={() => { setFocusField(fieldName); setOpenDropdown(null); }}
          onBlur={() => setFocusField(null)}
          style={{ flex: 1, padding: '6px 12px', border: 'none', outline: 'none', background: 'transparent' }} 
        />
        <div 
          style={{ display: 'flex', alignItems: 'center', borderLeft: '1px solid #c9cccf', background: '#fafbfc', padding: '6px 8px', cursor: 'pointer', position: 'relative' }}
          onClick={(e) => { e.stopPropagation(); setOpenDropdown(openDropdown === fieldName ? null : fieldName); }}
        >
          <span style={{ marginRight: '8px', fontSize: '14px', color: '#202223' }}>{getAbbr(unitVal)}</span>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <svg viewBox="0 0 20 20" style={{ width: '10px', height: '10px', fill: '#5c5f62' }}><path d="M10 6.5L14 10.5H6L10 6.5Z"/></svg>
            <svg viewBox="0 0 20 20" style={{ width: '10px', height: '10px', fill: '#5c5f62' }}><path d="M10 13.5L6 9.5H14L10 13.5Z"/></svg>
          </div>
        </div>
      </div>
      
      {openDropdown === fieldName && (
        <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '4px', background: '#fff', borderRadius: '8px', boxShadow: '0 0 0 1px rgba(0,0,0,0.05), 0 4px 12px rgba(0,0,0,0.1)', zIndex: 60, minWidth: '160px', maxHeight: '200px', overflowY: 'auto' }}>
          {availableGroups.map((g, i) => (
            <div key={g.label}>
              {availableGroups.length > 1 && <div style={{ padding: '8px 12px', fontSize: '12px', fontWeight: 'bold', color: '#202223', backgroundColor: '#fafbfc', borderBottom: '1px solid #f4f6f8', borderTop: i > 0 ? '1px solid #f4f6f8' : 'none' }}>{g.label}</div>}
              {g.options.map(o => (
                <div 
                  key={o.value} 
                  onClick={() => { onUnitChange(o.value); setOpenDropdown(null); }}
                  style={{ padding: '8px 12px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', backgroundColor: unitVal === o.value ? '#f4f6f8' : '#fff' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f4f6f8'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = unitVal === o.value ? '#f4f6f8' : '#fff'}
                >
                  <span style={{ color: '#202223', fontSize: '14px' }}>{o.label}</span>
                  <span style={{ color: '#202223', fontSize: '14px', fontWeight: 'bold' }}>{o.abbr}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', cursor: 'pointer', outline: open ? '2px solid #005bd3' : 'none', outlineOffset: '-2px' }} onClick={() => setOpen(true)}>
      <div style={{ padding: '0 12px', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', color: calculatedUnitPrice ? '#202223' : '#8c9196' }}>
        {displayString}
        <div style={{ display: 'flex', flexDirection: 'column', marginLeft: '8px' }}>
          <Icon source={ChevronUpMinor} color="subdued" />
          <Icon source={ChevronDownMinor} color="subdued" />
        </div>
      </div>
      
      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={(e) => { e.stopPropagation(); setOpen(false); setOpenDropdown(null); }} />
          <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '4px', background: '#fff', borderRadius: '8px', boxShadow: '0 0 0 1px rgba(0,0,0,0.05), 0 4px 12px rgba(0,0,0,0.1)', zIndex: 50, padding: '16px', minWidth: '260px', textAlign: 'left', cursor: 'default' }} onClick={(e) => e.stopPropagation()}>
            
            <ConnectedInput 
              label="Total Measure"
              fieldName="total"
              measureVal={parsed.totalMeasure} 
              unitVal={parsed.totalUnit} 
              availableGroups={unitGroups}
              onMeasureChange={(v) => onChange(JSON.stringify({...parsed, totalMeasure: v}))}
              onUnitChange={(v) => {
                let newBaseUnit = parsed.baseUnit;
                const newGroup = getGroupForUnit(v);
                if (newGroup !== totalGroup) {
                  newBaseUnit = newGroup.options[0].value;
                }
                onChange(JSON.stringify({...parsed, totalUnit: v, baseUnit: newBaseUnit}));
              }}
            />

            <ConnectedInput 
              label="Base Measure"
              fieldName="base"
              measureVal={parsed.baseMeasure} 
              unitVal={parsed.baseUnit}
              availableGroups={[totalGroup]}
              onMeasureChange={(v) => onChange(JSON.stringify({...parsed, baseMeasure: v}))}
              onUnitChange={(v) => onChange(JSON.stringify({...parsed, baseUnit: v}))}
            />

            <div>
              <div style={{ fontSize: '13px', color: '#8c9196', marginBottom: '4px' }}>Unit Price</div>
              <input type="text" disabled value={displayString} style={{ width: '100%', padding: '6px 12px', border: '1px solid #e1e3e5', borderRadius: '4px', background: '#f4f6f8', color: '#202223', outline: 'none' }} />
            </div>

          </div>
        </>
      )}
    </div>
  );
}

function BulkSelect({ value, onChange, options }) {
  const getBg = (v) => {
    const val = String(v).toLowerCase();
    if (val === 'active') return '#aee9d1';
    if (val === 'draft') return '#b4e1fa';
    if (val === 'archived') return '#e4e5e7';
    return 'transparent';
  };
  const bg = getBg(value);
  const isPill = bg !== 'transparent';
  const displayLabel = options.find(o => o.value === value)?.label || value;

  return (
    <div style={{ width: '100%', height: '100%', padding: '0 12px', display: 'flex', alignItems: 'center', position: 'relative' }}>
      {isPill ? (
        <>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', pointerEvents: 'none' }}>
            <div style={{ background: bg, borderRadius: '12px', padding: '2px 8px', fontSize: '13px', color: '#202223', fontWeight: 500 }}>
              {displayLabel}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
              <svg viewBox="0 0 20 20" style={{ width: '10px', height: '10px', fill: '#5c5f62' }}><path d="M10 6.5L14 10.5H6L10 6.5Z"/></svg>
              <svg viewBox="0 0 20 20" style={{ width: '10px', height: '10px', fill: '#5c5f62' }}><path d="M10 13.5L6 9.5H14L10 13.5Z"/></svg>
            </div>
          </div>
          <select
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
          >
            <option value="" disabled></option>
            <option value="—" disabled></option>
            {options.map(o => <option key={o.value} value={o.value}>{o.label === "—" ? "" : o.label}</option>)}
          </select>
        </>
      ) : (
        <select
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent', padding: '4px 0', fontSize: '13px', fontFamily: 'inherit', cursor: 'pointer', color: '#202223' }}
        >
          <option value="" disabled></option>
          <option value="—" disabled></option>
          {options.map(o => <option key={o.value} value={o.value}>{o.label === "—" ? "" : o.label}</option>)}
        </select>
      )}
    </div>
  );
}


const COUNTRY_OPTIONS = [
  {"label": "Afghanistan", "value": "AF"},
  {"label": "Åland Islands", "value": "AX"},
  {"label": "Albania", "value": "AL"},
  {"label": "Algeria", "value": "DZ"},
  {"label": "American Samoa", "value": "AS"},
  {"label": "Andorra", "value": "AD"},
  {"label": "Angola", "value": "AO"},
  {"label": "Anguilla", "value": "AI"},
  {"label": "Antarctica", "value": "AQ"},
  {"label": "Antigua and Barbuda", "value": "AG"},
  {"label": "Argentina", "value": "AR"},
  {"label": "Armenia", "value": "AM"},
  {"label": "Aruba", "value": "AW"},
  {"label": "Australia", "value": "AU"},
  {"label": "Austria", "value": "AT"},
  {"label": "Azerbaijan", "value": "AZ"},
  {"label": "Bahamas", "value": "BS"},
  {"label": "Bahrain", "value": "BH"},
  {"label": "Bangladesh", "value": "BD"},
  {"label": "Barbados", "value": "BB"},
  {"label": "Belarus", "value": "BY"},
  {"label": "Belgium", "value": "BE"},
  {"label": "Belize", "value": "BZ"},
  {"label": "Benin", "value": "BJ"},
  {"label": "Bermuda", "value": "BM"},
  {"label": "Bhutan", "value": "BT"},
  {"label": "Bolivia (Plurinational State of)", "value": "BO"},
  {"label": "Bonaire, Sint Eustatius and Saba", "value": "BQ"},
  {"label": "Bosnia and Herzegovina", "value": "BA"},
  {"label": "Botswana", "value": "BW"},
  {"label": "Bouvet Island", "value": "BV"},
  {"label": "Brazil", "value": "BR"},
  {"label": "British Indian Ocean Territory", "value": "IO"},
  {"label": "Brunei Darussalam", "value": "BN"},
  {"label": "Bulgaria", "value": "BG"},
  {"label": "Burkina Faso", "value": "BF"},
  {"label": "Burundi", "value": "BI"},
  {"label": "Cabo Verde", "value": "CV"},
  {"label": "Cambodia", "value": "KH"},
  {"label": "Cameroon", "value": "CM"},
  {"label": "Canada", "value": "CA"},
  {"label": "Cayman Islands", "value": "KY"},
  {"label": "Central African Republic", "value": "CF"},
  {"label": "Chad", "value": "TD"},
  {"label": "Chile", "value": "CL"},
  {"label": "China", "value": "CN"},
  {"label": "Christmas Island", "value": "CX"},
  {"label": "Cocos (Keeling) Islands", "value": "CC"},
  {"label": "Colombia", "value": "CO"},
  {"label": "Comoros", "value": "KM"},
  {"label": "Congo", "value": "CG"},
  {"label": "Congo, Democratic Republic of the", "value": "CD"},
  {"label": "Cook Islands", "value": "CK"},
  {"label": "Costa Rica", "value": "CR"},
  {"label": "Côte d'Ivoire", "value": "CI"},
  {"label": "Croatia", "value": "HR"},
  {"label": "Cuba", "value": "CU"},
  {"label": "Curaçao", "value": "CW"},
  {"label": "Cyprus", "value": "CY"},
  {"label": "Czechia", "value": "CZ"},
  {"label": "Denmark", "value": "DK"},
  {"label": "Djibouti", "value": "DJ"},
  {"label": "Dominica", "value": "DM"},
  {"label": "Dominican Republic", "value": "DO"},
  {"label": "Ecuador", "value": "EC"},
  {"label": "Egypt", "value": "EG"},
  {"label": "El Salvador", "value": "SV"},
  {"label": "Equatorial Guinea", "value": "GQ"},
  {"label": "Eritrea", "value": "ER"},
  {"label": "Estonia", "value": "EE"},
  {"label": "Eswatini", "value": "SZ"},
  {"label": "Ethiopia", "value": "ET"},
  {"label": "Falkland Islands (Malvinas)", "value": "FK"},
  {"label": "Faroe Islands", "value": "FO"},
  {"label": "Fiji", "value": "FJ"},
  {"label": "Finland", "value": "FI"},
  {"label": "France", "value": "FR"},
  {"label": "French Guiana", "value": "GF"},
  {"label": "French Polynesia", "value": "PF"},
  {"label": "French Southern Territories", "value": "TF"},
  {"label": "Gabon", "value": "GA"},
  {"label": "Gambia", "value": "GM"},
  {"label": "Georgia", "value": "GE"},
  {"label": "Germany", "value": "DE"},
  {"label": "Ghana", "value": "GH"},
  {"label": "Gibraltar", "value": "GI"},
  {"label": "Greece", "value": "GR"},
  {"label": "Greenland", "value": "GL"},
  {"label": "Grenada", "value": "GD"},
  {"label": "Guadeloupe", "value": "GP"},
  {"label": "Guam", "value": "GU"},
  {"label": "Guatemala", "value": "GT"},
  {"label": "Guernsey", "value": "GG"},
  {"label": "Guinea", "value": "GN"},
  {"label": "Guinea-Bissau", "value": "GW"},
  {"label": "Guyana", "value": "GY"},
  {"label": "Haiti", "value": "HT"},
  {"label": "Heard Island and McDonald Islands", "value": "HM"},
  {"label": "Holy See", "value": "VA"},
  {"label": "Honduras", "value": "HN"},
  {"label": "Hong Kong", "value": "HK"},
  {"label": "Hungary", "value": "HU"},
  {"label": "Iceland", "value": "IS"},
  {"label": "India", "value": "IN"},
  {"label": "Indonesia", "value": "ID"},
  {"label": "Iran (Islamic Republic of)", "value": "IR"},
  {"label": "Iraq", "value": "IQ"},
  {"label": "Ireland", "value": "IE"},
  {"label": "Isle of Man", "value": "IM"},
  {"label": "Israel", "value": "IL"},
  {"label": "Italy", "value": "IT"},
  {"label": "Jamaica", "value": "JM"},
  {"label": "Japan", "value": "JP"},
  {"label": "Jersey", "value": "JE"},
  {"label": "Jordan", "value": "JO"},
  {"label": "Kazakhstan", "value": "KZ"},
  {"label": "Kenya", "value": "KE"},
  {"label": "Kiribati", "value": "KI"},
  {"label": "Korea (Democratic People's Republic of)", "value": "KP"},
  {"label": "Korea, Republic of", "value": "KR"},
  {"label": "Kuwait", "value": "KW"},
  {"label": "Kyrgyzstan", "value": "KG"},
  {"label": "Lao People's Democratic Republic", "value": "LA"},
  {"label": "Latvia", "value": "LV"},
  {"label": "Lebanon", "value": "LB"},
  {"label": "Lesotho", "value": "LS"},
  {"label": "Liberia", "value": "LR"},
  {"label": "Libya", "value": "LY"},
  {"label": "Liechtenstein", "value": "LI"},
  {"label": "Lithuania", "value": "LT"},
  {"label": "Luxembourg", "value": "LU"},
  {"label": "Macao", "value": "MO"},
  {"label": "Madagascar", "value": "MG"},
  {"label": "Malawi", "value": "MW"},
  {"label": "Malaysia", "value": "MY"},
  {"label": "Maldives", "value": "MV"},
  {"label": "Mali", "value": "ML"},
  {"label": "Malta", "value": "MT"},
  {"label": "Marshall Islands", "value": "MH"},
  {"label": "Martinique", "value": "MQ"},
  {"label": "Mauritania", "value": "MR"},
  {"label": "Mauritius", "value": "MU"},
  {"label": "Mayotte", "value": "YT"},
  {"label": "Mexico", "value": "MX"},
  {"label": "Micronesia (Federated States of)", "value": "FM"},
  {"label": "Moldova, Republic of", "value": "MD"},
  {"label": "Monaco", "value": "MC"},
  {"label": "Mongolia", "value": "MN"},
  {"label": "Montenegro", "value": "ME"},
  {"label": "Montserrat", "value": "MS"},
  {"label": "Morocco", "value": "MA"},
  {"label": "Mozambique", "value": "MZ"},
  {"label": "Myanmar", "value": "MM"},
  {"label": "Namibia", "value": "NA"},
  {"label": "Nauru", "value": "NR"},
  {"label": "Nepal", "value": "NP"},
  {"label": "Netherlands", "value": "NL"},
  {"label": "New Caledonia", "value": "NC"},
  {"label": "New Zealand", "value": "NZ"},
  {"label": "Nicaragua", "value": "NI"},
  {"label": "Niger", "value": "NE"},
  {"label": "Nigeria", "value": "NG"},
  {"label": "Niue", "value": "NU"},
  {"label": "Norfolk Island", "value": "NF"},
  {"label": "North Macedonia", "value": "MK"},
  {"label": "Northern Mariana Islands", "value": "MP"},
  {"label": "Norway", "value": "NO"},
  {"label": "Oman", "value": "OM"},
  {"label": "Pakistan", "value": "PK"},
  {"label": "Palau", "value": "PW"},
  {"label": "Palestine, State of", "value": "PS"},
  {"label": "Panama", "value": "PA"},
  {"label": "Papua New Guinea", "value": "PG"},
  {"label": "Paraguay", "value": "PY"},
  {"label": "Peru", "value": "PE"},
  {"label": "Philippines", "value": "PH"},
  {"label": "Pitcairn", "value": "PN"},
  {"label": "Poland", "value": "PL"},
  {"label": "Portugal", "value": "PT"},
  {"label": "Puerto Rico", "value": "PR"},
  {"label": "Qatar", "value": "QA"},
  {"label": "Réunion", "value": "RE"},
  {"label": "Romania", "value": "RO"},
  {"label": "Russian Federation", "value": "RU"},
  {"label": "Rwanda", "value": "RW"},
  {"label": "Saint Barthélemy", "value": "BL"},
  {"label": "Saint Helena, Ascension and Tristan da Cunha", "value": "SH"},
  {"label": "Saint Kitts and Nevis", "value": "KN"},
  {"label": "Saint Lucia", "value": "LC"},
  {"label": "Saint Martin (French part)", "value": "MF"},
  {"label": "Saint Pierre and Miquelon", "value": "PM"},
  {"label": "Saint Vincent and the Grenadines", "value": "VC"},
  {"label": "Samoa", "value": "WS"},
  {"label": "San Marino", "value": "SM"},
  {"label": "Sao Tome and Principe", "value": "ST"},
  {"label": "Saudi Arabia", "value": "SA"},
  {"label": "Senegal", "value": "SN"},
  {"label": "Serbia", "value": "RS"},
  {"label": "Seychelles", "value": "SC"},
  {"label": "Sierra Leone", "value": "SL"},
  {"label": "Singapore", "value": "SG"},
  {"label": "Sint Maarten (Dutch part)", "value": "SX"},
  {"label": "Slovakia", "value": "SK"},
  {"label": "Slovenia", "value": "SI"},
  {"label": "Solomon Islands", "value": "SB"},
  {"label": "Somalia", "value": "SO"},
  {"label": "South Africa", "value": "ZA"},
  {"label": "South Georgia and the South Sandwich Islands", "value": "GS"},
  {"label": "South Sudan", "value": "SS"},
  {"label": "Spain", "value": "ES"},
  {"label": "Sri Lanka", "value": "LK"},
  {"label": "Sudan", "value": "SD"},
  {"label": "Suriname", "value": "SR"},
  {"label": "Svalbard and Jan Mayen", "value": "SJ"},
  {"label": "Sweden", "value": "SE"},
  {"label": "Switzerland", "value": "CH"},
  {"label": "Syrian Arab Republic", "value": "SY"},
  {"label": "Taiwan, Province of China", "value": "TW"},
  {"label": "Tajikistan", "value": "TJ"},
  {"label": "Tanzania, United Republic of", "value": "TZ"},
  {"label": "Thailand", "value": "TH"},
  {"label": "Timor-Leste", "value": "TL"},
  {"label": "Togo", "value": "TG"},
  {"label": "Tokelau", "value": "TK"},
  {"label": "Tonga", "value": "TO"},
  {"label": "Trinidad and Tobago", "value": "TT"},
  {"label": "Tunisia", "value": "TN"},
  {"label": "Turkey", "value": "TR"},
  {"label": "Turkmenistan", "value": "TM"},
  {"label": "Turks and Caicos Islands", "value": "TC"},
  {"label": "Tuvalu", "value": "TV"},
  {"label": "Uganda", "value": "UG"},
  {"label": "Ukraine", "value": "UA"},
  {"label": "United Arab Emirates", "value": "AE"},
  {"label": "United Kingdom of Great Britain and Northern Ireland", "value": "GB"},
  {"label": "United States of America", "value": "US"},
  {"label": "United States Minor Outlying Islands", "value": "UM"},
  {"label": "Uruguay", "value": "UY"},
  {"label": "Uzbekistan", "value": "UZ"},
  {"label": "Vanuatu", "value": "VU"},
  {"label": "Venezuela (Bolivarian Republic of)", "value": "VE"},
  {"label": "Viet Nam", "value": "VN"},
  {"label": "Virgin Islands (British)", "value": "VG"},
  {"label": "Virgin Islands (U.S.)", "value": "VI"},
  {"label": "Wallis and Futuna", "value": "WF"},
  {"label": "Western Sahara", "value": "EH"},
  {"label": "Yemen", "value": "YE"},
  {"label": "Zambia", "value": "ZM"},
  {"label": "Zimbabwe", "value": "ZW"}
]
;

const BULK_COLUMN_GROUPS = [
  {
    title: "General",
    columns: [
      { key: "title", label: "Product title", disabled: true },
      { key: "description", label: "Description" },
      { key: "media", label: "Product media" },
      { key: "tags", label: "Tags" },
      { key: "status", label: "Status" },
      { key: "product_category", label: "Product category" }, // user screenshot uses "Product category"
      { key: "product_type", label: "Product type" },
      { key: "vendor", label: "Vendor" },
      { key: "template", label: "Template" },
    ]
  },
  {
    title: "Pricing",
    columns: [
      { key: "price", label: "Base price" },
      { key: "unit_price", label: "Unit price" },
      { key: "compare_at_price", label: "Compare-at price" },
      { key: "cost_per_item", label: "Cost per item" },
      { key: "charge_taxes", label: "Charge taxes" },
    ]
  },
  {
    title: "Publishing",
    columns: [
      { key: "sales_channels", label: "Sales channels" },
      { key: "online_store_scheduled", label: "Online store schedule" },
      { key: "online_store_publish_date", label: "Publish date" },
      { key: "testing", label: "testing" },
    ]
  },
  {
    title: "Inventory",
    columns: [
      { key: "sku", label: "SKU" },
      { key: "barcode", label: "Barcodes" },
      { key: "continue_selling", label: "Continue selling when out of stock" },
      { key: "track_quantity", label: "Track quantity" },
    ]
  },
  {
    title: "Shipping",
    columns: [
      { key: "package", label: "Package" },
      { key: "weight", label: "Weight" },
      { key: "physical", label: "Physical product" },
      { key: "hs_code", label: "Harmonized system code" },
      { key: "origin", label: "Country of origin" },
    ]
  },
  {
    title: "SEO",
    columns: [
      { key: "meta_title", label: "Page title (SEO)" },
      { key: "meta_description", label: "Meta description (SEO)" },
      { key: "handle", label: "URL handle (SEO)" },
    ]
  },
  {
    title: "Metafields",
    columns: [
      { key: "metafield_category", label: "Category" },
      { key: "metafield_z8", label: "Z8 Offers" },
    ]
  }
];

function ColumnsPopover({ activeColumns, onChange }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const toggleColumn = (key) => {
    if (activeColumns.includes(key)) {
      onChange(activeColumns.filter(c => c !== key));
    } else {
      onChange([...activeColumns, key]);
    }
  };

  const filteredGroups = useMemo(() => {
    if (!query) return BULK_COLUMN_GROUPS;
    const lowerQuery = query.toLowerCase();
    return BULK_COLUMN_GROUPS.map(g => ({
      ...g,
      columns: g.columns.filter(c => c.label.toLowerCase().includes(lowerQuery))
    })).filter(g => g.columns.length > 0);
  }, [query]);

  return (
    <Popover
      active={open}
      onClose={() => setOpen(false)}
      activator={<Button icon={Columns3Minor} onClick={() => setOpen(!open)}>Columns</Button>}
      autofocusTarget="none"
      preferredAlignment="right"
    >
      <div style={{ width: '320px', display: 'flex', flexDirection: 'column', maxHeight: '500px' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #dfe3e8' }}>
          <TextField
            prefix={<Icon source={SearchMinor} color="subdued" />}
            placeholder="Search fields"
            value={query}
            onChange={setQuery}
            autoComplete="off"
            clearButton
            onClearButtonClick={() => setQuery("")}
          />
        </div>
        <div style={{ padding: '8px 16px', overflowY: 'auto', flex: 1 }}>
          {filteredGroups.map(group => (
            <div key={group.title} style={{ marginBottom: '16px' }}>
              <Text variant="headingSm" as="h4" fontWeight="bold">
                <span style={{ display: 'block', marginBottom: '8px' }}>{group.title}</span>
              </Text>
              {group.columns.map(col => (
                <div key={col.key} style={{ marginBottom: '8px' }}>
                  <Checkbox
                    label={col.label}
                    checked={col.key === 'title' || activeColumns.includes(col.key)}
                    disabled={col.disabled}
                    onChange={() => toggleColumn(col.key)}
                  />
                </div>
              ))}
            </div>
          ))}
          {filteredGroups.length > 0 && filteredGroups.some(g => g.title === 'Metafields') && (
            <div style={{ marginTop: '8px', marginBottom: '16px' }}>
              <Button plain>Show all metafields</Button>
            </div>
          )}
        </div>
      </div>
    </Popover>
  );
}

function CatalogBulkEditor({ products, columns, onColumnsChange, onSave, isSaving, onDiscard }) {
  
  const [expanded, setExpanded] = useState({});
  const [changes, setChanges] = useState(() => {
    const initialState = {};
    products.forEach((p) => {
      initialState[`p_${p.id}`] = {
        title: p.title || "",
        status: p.status?.value || p.status?.label || p.status || "active",
        product_type: p.product_type || "",
        product_category: p.product_category || "—",
        sales_channels: p.sales_channels || "Online Store",
        online_store_scheduled: p.online_store_scheduled || "false",
        online_store_publish_date: p.published_at || "—",
        testing: p.testing || "false",
        
        vendor: p.vendor || "",
        sku: p.sku || "",
        price: p.price || "",
        inventory: p.inventory ?? "",
        tags: Array.isArray(p.tags) ? p.tags.join(', ') : (p.tags || ""),
        meta_title: p.meta_title || "",
        meta_description: p.meta_description || "",
        handle: p.handle || "",
        published_at: p.published_at || "",
        description: (p.description !== undefined && p.description !== "—") ? p.description : (p.body_html || ""),
        template: p.template || "product",
        media: p.image_url || "",
        unit_price: p.unit_price || "",
        compare_at_price: p.compare_at_price || "",
        cost_per_item: p.cost_per_item || "",
        charge_taxes: "Yes",
        barcode: p.barcode || "",
        continue_selling: "No",
        track_quantity: "Yes",
        package: p.package || "Store default",
        weight: p.weight || "",
        weight_unit: p.weight_unit || "kg",
        physical: "true",
        hs_code: p.hs_code || "",
        origin: p.origin || "",
        metafield_category: p.product_category && p.product_category !== "—" ? p.product_category : (p.metafield_category !== "—" ? p.metafield_category : ""),
        metafield_z8: p.metafield_z8 !== "—" ? p.metafield_z8 : "",
      };
      if (p.variants_list) {
        p.variants_list.forEach(v => {
          initialState[`v_${v.id}`] = {
            title: v.title || "",
            sku: v.sku || "",
            price: v.price || "",
            inventory: v.inventory ?? "",
            compare_at_price: v.compare_at_price || "",
            cost_per_item: v.cost_per_item || "",
            barcode: v.barcode || "",
            weight: v.weight || "",
            weight_unit: v.weight_unit || "kg",
            physical: "true",
            hs_code: v.hs_code || "",
            origin: v.origin || "",
            testing: v.testing || "false",
            charge_taxes: v.charge_taxes || "false",
            unit_price: v.unit_price || "",
            continue_selling: v.continue_selling || "false",
            track_quantity: v.track_quantity || "false",
            package: v.package || "Store default",
          };
        });
      }
    });
    return initialState;
  });

  // Automatically expand products that have variants
  useEffect(() => {
    const initialExpanded = {};
    products.forEach(p => {
      if (p.variants_list && p.variants_list.length > 0) {
        initialExpanded[p.id] = true;
      }
    });
    setExpanded(initialExpanded);
  }, [products]);

  const [colWidths, setColWidths] = useState({
    title: 300,
    status: 140,
    vendor: 160,
    price: 140,
    sku: 160,
    inventory: 140,
    product_type: 180,
    product_category: 220,
    template: 180,
    sales_channels: 260,
    description: 240,
    media: 140,
    tags: 220,
    compare_at_price: 150,
    unit_price: 140,
    cost_per_item: 140,
    weight: 140,
    charge_taxes: 140,
    barcode: 160,
    continue_selling: 180,
    track_quantity: 140,
    hs_code: 140,
    origin: 140,
    physical: 140,
    package: 140,
    testing: 140,
    meta_title: 200,
    meta_description: 240,
    handle: 200,
    metafield_category: 200,
    metafield_z8: 200
  });

  const startResize = (e, key) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = parseInt(colWidths[key] || (key === 'title' ? 300 : 160));
    
    const onMouseMove = (moveEvent) => {
      const newWidth = Math.max(80, startWidth + (moveEvent.clientX - startX));
      setColWidths(prev => ({ ...prev, [key]: newWidth }));
    };
    
    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
    
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const visibleColumns = useMemo(() => {
    const allDefs = BULK_COLUMN_GROUPS.flatMap(g => g.columns);
    const activeDefs = [];
    
    // Widths mapping for specific columns to look like Shopify
    const _oldColWidths = {
      title: '300px',
      status: '140px',
      vendor: '160px',
      price: '140px',
      sku: '160px',
      inventory: '140px',
      product_type: '180px',
      product_category: '220px',
      template: '180px',
      sales_channels: '260px',
      description: '240px',
      media: '140px',
      tags: '220px',
      compare_at_price: '150px',
      unit_price: '140px',
      cost_per_item: '140px',
      weight: '140px',
      charge_taxes: '140px',
      barcode: '160px',
      continue_selling: '180px',
      track_quantity: '140px',
      hs_code: '140px',
      origin: '140px',
      online_store_scheduled: '160px',
      online_store_publish_date: '160px',
      testing: '110px',
    };
    
    // Always include title first
    activeDefs.push({ key: "title", label: "Product title", width: (colWidths['title'] || 300) + 'px' });
    
    // Include other selected columns in category order
    allDefs.forEach(def => {
      if (def.key === 'title') return;
      if (columns.includes(def.key)) {
        let width = (colWidths[def.key] || 160) + 'px';
        
        if (def.key === 'status') {
          activeDefs.push({ ...def, type: 'select', width, options: [{label: "Active", value: "active"}, {label: "Draft", value: "draft"}, {label: "Archived", value: "archived"}] });
        } else if (def.key === 'template') {
          activeDefs.push({ ...def, type: 'select', width, options: [
            {label: "Default product", value: "product"},
            {label: "alternate", value: "product.alternate"},
            {label: "coming-soon", value: "product.coming-soon"},
            {label: "preorder", value: "product.preorder"}
          ]});
        } else if (def.key === 'product_type') {
          activeDefs.push({ ...def, type: 'select', width, options: [
            {label: "Jcb Service", value: "Jcb Service"},
            {label: "Snowboard", value: "Snowboard"},
            {label: "Apparel", value: "Apparel"},
            {label: "Accessories", value: "Accessories"},
            {label: "Hardware", value: "Hardware"},
            {label: "Custom", value: "Custom"},
            {label: "—", value: "—"}
          ]});
        } else if (def.key === 'online_store_publish_date') {
          activeDefs.push({ ...def, type: 'date', width });
        } else if (def.key === 'online_store_scheduled' || def.key === 'testing' || def.key === 'charge_taxes' || def.key === 'continue_selling' || def.key === 'track_quantity' || def.key === 'physical') {
          activeDefs.push({ ...def, type: 'checkbox', width });
        } else if (def.key === 'sales_channels') {
          activeDefs.push({ ...def, type: 'sales_channels', width });
        } else if (def.key === 'product_category') {
          activeDefs.push({ ...def, type: 'select', width, options: [
            {label: "Skiing & Snowboarding", value: "Skiing & Snowboarding"},
            {label: "Sporting Goods", value: "Sporting Goods"},
            {label: "Apparel & Accessories", value: "Apparel & Accessories"},
            {label: "Electronics", value: "Electronics"},
            {label: "Home & Garden", value: "Home & Garden"},
            {label: "Uncategorized", value: "Uncategorized"},
            {label: "—", value: "—"}
          ]});
        } else if (def.key === 'package') {
          activeDefs.push({ ...def, type: 'package', width });
        } else if (def.key === 'unit_price') {
          activeDefs.push({ ...def, type: 'unit_price', width });
        } else if (def.key === 'weight') {
          activeDefs.push({ ...def, type: 'weight', width });
        } else if (['price', 'inventory', 'compare_at_price', 'cost_per_item'].includes(def.key)) {
          activeDefs.push({ ...def, type: 'number', width });
        } else if (def.key === 'origin') {
          activeDefs.push({ ...def, type: 'select', width, options: COUNTRY_OPTIONS });
        } else {
          activeDefs.push({ ...def, width });
        }
      }
    });
    
    return activeDefs;
  }, [columns, colWidths]);

  const updateChange = (id, key, value) => {
    setChanges(prev => ({ ...prev, [id]: { ...prev[id], [key]: value } }));
  };

  const toggleExpand = (id) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  // Check if any changes were made compared to initial state
  const hasChanges = true; // Simplified for now

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#f4f6f8', zIndex: 50, display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', height: '56px', borderBottom: '1px solid #dfe3e8', backgroundColor: '#fff', padding: '0 16px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
          <Button plain icon={ArrowLeftMinor} onClick={onDiscard}>Back</Button>
          <div style={{ width: '1px', height: '24px', backgroundColor: '#dfe3e8' }} />
          <Text as="span" variant="headingSm" fontWeight="semibold">Editing {products.length} products</Text>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <ColumnsPopover activeColumns={columns} onChange={onColumnsChange} />
          <Button primary disabled={!hasChanges} loading={isSaving} onClick={() => onSave(changes)}>Save</Button>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto' }}>
        <table style={{ tableLayout: 'fixed', width: 'max-content', borderCollapse: 'collapse', backgroundColor: '#fff' }}>
          <thead style={{ position: 'sticky', top: 0, backgroundColor: '#f4f6f8', zIndex: 10, boxShadow: '0 1px 0 0 #dfe3e8' }}>
            <tr>
              {visibleColumns.map((col, i) => (
                <th key={col.key} style={{ position: i === 0 ? 'sticky' : 'relative', width: col.width, minWidth: col.width, maxWidth: col.width, padding: '10px 12px', textAlign: col.type === 'number' ? 'right' : 'left', fontWeight: 'normal', color: '#202223', borderRight: i < visibleColumns.length - 1 ? '1px solid #dfe3e8' : 'none', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', left: i === 0 ? 0 : 'auto', zIndex: i === 0 ? 11 : 'auto', backgroundColor: '#f4f6f8' }}>
                  {col.label}
                  <div 
                    onMouseDown={(e) => startResize(e, col.key)}
                    style={{ position: 'absolute', right: '-2px', top: 0, bottom: 0, width: '5px', cursor: 'col-resize', zIndex: 20, backgroundColor: 'transparent' }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = '#2c6ecb'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {products.map((p) => {
              const hasVariants = p.variants_list && (p.variants_list.length > 1 || (p.variants_list.length === 1 && p.variants_list[0].title !== 'Default Title'));
              const isExpanded = expanded[p.id];
              return (
                <Fragment key={p.id}>
                  <tr style={{ borderBottom: '1px solid #dfe3e8' }}>
                    {visibleColumns.map((col, i) => {
                      const isTitle = col.key === 'title';
                      const isVariantLevelField = ['price', 'sku', 'inventory', 'compare_at_price', 'barcode', 'weight', 'physical', 'package', 'cost_per_item', 'hs_code', 'origin', 'unit_price', 'charge_taxes', 'continue_selling', 'track_quantity'].includes(col.key);
                      
                      return (
                        <td key={col.key} style={{ width: col.width, minWidth: col.width, maxWidth: col.width, padding: 0, borderRight: i < visibleColumns.length - 1 ? '1px solid #dfe3e8' : 'none', verticalAlign: 'middle', height: '44px', position: i === 0 ? 'sticky' : 'static', left: i === 0 ? 0 : 'auto', zIndex: i === 0 ? 2 : 'auto', backgroundColor: '#ffffff' }}>
                          {isTitle ? (
                            <div style={{ display: 'flex', alignItems: 'center', padding: '0 8px', height: '100%' }}>
                              <div style={{ width: '28px', height: '28px', border: '1px solid #dfe3e8', borderRadius: '4px', overflow: 'hidden', flexShrink: 0, marginRight: '12px', backgroundColor: '#f4f6f8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {p.image_url ? <img src={p.image_url} style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <Icon source={ImageMajor} color="subdued" />}
                              </div>
                              <div style={{ flex: 1, height: '100%' }}>
                                <BulkInput value={changes[`p_${p.id}`].title} onChange={(v) => updateChange(`p_${p.id}`, 'title', v)} />
                              </div>
                              {hasVariants && (
                                <div style={{ cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }} onClick={() => toggleExpand(p.id)}>
                                  <Icon source={isExpanded ? ChevronUpMinor : ChevronDownMinor} color="base" />
                                </div>
                              )}
                            </div>
                          ) : (hasVariants && isVariantLevelField) ? (
                            <div style={{ display: 'flex', alignItems: 'center', width: '100%', height: '100%', justifyContent: 'center', padding: '0 12px' }}>
                              <span style={{ color: '#8c9196' }}>—</span>
                            </div>
                          ) : col.type === 'select' ? (
                            <BulkSelect options={col.options} value={changes[`p_${p.id}`][col.key]} onChange={(v) => updateChange(`p_${p.id}`, col.key, v)} />
                          ) : col.key === 'media' ? (
                            <div style={{ padding: '4px 12px', height: '100%', display: 'flex', alignItems: 'center' }}>
                              {changes[`p_${p.id}`].media ? <img src={changes[`p_${p.id}`].media} style={{ width: '32px', height: '32px', border: '1px solid #dfe3e8', borderRadius: '4px', objectFit: 'contain', backgroundColor: '#f4f6f8' }} /> : <span style={{ color: '#8c9196' }}>—</span>}
                            </div>
                          ) : col.type === 'checkbox' ? (
                            <BulkCheckbox value={changes[`p_${p.id}`][col.key]} onChange={(v) => updateChange(`p_${p.id}`, col.key, v)} />
                          ) : col.type === 'package' ? (
                            <BulkPackage value={changes[`p_${p.id}`][col.key]} onChange={(v) => updateChange(`p_${p.id}`, col.key, v)} />
                          ) : col.type === 'unit_price' ? (
                            <BulkUnitPrice value={changes[`p_${p.id}`][col.key]} basePrice={changes[`p_${p.id}`].price} onChange={(v) => updateChange(`p_${p.id}`, col.key, v)} />
                          ) : col.type === 'weight' ? (
                            <BulkWeight weight={changes[`p_${p.id}`][col.key]} unit={changes[`p_${p.id}`].weight_unit} onChange={(w, u) => { updateChange(`p_${p.id}`, col.key, w); updateChange(`p_${p.id}`, 'weight_unit', u); }} />
                          ) : col.type === 'sales_channels' ? (
                            <BulkSalesChannels value={changes[`p_${p.id}`][col.key]} onChange={(v) => updateChange(`p_${p.id}`, col.key, v)} />
                          ) : col.key === 'tags' ? (
                            <BulkTags value={changes[`p_${p.id}`][col.key]} onChange={(v) => updateChange(`p_${p.id}`, col.key, v)} />
                          ) : col.type === 'json' ? (
                            <BulkJsonInput value={changes[`p_${p.id}`][col.key]} onChange={(v) => updateChange(`p_${p.id}`, col.key, v)} />
                          ) : (
                            <BulkInput 
                              type={col.type === 'number' ? 'number' : (col.type === 'date' ? 'date' : 'text')} 
                              align={col.type === 'number' ? 'right' : 'left'} 
                              value={changes[`p_${p.id}`][col.key]} 
                              onChange={(v) => updateChange(`p_${p.id}`, col.key, v)} 
                              prefix={col.key === 'handle' ? 'products/' : null}
                              placeholder={col.key === 'meta_title' ? p.title : (col.key === 'meta_description' ? '' : undefined)}
                            />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                  
                  {hasVariants && isExpanded && p.variants_list.map((v) => (
                    <tr key={`v_${v.id}`} style={{ borderBottom: '1px solid #dfe3e8' }}>
                      {visibleColumns.map((col, i) => {
                        const isTitle = col.key === 'title';
                        const isVariantLevel = ['price', 'sku', 'inventory', 'compare_at_price', 'barcode', 'weight', 'physical', 'package', 'cost_per_item', 'hs_code', 'origin', 'unit_price', 'charge_taxes', 'continue_selling', 'track_quantity'].includes(col.key);
                        
                        return (
                          <td key={col.key} style={{ width: col.width, minWidth: col.width, maxWidth: col.width, padding: 0, borderRight: i < visibleColumns.length - 1 ? '1px solid #dfe3e8' : 'none', verticalAlign: 'middle', height: '44px', backgroundColor: '#fafbfc', position: i === 0 ? 'sticky' : 'static', left: i === 0 ? 0 : 'auto', zIndex: i === 0 ? 2 : 'auto' }}>
                            {isTitle ? (
                               <div style={{ display: 'flex', alignItems: 'center', paddingLeft: '48px', height: '100%' }}>
                                  <div style={{ width: '16px', height: '16px', borderLeft: '1px solid #dfe3e8', borderBottom: '1px solid #dfe3e8', borderBottomLeftRadius: '4px', marginRight: '8px', marginBottom: '8px' }}></div>
                                  <div style={{ flex: 1, height: '100%' }}>
                                    <BulkInput value={changes[`v_${v.id}`].title} onChange={(val) => updateChange(`v_${v.id}`, 'title', val)} />
                                  </div>
                               </div>
                            ) : (col.key === 'testing' || col.key === 'charge_taxes' || col.key === 'continue_selling' || col.key === 'track_quantity' || col.key === 'physical') ? (
                               <BulkCheckbox value={changes[`v_${v.id}`][col.key]} onChange={(val) => updateChange(`v_${v.id}`, col.key, val)} />
                            ) : col.type === 'package' ? (
                               <BulkPackage value={changes[`v_${v.id}`][col.key]} onChange={(v) => updateChange(`v_${v.id}`, col.key, v)} />
                            ) : col.type === 'unit_price' ? (
                               <BulkUnitPrice value={changes[`v_${v.id}`][col.key]} basePrice={changes[`v_${v.id}`].price} onChange={(val) => updateChange(`v_${v.id}`, col.key, val)} />
                            ) : col.type === 'weight' ? (
                               <BulkWeight weight={changes[`v_${v.id}`][col.key]} unit={changes[`v_${v.id}`].weight_unit} onChange={(w, u) => { updateChange(`v_${v.id}`, col.key, w); updateChange(`v_${v.id}`, 'weight_unit', u); }} />
                            ) : (col.type === 'select' && isVariantLevel) ? (
                               <BulkSelect options={col.options} value={changes[`v_${v.id}`][col.key]} onChange={(val) => updateChange(`v_${v.id}`, col.key, val)} />
                            ) : isVariantLevel ? (
                               <BulkInput type={col.type === 'number' ? 'number' : (col.type === 'date' ? 'date' : 'text')} align={col.type === 'number' ? 'right' : 'left'} value={changes[`v_${v.id}`][col.key]} onChange={(val) => updateChange(`v_${v.id}`, col.key, val)} />
                            ) : (
                               <div style={{ display: 'flex', alignItems: 'center', width: '100%', height: '100%', justifyContent: 'center', padding: '0 12px' }}>
                                 <span style={{ color: '#8c9196' }}>—</span>
                               </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      
    </div>
  );
}
function ColumnsButton({ visibleColumns, onChange }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(visibleColumns);

  const openModal = () => { setDraft(new Set(visibleColumns)); setOpen(true); };

  return (
    <>
      <Button icon={Columns3Minor} onClick={openModal}>Columns</Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Manage columns" primaryAction={{
        content: "Save",
        onAction: () => { onChange(draft); setOpen(false); },
      }} secondaryActions={[{
        content: "Reset",
        onAction: () => setDraft(new Set(ALL_COLUMNS.map((c) => c.key))),
      }]}>
        <Modal.Section>
          {ALL_COLUMNS.map((col) => (
            <div key={col.key} style={s.columnRow}>
              <Checkbox
                label={col.label}
                checked={draft.has(col.key)}
                disabled={col.locked}
                onChange={(checked) => {
                  const next = new Set(draft);
                  checked ? next.add(col.key) : next.delete(col.key);
                  setDraft(next);
                }}
              />
            </div>
          ))}
        </Modal.Section>
      </Modal>
    </>
  );
}

function BulkEditPopover({ disabled, count, onSelect }) {
  return (
    <Button icon={SelectMinor} disabled={disabled} onClick={onSelect}>
      Bulk edit
    </Button>
  );
}

function PriceButton({ disabled, count }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState("percentage");
  const [value, setValue] = useState("10");
  const [round, setRound] = useState("2");

  return (
    <>
      <Button icon={CashDollarMinor} disabled={disabled} onClick={() => setOpen(true)}>Price</Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Adjust prices" primaryAction={{
        content: "Apply", onAction: () => setOpen(false),
      }} secondaryActions={[{ content: "Cancel", onAction: () => setOpen(false) }]}>
        <Modal.Section>
          <Select label="Adjustment type" value={type} onChange={setType} options={[
            { label: "Percentage", value: "percentage" },
            { label: "Fixed amount", value: "fixed" },
          ]} />
          <div style={{ marginTop: 12 }}>
            <TextField label="Value" type="number" value={value} onChange={setValue} suffix={type === "percentage" ? "%" : "USD"} autoComplete="off" />
          </div>
          <div style={{ marginTop: 12 }}>
            <Select label="Round to" value={round} onChange={setRound} options={[
              { label: "No rounding", value: "0" },
              { label: "2 decimals", value: "2" },
              { label: "Nearest .99", value: "99" },
            ]} />
          </div>
          <div style={{ marginTop: 12 }}>
            <Text as="span" color="subdued">Preview: {count} product(s) selected</Text>
          </div>
        </Modal.Section>
      </Modal>
    </>
  );
}

function ConfirmPushModal({ open, loading, onCancel, onConfirm }) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title="App → Shopify (Push Sync)"
      primaryAction={{ content: "Sync now", onAction: onConfirm, loading }}
      secondaryActions={[{ content: "Cancel", onAction: onCancel }]}
    >
      <Modal.Section>
        <Text as="p">This will push your local changes (Products, Variants, Inventory, Images, ALT text, SEO, Tags, and Collections) back to Shopify.</Text>
      </Modal.Section>
    </Modal>
  );
}

function ConfirmSyncModal({ open, loading, onCancel, onConfirm }) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title="Shopify → App (Pull Sync)"
      primaryAction={{ content: "Sync now", onAction: onConfirm, loading }}
      secondaryActions={[{ content: "Cancel", onAction: onCancel }]}
    >
      <Modal.Section>
        <Text as="p">This will pull Products, Variants, Inventory, Collections, Images, and Metafields from Shopify to the app's local database.</Text>
      </Modal.Section>
    </Modal>
  );
}

function PaginationBar({ page, pageCount, onChange }) {
  const pages = paginationWindow(page, pageCount);
  return (
    <div style={s.pagination}>
      <Button onClick={() => onChange(page - 1)} disabled={page <= 1} accessibilityLabel="Previous page">‹</Button>
      {pages.map((p, i) => p === "…" ? (
        <span key={`ellipsis-${i}`} style={s.pageEllipsis}>…</span>
      ) : (
        <button
          key={p}
          type="button"
          onClick={() => onChange(p)}
          style={{ ...s.pageButton, ...(p === page ? s.pageButtonActive : {}) }}
        >
          {p}
        </button>
      ))}
      <Button onClick={() => onChange(page + 1)} disabled={page >= pageCount} accessibilityLabel="Next page">›</Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sortProducts(products, sortValue) {
  const sorted = [...products];
  if (sortValue === "title-asc") sorted.sort((a, b) => a.title.localeCompare(b.title));
  if (sortValue === "title-desc") sorted.sort((a, b) => b.title.localeCompare(a.title));
  // price-* and created-* are left as-is: this endpoint doesn't return price
  // or created_at yet, so there's nothing to sort by for those options.
  return sorted;
}

function paginationWindow(page, pageCount) {
  if (pageCount <= 6) return Array.from({ length: pageCount }, (_, i) => i + 1);
  const pages = [1, 2, 3, 4, 5];
  if (page > 5 && page < pageCount) pages.splice(4, 1, page);
  pages.push("…", pageCount);
  return Array.from(new Set(pages));
}

async function readApiResponse(response) {
  const contentType = response.headers.get("content-type") || "";
  const body = await response.text();

  if (!contentType.includes("application/json")) {
    throw new Error(
      response.status === 401
        ? "Your Shopify session expired. Reopen the app to reconnect."
        : `The server returned an unexpected response (${response.status}). Please restart the app server and try again.`,
    );
  }

  try {
    return JSON.parse(body);
  } catch {
    throw new Error("The server returned invalid JSON. Please try again.");
  }
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const s = {
  bulkWorkspace: {
    width: "100%",
    background: "#fff",
    borderTop: "1px solid #dfe3e8",
    height: "calc(100vh - 112px)",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    isolation: "isolate",
  },
  bulkToolbar: {
    minHeight: 64,
    padding: "0 16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    borderBottom: "1px solid #dfe3e8",
    flexWrap: "wrap",
  },
  bulkToolbarLeft: { display: "flex", alignItems: "center", gap: 8 },
  bulkToolbarRight: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" },
  bulkEditorGrid: { display: "grid", gridTemplateColumns: "360px minmax(0, 1fr)", alignItems: "start", flex: 1, minHeight: 0, overflow: "hidden" },
  bulkTableScroll: { overflow: "auto", minWidth: 0, minHeight: 0 },
  bulkProductTable: { width: "360px", height: "max-content", borderCollapse: "collapse", tableLayout: "fixed" },
  bulkTable: { width: "100%", minWidth: 900, height: "max-content", borderCollapse: "collapse", tableLayout: "fixed" },
  bulkStickyHeader: {
    position: "sticky",
    left: 0,
    zIndex: 5,
    width: 360,
    minWidth: 360,
    maxWidth: 360,
    background: "#fafbfb",
    boxShadow: "1px 0 0 #dfe3e8",
  },
  bulkStickyCell: {
    position: "sticky",
    left: 0,
    zIndex: 4,
    width: 360,
    minWidth: 360,
    maxWidth: 360,
    background: "#fff",
    boxShadow: "1px 0 0 #f1f2f4",
    overflow: "hidden",
    boxSizing: "border-box",
  },
  bulkProductCell: { display: "flex", alignItems: "center", gap: 10 },
  bulkThumbnail: {
    width: 36,
    height: 36,
    objectFit: "cover",
    borderRadius: 4,
    border: "1px solid #dfe3e8",
    flexShrink: 0,
  },
  bulkThumbnailPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 4,
    border: "1px solid #dfe3e8",
    background: "#f6f6f7",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 16,
  },
  searchRow: { maxWidth: 420, marginBottom: 12 },
  toolbar: { display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 },
  card: {
    background: "var(--p-surface, #fff)",
    border: "1px solid #e1e3e5",
    borderRadius: 8,
    overflow: "hidden",
  },
  emptyState: { padding: "32px 20px", textAlign: "center" },
  footer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 16px",
    borderTop: "1px solid #e1e3e5",
    flexWrap: "wrap",
    gap: 12,
  },
  pagination: { display: "flex", alignItems: "center", gap: 4 },
  pageButton: {
    minWidth: 32,
    height: 32,
    padding: "0 6px",
    border: "1px solid #e1e3e5",
    borderRadius: 6,
    background: "#fff",
    cursor: "pointer",
    fontSize: 13,
  },
  pageButtonActive: {
    background: "#2c6ecb",
    borderColor: "#2c6ecb",
    color: "#fff",
    fontWeight: 600,
  },
  pageEllipsis: { padding: "0 4px", color: "#6d7175" },
  imagePlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 6,
    background: "#f1f2f4",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  linkReset: { background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left" },
  popoverPanel: { padding: 16, width: 260 },
  popoverFooter: { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16 },
  columnRow: { padding: "6px 0" },
  bulkHeader: {
    padding: "10px 12px",
    textAlign: "left",
    background: "#fafbfb",
    borderBottom: "1px solid #dfe3e8",
    whiteSpace: "nowrap",
    fontSize: 13,
    fontWeight: 500,
    color: "#42474c",
  },
  bulkCell: {
    padding: "5px 8px",
    minWidth: 180,
    verticalAlign: "top",
    borderBottom: "1px solid #f1f2f4",
    height: 48,
  },
  previewCard: { width: 300, padding: 16 },
  previewHeader: { display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 12 },
  previewImage: {
    width: 48,
    height: 48,
    borderRadius: 6,
    background: "#f1f2f4",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  previewRows: { borderTop: "1px solid #f1f2f4", paddingTop: 8 },
  previewRow: { display: "flex", justifyContent: "space-between", padding: "6px 0" },
  previewActions: { display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 },
};
