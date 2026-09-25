import { ErrorBoundary } from "../components/ErrorBoundary";
import { useNavigate } from "react-router-dom";
import React, { useState, useEffect } from 'react';
import {
  Page,
  Card,
  Stack,
  Text,
  Button,
  ButtonGroup,
  IndexTable,
  useIndexResourceState,
  Badge,
  Icon,
  Popover,
  ActionList,
  Toast,
  Spinner,
  Select,
  Modal,
  Filters,
  FormLayout,
  TextField
} from '@shopify/polaris';
import { ExternalMinor, ViewMinor, SearchMinor, FilterMinor, ArrowLeftMinor, SortMinor, ImageMajor } from '@shopify/polaris-icons';
import { TitleBar } from '@shopify/app-bridge-react';
import { useGlobalNotification } from "../components";
import { PaginationBar } from "../components";
import { useAuthenticatedFetch } from "../hooks/useAuthenticatedFetch";

const SORT_OPTIONS = [
  { value: "title-asc", label: "Product title (A-Z)" },
  { value: "title-desc", label: "Product title (Z-A)" },
  { value: "price-asc", label: "Price (low to high)" },
  { value: "price-desc", label: "Price (high to low)" },
  { value: "created-desc", label: "Created (newest)" },
  { value: "created-asc", label: "Created (oldest)" },
];

function SeoManagerContent() {
  const { unreadCount } = useGlobalNotification();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [products, setProducts] = useState([]);
  const [sortValue, setSortValue] = useState("title-asc");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [vendorFilter, setVendorFilter] = useState("");
  const [inventoryFilter, setInventoryFilter] = useState("");
  const [imagesFilter, setImagesFilter] = useState("");
  const [seoFilter, setSeoFilter] = useState("");
  const [tagsFilter, setTagsFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");


  const vendorOptions = React.useMemo(() => {
    const vendors = Array.from(new Set(products.map((p) => p.vendor).filter(Boolean))).sort();
    return vendors.map((v) => ({ label: v, value: v }));
  }, [products]);

  const filteredProducts = React.useMemo(() => {
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
        const updatedDate = new Date(p.updated_at.replace(' ', 'T') + 'Z');
        const now = new Date();
        const diffDays = (now - updatedDate) / (1000 * 60 * 60 * 24);
        if (dateFilter === "last-7-days" && diffDays > 7) return false;
        if (dateFilter === "last-30-days" && diffDays > 30) return false;
      }

      return true;
    });
  }, [products, statusFilter, vendorFilter, inventoryFilter, imagesFilter, seoFilter, tagsFilter, dateFilter]);
  const authenticatedFetch = useAuthenticatedFetch();

  const [kpiData, setKpiData] = useState({
    goodCount: 0,
    goodPercent: 0,
    issuesCount: 0,
    issuesPercent: 0,
    criticalCount: 0,
    criticalPercent: 0,
    noMetaDescCount: 0,
    noMetaDescPercent: 0,
    healthScore: 0,
  });

  const loadProducts = async () => {
    setIsLoading(true);
    setError("");
    try {
      const response = await authenticatedFetch(`/api/products?search=${encodeURIComponent(query)}`);
      if (!response.ok) throw new Error("Unable to load data.");
      const payload = await response.json();
      
      let good = 0;
      let issues = 0;
      let critical = 0;
      let noMetaDesc = 0;

      const mappedProducts = payload.data.map((product) => {
        const fullProduct = { ...product, status: { label: product.status, status: product.status === "active" ? "success" : "attention" }, inventory: String(product.inventory) };
        const titleLength = product.meta_title ? product.meta_title.length : 0;
        const descLength = product.meta_description ? product.meta_description.length : 0;
        
        let seoManagerStatus = 'Good';
        let issueCount = 0;
        let isCritical = false;

        if (titleLength === 0 || descLength === 0) {
          seoManagerStatus = 'Critical';
          isCritical = true;
          issueCount += (titleLength === 0 ? 1 : 0) + (descLength === 0 ? 1 : 0);
          critical++;
        } else if (titleLength > 60 || descLength > 160 || titleLength < 30 || descLength < 50) {
          seoManagerStatus = 'Issues';
          issueCount += (titleLength > 60 || titleLength < 30 ? 1 : 0) + (descLength > 160 || descLength < 50 ? 1 : 0);
          issues++;
        } else {
          good++;
        }

        if (descLength === 0) noMetaDesc++;

        return {
          ...fullProduct,
          id: product.id.toString(),
          title: product.title,
          sku: product.sku || product.id,
          seoTitle: product.meta_title || product.title,
          titleLength: product.meta_title ? product.meta_title.length : product.title.length,
          metaDescription: product.meta_description || 'No description provided.',
          descLength: product.meta_description ? product.meta_description.length : 0,
          handle: product.handle,
          seoManagerStatus: seoManagerStatus,
          issueCount,
          image_url: product.image_url
        };
      });

      const total = mappedProducts.length || 1; // avoid division by zero
      const healthScore = Math.round((good / total) * 100);

      setKpiData({
        goodCount: good,
        goodPercent: Math.round((good / total) * 100),
        issuesCount: issues,
        issuesPercent: Math.round((issues / total) * 100),
        criticalCount: critical,
        criticalPercent: Math.round((critical / total) * 100),
        noMetaDescCount: noMetaDesc,
        noMetaDescPercent: Math.round((noMetaDesc / total) * 100),
        healthScore
      });

      setProducts(mappedProducts);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, [query]);

  const sortedProducts = React.useMemo(() => {
    const sorted = [...filteredProducts];
    if (sortValue === "title-asc") sorted.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
    if (sortValue === "title-desc") sorted.sort((a, b) => (b.title || "").localeCompare(a.title || ""));
    return sorted;
  }, [products, sortValue]);

  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;
  const pageCount = Math.max(1, Math.ceil(sortedProducts.length / PAGE_SIZE));
  const paginatedProducts = sortedProducts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [imagePopup, setImagePopup] = useState(null);
  const [viewingProduct, setViewingProduct] = useState(null);

  const [isBulkEditing, setIsBulkEditing] = useState(false);
  const [bulkEditData, setBulkEditData] = useState({});
  const [isSavingBulk, setIsSavingBulk] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSyncToShopify = async () => {
    if (selectedResources.length === 0) {
      setError("Please select at least one product to sync.");
      return;
    }
    
    setIsSyncing(true);
    try {
      let offset = 0;
      let jobId = null;
      let more = true;
      let totalPushed = 0;
      while (more) {
        const response = await authenticatedFetch("/api/sync/push", {
          method: "POST",
          body: JSON.stringify({ 
            offset, jobId,
            syncMode: 'seo',
            selectedProductIds: selectedResources 
          }),
          headers: { "Content-Type": "application/json" }
        });
        const payload = await response.json();
        if (payload.jobId) jobId = payload.jobId;
        if (!response.ok) throw new Error(payload.message || "Push sync failed.");
        
        offset += (payload.pushed_this_batch || 0);
        totalPushed += (payload.pushed_this_batch || 0);
        more = payload.more_remaining;
      }
      
      // Show success visually
      await loadProducts();
      clearSelection();
    } catch (pushError) {
      setError(pushError.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleStartBulkEdit = () => {
    if (selectedResources.length === 0) {
      setError("Please select at least one product to edit.");
      setBulkEditPopoverActive(false);
      return;
    }
    const initialData = {};
    selectedResources.forEach(id => {
      const product = products.find(p => String(p.id) === String(id));
      if (product) {
        initialData[id] = {
          meta_title: product.seoTitle || '',
          meta_description: product.metaDescription || '',
          handle: product.handle || '',
          sku: product.sku || '',
          title: product.title || ''
        };
      }
    });
    setBulkEditData(initialData);
    setIsBulkEditing(true);
    setBulkEditPopoverActive(false);
  };

  const handleSaveBulkEdit = async () => {
    setIsSavingBulk(true);
    setError("");
    try {
      const promises = Object.keys(bulkEditData).map(id => {
        return authenticatedFetch(`/api/products/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bulkEditData[id]),
        });
      });
      await Promise.all(promises);
      
      setProducts(products.map(p => {
        if (bulkEditData[p.id]) {
          return {
            ...p,
            seoTitle: bulkEditData[p.id].meta_title,
            metaDescription: bulkEditData[p.id].meta_description,
            handle: bulkEditData[p.id].handle,
            sku: bulkEditData[p.id].sku
          };
        }
        return p;
      }));
      setIsBulkEditing(false);
      setSelectedResources([]);
    } catch (err) {
      setError("Failed to save some products. Please try again.");
    } finally {
      setIsSavingBulk(false);
    }
  };

  const handleStartEdit = (product) => {
    setEditingId(product.id);
    setEditData({ 
      meta_title: product.seoTitle, 
      meta_description: product.metaDescription, 
      handle: product.handle,
      sku: product.sku
    });
  };

  const handleSaveEdit = async () => {
    setIsSavingEdit(true);
    try {
      const response = await authenticatedFetch(`/api/products/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editData),
      });
      if (!response.ok) throw new Error("Failed to save SEO data");
      
      setProducts(products.map(p => {
        if (p.id === editingId) {
          return {
            ...p, 
            seoTitle: editData.meta_title, 
            metaDescription: editData.meta_description, 
            handle: editData.handle,
            sku: editData.sku
          };
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

  const activeFilterCount = (statusFilter !== "" ? 1 : 0) + 
                            (vendorFilter !== "" ? 1 : 0) +
                            (inventoryFilter !== "" ? 1 : 0) +
                            (imagesFilter !== "" ? 1 : 0) +
                            (seoFilter !== "" ? 1 : 0) +
                            (tagsFilter ? 1 : 0) +
                            (dateFilter !== "" ? 1 : 0);

  const [bulkEditPopoverActive, setBulkEditPopoverActive] = useState(false);
  const toggleBulkEditPopover = () => setBulkEditPopoverActive((active) => !active);

  const resourceName = { singular: 'product', plural: 'products' };
  const { selectedResources, allResourcesSelected, handleSelectionChange, clearSelection } = useIndexResourceState(paginatedProducts);

  const rowMarkup = paginatedProducts.map(
    (product, index) => {
      const { id, title, sku, image_url, seoTitle, titleLength, metaDescription, descLength, handle, seoManagerStatus: status, issueCount } = product;
      
      let badgeMarkup;
      if (status === 'Good') {
        badgeMarkup = <Badge status="success">Good</Badge>;
      } else if (status === 'Critical') {
        badgeMarkup = <Badge status="critical">{issueCount} Critical</Badge>;
      } else {
        badgeMarkup = <Badge status="warning">{issueCount} {issueCount === 1 ? 'Issue' : 'Issues'}</Badge>;
      }

      const isEditing = editingId === id;
      
      const activeTitleLength = isEditing && editData ? (editData.meta_title || '').length : titleLength;
      const activeDescLength = isEditing && editData ? (editData.meta_description || '').length : descLength;

      const titleColor = (activeTitleLength > 60 || activeTitleLength === 0) ? '#d82c0d' : '#008000';
      const descColor = (activeDescLength > 160 || activeDescLength === 0) ? '#d82c0d' : '#008000';

      return (
        <IndexTable.Row id={id} key={id} selected={selectedResources.includes(id)} position={index} onClick={isEditing ? undefined : () => handleStartEdit({id, seoTitle, metaDescription, handle, sku})}>
          <IndexTable.Cell>
            <Stack wrap={false} alignment="center" spacing="tight">
              {image_url ? (
                <div onClick={(e) => { e.stopPropagation(); setImagePopup({ image_url, title }); }} style={{ cursor: 'pointer' }}>
                  <img src={image_url} alt={title} style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px' }} />
                </div>
              ) : (
                <div style={{ width: '40px', height: '40px', background: '#f4f6f8', border: '1px solid #dfe3e8', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon source={ImageMajor} color="subdued" />
                </div>
              )}
              <div onClick={(e) => { e.stopPropagation(); setViewingProduct(product); }} style={{ cursor: 'pointer' }}>
                <Text variant="bodyMd" fontWeight="bold"><span style={{ textDecoration: 'underline' }}>{title}</span></Text>
                <Text variant="bodySm" color="subdued">SKU: {sku}</Text>
              </div>
            </Stack>
          </IndexTable.Cell>
          
          <IndexTable.Cell>
            <div style={{ minWidth: '200px', maxWidth: '300px', whiteSpace: 'normal', wordWrap: 'break-word' }} onClick={(e) => e.stopPropagation()}>
              {isEditing ? (
                <TextField value={editData.meta_title} onChange={(v) => setEditData({...editData, meta_title: v})} autoComplete="off" />
              ) : (
                <Text variant="bodyMd">{seoTitle}</Text>
              )}
            </div>
          </IndexTable.Cell>

          <IndexTable.Cell>
            <div style={{ minWidth: '250px', maxWidth: '400px', whiteSpace: 'normal', wordWrap: 'break-word' }} onClick={(e) => e.stopPropagation()}>
              {isEditing ? (
                <TextField multiline={3} value={editData.meta_description} onChange={(v) => setEditData({...editData, meta_description: v})} autoComplete="off" />
              ) : (
                <Text variant="bodyMd">{metaDescription.length > 80 ? metaDescription.substring(0, 80) + '...' : metaDescription}</Text>
              )}
            </div>
          </IndexTable.Cell>

          <IndexTable.Cell>
            {isEditing ? (
              <div onClick={(e) => e.stopPropagation()}>
                <TextField value={editData.handle} onChange={(v) => setEditData({...editData, handle: v})} autoComplete="off" />
              </div>
            ) : (
              <Stack wrap={false} alignment="center" spacing="tight">
                <Text variant="bodyMd" color="subdued">/products/{handle}</Text>
                <div style={{ color: '#5c5f62', width: '16px' }}><Icon source={ExternalMinor} color="subdued" /></div>
              </Stack>
            )}
          </IndexTable.Cell>

          

          <IndexTable.Cell>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', whiteSpace: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
              {isEditing ? (
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <Button size="slim" onClick={() => setEditingId(null)}>Cancel</Button>
                  <Button size="slim" primary onClick={handleSaveEdit} loading={isSavingEdit}>Save</Button>
                </div>
              ) : (
                <Button size="slim" onClick={() => handleStartEdit({id, seoTitle, metaDescription, handle})}>Edit</Button>
              )}
            </div>
          </IndexTable.Cell>
        </IndexTable.Row>
      );
    }
  );

  if (isBulkEditing) {
    return (
      <Page fullWidth title="SEO Bulk Editor" backAction={{ content: "SEO Manager", onAction: () => setIsBulkEditing(false) }}>
        <div style={{ padding: '20px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              
              <div>
                
                <Text variant="bodySm" color="subdued">{Object.keys(bulkEditData).length} selected products</Text>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <Button onClick={() => setIsBulkEditing(false)}>Discard</Button>
              <Button primary onClick={handleSaveBulkEdit} loading={isSavingBulk}>Save all</Button>
            </div>
          </div>

          <div style={{ backgroundColor: '#f4f6f8', padding: '12px 16px', borderRadius: '4px', border: '1px solid #dfe3e8', marginBottom: '24px' }}>
            <Text variant="bodyMd" color="subdued">Edit SEO fields for multiple products. Changes are saved only to the selected products.</Text>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {Object.keys(bulkEditData).map((id) => (
              <Card key={id}>
                <div style={{ display: 'flex', padding: '20px', gap: '20px', alignItems: 'flex-start' }}>
                  <div style={{ flex: '0 0 150px', paddingTop: '32px' }}>
                    <Text variant="bodyMd" fontWeight="bold">{bulkEditData[id].title}</Text>
                  </div>
                  <div style={{ flex: '1', minWidth: '150px' }}>
                    <TextField
                      label="Meta title"
                      value={bulkEditData[id].meta_title}
                      onChange={(value) => setBulkEditData({ ...bulkEditData, [id]: { ...bulkEditData[id], meta_title: value } })}
                      autoComplete="off"
                      maxLength={60}
                      showCharacterCount
                    />
                  </div>
                  <div style={{ flex: '1.5', minWidth: '200px' }}>
                    <TextField
                      label="Meta description"
                      value={bulkEditData[id].meta_description}
                      onChange={(value) => setBulkEditData({ ...bulkEditData, [id]: { ...bulkEditData[id], meta_description: value } })}
                      autoComplete="off"
                      multiline={3}
                      maxLength={160}
                      showCharacterCount
                    />
                  </div>
                  <div style={{ flex: '1', minWidth: '150px' }}>
                    <TextField
                      label="URL handle"
                      value={bulkEditData[id].handle}
                      onChange={(value) => setBulkEditData({ ...bulkEditData, [id]: { ...bulkEditData[id], handle: value } })}
                      autoComplete="off"
                    />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      
      {viewingProduct && (
        <Modal
          open={!!viewingProduct}
          onClose={() => setViewingProduct(null)}
          title="Product details"
          primaryAction={{
            content: 'Close',
            onAction: () => setViewingProduct(null),
          }}
          large
        >
          <Modal.Section>
            <div style={{ display: 'flex', gap: '24px', marginBottom: '32px' }}>
              <div style={{ flexShrink: 0, width: '120px', height: '120px', border: '1px solid #dfe3e8', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', background: '#f4f6f8' }}>
                {viewingProduct.image_url ? (
                  <img src={viewingProduct.image_url} alt={viewingProduct.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <Icon source={ImageMajor} color="subdued" />
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  <Text variant="headingLg" as="h2" fontWeight="bold">{viewingProduct.title}</Text>
                  <Badge status={viewingProduct.status === 'active' ? 'success' : 'info'}>
                    {viewingProduct.status ? viewingProduct.status.toUpperCase() : 'DRAFT'}
                  </Badge>
                </div>
                <div style={{ marginBottom: '24px' }}>
                  <Text variant="bodyMd" color="subdued">/{viewingProduct.handle}</Text>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                  <div>
                    <Text variant="bodySm" color="subdued">Price</Text>
                    <div style={{ marginTop: '4px' }}>
                      <Text variant="bodyMd" fontWeight="bold">${viewingProduct.price || '0.00'}</Text>
                    </div>
                  </div>
                  <div>
                    <Text variant="bodySm" color="subdued">Inventory</Text>
                    <div style={{ marginTop: '4px' }}>
                      <Text variant="bodyMd" fontWeight="bold">{viewingProduct.inventory || 0}</Text>
                    </div>
                  </div>
                  <div>
                    <Text variant="bodySm" color="subdued">Vendor</Text>
                    <div style={{ marginTop: '4px' }}>
                      <Text variant="bodyMd" fontWeight="bold">{viewingProduct.vendor || '—'}</Text>
                    </div>
                  </div>
                  <div>
                    <Text variant="bodySm" color="subdued">Product type</Text>
                    <div style={{ marginTop: '4px' }}>
                      <Text variant="bodyMd" fontWeight="bold">{viewingProduct.product_type || '—'}</Text>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ marginBottom: '32px' }}>
              <Text variant="headingMd" as="h3" fontWeight="bold">SEO details</Text>
              <div style={{ marginTop: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                <div>
                  <Text variant="bodyMd" fontWeight="bold">Meta title</Text>
                  <div style={{ marginTop: '8px' }}>
                    <Text variant="bodyMd" color="subdued">{viewingProduct.meta_title || '—'}</Text>
                  </div>
                </div>
                <div>
                  <Text variant="bodyMd" fontWeight="bold">Meta description</Text>
                  <div style={{ marginTop: '8px' }}>
                    <Text variant="bodyMd" color="subdued">{viewingProduct.meta_description || '—'}</Text>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <Text variant="headingMd" as="h3" fontWeight="bold">Variants ({viewingProduct.variants_list ? viewingProduct.variants_list.length : 0})</Text>
              <div style={{ marginTop: '16px', border: '1px solid #dfe3e8', borderRadius: '8px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                  <thead>
                    <tr style={{ background: '#f4f6f8' }}>
                      <th style={{ padding: '12px 16px', fontWeight: 'bold' }}>Variant</th>
                      <th style={{ padding: '12px 16px', fontWeight: 'bold' }}>SKU</th>
                      <th style={{ padding: '12px 16px', fontWeight: 'bold' }}>Price</th>
                      <th style={{ padding: '12px 16px', fontWeight: 'bold' }}>Inventory</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(viewingProduct.variants_list || []).map((v, idx) => (
                      <tr key={v.id || idx} style={{ borderTop: '1px solid #dfe3e8' }}>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ flexShrink: 0, width: '32px', height: '32px', background: '#f4f6f8', border: '1px solid #dfe3e8', borderRadius: '4px', overflow: 'hidden' }}>
                              {viewingProduct.image_url ? <img src={viewingProduct.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center'}}><Icon source={ImageMajor} color="subdued" /></div>}
                            </div>
                            <Text variant="bodyMd">{v.title || 'Default Title'}</Text>
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <Text variant="bodyMd" color="subdued">{v.sku || '—'}</Text>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <Text variant="bodyMd">${v.price || '0.00'}</Text>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <Text variant="bodyMd">{v.inventory || 0}</Text>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </Modal.Section>
        </Modal>
      )}

    </Page>
    );
  }

  return (
    <Page fullWidth title="SEO Bulk Editor" backAction={{ content: "SEO Manager", onAction: () => setIsBulkEditing(false) }}>
      <TitleBar 
        title="SEO Manager" 
        secondaryActions={[{ content: unreadCount > 0 ? `🔔 ${unreadCount}` : "🔔", onAction: () => navigate("/notifications") }]} 
      />
      
      <div style={{ marginTop: '16px', marginBottom: '8px' }}>
        <Stack distribution="equalSpacing" alignment="center">
          <div>
            <Text as="p" color="subdued" variant="bodyMd">Manage and optimize product SEO to improve search engine rankings.</Text>
          </div>
          <ButtonGroup>
            <Button loading={isSyncing} onClick={() => {
              if (selectedResources.length === 0) {
                setError("Please select at least one product to sync.");
              } else {
                handleSyncToShopify();
              }
            }}>Sync to Shopify</Button>
          </ButtonGroup>
        </Stack>
      </div>


      <div style={{ marginTop: '24px' }}>
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '20px' }}>
            <div style={{ flex: 1, textAlign: 'center', borderRight: '1px solid #dfe3e8' }}>
              <Text variant="bodySm" color="subdued">Good</Text>
              <Text variant="headingXl">{isLoading ? '-' : kpiData.goodCount}</Text>
            </div>
            <div style={{ flex: 1, textAlign: 'center', borderRight: '1px solid #dfe3e8' }}>
              <Text variant="bodySm" color="subdued">Issues</Text>
              <Text variant="headingXl">{isLoading ? '-' : kpiData.issuesCount}</Text>
            </div>
            <div style={{ flex: 1, textAlign: 'center', borderRight: '1px solid #dfe3e8' }}>
              <Text variant="bodySm" color="subdued">Critical Issues</Text>
              <Text variant="headingXl">{isLoading ? '-' : kpiData.criticalCount}</Text>
            </div>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <Text variant="bodySm" color="subdued">No Meta Description</Text>
              <Text variant="headingXl">{isLoading ? '-' : kpiData.noMetaDescCount}</Text>
            </div>
          </div>
        </Card>
      </div>

      <div style={{ marginTop: '24px' }}>
        <Card>

          <div style={{ padding: '16px', borderBottom: '1px solid #dfe3e8' }}>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '200px' }}>
                <TextField
                  value={query}
                  onChange={setQuery}
                  placeholder="Search products by title, SKU, barcode..."
                  autoComplete="off"
                  clearButton
                  onClearButtonClick={() => setQuery('')}
                  prefix={<Icon source={SearchMinor} />}
                />
              </div>
              <FilterPopover 
                statusFilter={statusFilter} setStatusFilter={setStatusFilter}
                vendorFilter={vendorFilter} setVendorFilter={setVendorFilter}
                inventoryFilter={inventoryFilter} setInventoryFilter={setInventoryFilter}
                imagesFilter={imagesFilter} setImagesFilter={setImagesFilter}
                seoFilter={seoFilter} setSeoFilter={setSeoFilter}
                tagsFilter={tagsFilter} setTagsFilter={setTagsFilter}
                dateFilter={dateFilter} setDateFilter={setDateFilter}
                vendorOptions={vendorOptions}
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
              <Button disabled={selectedResources.length === 0} onClick={handleStartBulkEdit}>Bulk edit SEO</Button>
            </div>
          </div>

          {isLoading ? (
            <div style={{ padding: '40px', textAlign: 'center' }}>
              <Spinner accessibilityLabel="Loading products" size="large" />
            </div>
          ) : (
            <>
              <IndexTable
                resourceName={resourceName}
                itemCount={sortedProducts.length}
                selectedItemsCount={allResourcesSelected ? 'All' : selectedResources.length}
                onSelectionChange={handleSelectionChange}

                headings={[
                  { title: 'Product' },
                  { title: 'Meta Title' },
                  { title: 'Meta Description' },
                  { title: 'URL Handle' },
                  { title: 'Actions' },
                ]}
              >
                {rowMarkup}
              </IndexTable>
              <div style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #dfe3e8' }}>
                <Text as="span" color="subdued">
                  Showing {sortedProducts.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1} to{" "}
                  {Math.min(page * PAGE_SIZE, sortedProducts.length)} of {sortedProducts.length} products
                </Text>
                <PaginationBar page={page} pageCount={pageCount} onChange={setPage} />
              </div>
            </>
          )}

        </Card>
      </div>
      {error && <Toast content={error} error onDismiss={() => setError("")} />}
      {imagePopup && (
        <Modal
          open={!!imagePopup}
          onClose={() => setImagePopup(null)}
          title="Image Preview"
        >
          <Modal.Section>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <img src={imagePopup} alt="Product Preview" style={{ maxWidth: '100%', maxHeight: '600px', objectFit: 'contain' }} />
            </div>
          </Modal.Section>
        </Modal>
      )}
    </Page>
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


export default function SeoManager() {
  const navigate = useNavigate();
  return (
    <ErrorBoundary>
      <SeoManagerContent />
    </ErrorBoundary>
  );
}
