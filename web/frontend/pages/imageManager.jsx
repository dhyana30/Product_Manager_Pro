import { ErrorBoundary } from "../components/ErrorBoundary";
import { useNavigate } from "react-router-dom";
import React, { useState } from 'react';
import {
  Page,
  Card,
  Stack,
  Text,
  Button,
  ButtonGroup,
  IndexTable,
  useIndexResourceState,
  Select,
  TextField,
  Badge,
  ActionList,
  Icon,
  Spinner,
  Toast,
  Popover,
  Modal,
  Filters
} from '@shopify/polaris';
import { ViewMinor, SearchMinor, FilterMinor, SortMinor, DeleteMinor, EditMinor, ArrowLeftMinor, ImageMajor } from '@shopify/polaris-icons';
import { TitleBar } from '@shopify/app-bridge-react';
import { useGlobalNotification } from "../components";
import { PaginationBar, FileSelectorModal } from "../components";
import { useAuthenticatedFetch } from "../hooks/useAuthenticatedFetch";

const SORT_OPTIONS = [
  { value: "title-asc", label: "Product title (A-Z)" },
  { value: "title-desc", label: "Product title (Z-A)" },
  { value: "price-asc", label: "Price (low to high)" },
  { value: "price-desc", label: "Price (high to low)" },
  { value: "created-desc", label: "Created (newest)" },
  { value: "created-asc", label: "Created (oldest)" },
];

function ImageManagerContent() {
  const { showToast, unreadCount } = useGlobalNotification();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [products, setProducts] = useState([]);
  const [sortValue, setSortValue] = useState("title-asc");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const authenticatedFetch = useAuthenticatedFetch();

  const loadProducts = async () => {
    setIsLoading(true);
    setError("");
    try {
      const response = await authenticatedFetch(`/api/products?search=${encodeURIComponent(query)}`);
      if (!response.ok) throw new Error("Unable to load data.");
      const payload = await response.json();
      
      const mappedProducts = payload.data.map((product) => {
        const fullProduct = { ...product, status: { label: product.status, status: product.status === "active" ? "success" : "attention" }, inventory: String(product.inventory) };
        const hasImage = !!product.image_url;
        const imgCount = hasImage ? 1 : 0;
        
        return {
          ...fullProduct,
          id: product.id.toString(),
          title: product.title,
          sku: product.sku || product.id,
          imageCount: imgCount,
          altCompleteCount: imgCount,
          altCompletePercent: hasImage ? '100%' : '0%',
          missingImages: hasImage ? 0 : 1,
          duplicates: '-',
          image_url: product.image_url,
          image_name: product.image_name || '',
          image_alt: product.image_alt || '',
          imageManagerStatus: hasImage ? 'Good' : 'No images',
          lastUpdated: 'Recently synced'
        };
      });
      setProducts(mappedProducts);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    const handler = setTimeout(() => { loadProducts(); }, 400);
    return () => clearTimeout(handler);
  }, [query]);

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
  const activeFilterCount = (statusFilter !== "" ? 1 : 0) + 
                            (vendorFilter !== "" ? 1 : 0) +
                            (inventoryFilter !== "" ? 1 : 0) +
                            (imagesFilter !== "" ? 1 : 0) +
                            (seoFilter !== "" ? 1 : 0) +
                            (tagsFilter ? 1 : 0) +
                            (dateFilter !== "" ? 1 : 0);

  const [bulkEditPopoverActive, setBulkEditPopoverActive] = useState(false);
  const toggleBulkEditPopover = () => setBulkEditPopoverActive((active) => !active);

  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [imagePopup, setImagePopup] = useState(null);
  const [viewingProduct, setViewingProduct] = useState(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState(false);
  const [editPopoverActive, setEditPopoverActive] = useState(false);
  const [isFileSelectorOpen, setIsFileSelectorOpen] = useState(false);
  const [isBulkEditing, setIsBulkEditing] = useState(false);
  const [bulkEditData, setBulkEditData] = useState({});
  const [isSavingBulk, setIsSavingBulk] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isDeletingImage, setIsDeletingImage] = useState(false);
  const [isUploadPageOpen, setIsUploadPageOpen] = useState(false);
  const [uploadProductId, setUploadProductId] = useState('');
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadPreview, setUploadPreview] = useState('');
  const [selectedExistingImage, setSelectedExistingImage] = useState(null);
  const [isUploadFileSelectorOpen, setIsUploadFileSelectorOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSync = async () => {
    // Show notification immediately
    showToast('Image sync started');
    
    // Background the actual sync logic
    (async () => {
      try {
        await authenticatedFetch('/api/notifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ category: 'Images', title: 'Image sync started', message: 'Image sync started' })
        });
  
        let offset = 0;
        let totalPushed = 0;
        let more = true;
        while (more) {
          const response = await authenticatedFetch('/api/sync/push', {
            method: 'POST',
            body: JSON.stringify({ offset, sync_files: true }),
            headers: { 'Content-Type': 'application/json' }
          });
          const payload = await response.json();
          if (!response.ok) throw new Error(payload.message || 'Sync failed');
          
          offset += payload.pushed_this_batch;
          totalPushed += payload.pushed_this_batch;
          more = payload.more_remaining;
        }
        
        await authenticatedFetch('/api/notifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ category: 'Images', title: 'Image sync completed', message: `Image sync completed: ${totalPushed} images synced` })
        });
        showToast(`Image sync completed: ${totalPushed} images synced`);
  
        loadProducts();
      } catch (err) {
        await authenticatedFetch('/api/notifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ category: 'Images', title: 'Image sync failed', message: 'Image sync failed' })
        });
        showToast('Image sync failed', true);
      }
    })();
  };
  const [popupUploadFile, setPopupUploadFile] = useState(null);
  const [isSavingPopupImage, setIsSavingPopupImage] = useState(false);
  const handleStartEdit = (product) => {
    setEditingId(product.id);
    setEditData({ title: product.title, sku: product.sku });
  };

  const handleSaveEdit = async () => {
    setIsSavingEdit(true);
    try {
      const response = await authenticatedFetch(`/api/products/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editData),
      });
      if (!response.ok) throw new Error("Failed to save image metadata");
      
      setProducts(products.map(p => {
        if (p.id === editingId) {
          return { ...p, title: editData.title, sku: editData.sku };
        }
        return p;
      }));
      setEditingId(null);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingEdit(false);
    }
  };

  
  const handleSavePopupImage = async () => {
    if (!imagePopup) return;
    setIsSavingPopupImage(true);
    try {
      let response;
      if (popupUploadFile) {
        const formData = new FormData();
        formData.append('image', popupUploadFile);
        response = await authenticatedFetch(`/api/products/${imagePopup.id}/image`, {
          method: 'POST',
          body: formData,
        });
      } else {
        response = await authenticatedFetch(`/api/products/${imagePopup.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image_url: imagePopup.image_url }),
        });
      }
      
      if (!response.ok) throw new Error('Failed to save image');
      const payload = await response.json();
      const finalImageUrl = popupUploadFile ? payload.image_url : imagePopup.image_url;
      
      setProducts((current) => current.map((p) => (
        p.id === imagePopup.id ? { ...p, image_url: finalImageUrl, imageCount: 1, missingImages: 0, imageManagerStatus: 'Good' } : p
      )));
      
      if (viewingProduct && viewingProduct.id === imagePopup.id) {
        setViewingProduct({ ...viewingProduct, image_url: finalImageUrl });
      }
      
      setImagePopup(null);
      setPopupUploadFile(null);
    } catch (err) {
      console.error(err);
      setError('Failed to save image');
    } finally {
      setIsSavingPopupImage(false);
    }
  };

  const handleStartBulkEdit = () => {
    if (selectedResources.length === 0) {
      setError('Please select at least one product to edit.');
      return;
    }

    const initialData = {};
    selectedResources.forEach((id) => {
      const product = products.find((item) => item.id === String(id));
      if (product) {
        initialData[product.id] = {
          image_name: product.image_name || '',
          image_alt: product.image_alt || '',
        };
      }
    });
    setBulkEditData(initialData);
    setIsBulkEditing(true);
  };

  const handleSaveBulkEdit = async () => {
    setIsSavingBulk(true);
    try {
      await Promise.all(Object.entries(bulkEditData).map(async ([id, data]) => {
        const response = await authenticatedFetch(`/api/products/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Failed to save image metadata');
      }));

      setProducts((currentProducts) => currentProducts.map((product) => (
        bulkEditData[product.id]
          ? { ...product, ...bulkEditData[product.id] }
          : product
      )));
      setIsBulkEditing(false);
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setIsSavingBulk(false);
    }
  };

  const handleUploadFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadFile(file);
    setSelectedExistingImage(null);
    setUploadPreview(URL.createObjectURL(file));
  };

  const handleUploadImage = async () => {
    if (!uploadProductId || (!uploadFile && !selectedExistingImage)) {
      setError('Select a product and an image before uploading.');
      return;
    }

    setIsUploadingImage(true);
    try {
      let response;
      if (selectedExistingImage && !uploadFile) {
        response = await authenticatedFetch(`/api/products/${uploadProductId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image_url: selectedExistingImage.url }),
        });
      } else {
        const formData = new FormData();
        formData.append('image', uploadFile);
        response = await authenticatedFetch(`/api/products/${uploadProductId}/image`, {
          method: 'POST',
          body: formData,
        });
      }
      if (!response.ok) throw new Error('Failed to upload image');
      const payload = await response.json();
      const imageUrl = payload.image_url || selectedExistingImage.url;
      setProducts((currentProducts) => currentProducts.map((product) => (
        product.id === uploadProductId
          ? { ...product, image_url: imageUrl, imageCount: 1, missingImages: 0, imageManagerStatus: 'Good' }
          : product
      )));
      setIsUploadPageOpen(false);
      setUploadFile(null);
      setUploadPreview('');
      setSelectedExistingImage(null);
      setUploadProductId('');
    } catch (uploadError) {
      setError(uploadError.message);
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleDeleteImage = async () => {
    if (!imagePopup?.id) return;

    setIsDeletingImage(true);
    try {
      const response = await authenticatedFetch(`/api/products/${imagePopup.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_url: null, image_name: null, image_alt: null }),
      });
      if (!response.ok) throw new Error('Failed to delete image');

      await loadProducts();
      setDeleteConfirmation(false);
      setImagePopup(null);
    } catch (deleteError) {
      setError(deleteError.message);
    } finally {
      setIsDeletingImage(false);
    }
  };

  const handleDiscardUpload = () => {
    setUploadProductId('');
    setUploadFile(null);
    setSelectedExistingImage(null);
    setUploadPreview('');
  };

  const resourceName = {
    singular: 'product',
    plural: 'products',
  };

  const { selectedResources, allResourcesSelected, handleSelectionChange } =
    useIndexResourceState(paginatedProducts);

  const uploadProductOptions = products.map((product) => ({
    label: `${product.title} · SKU: ${product.sku}`,
    value: product.id,
  }));

  const rowMarkup = paginatedProducts.map(
    (product, index) => {
      const { id, title, sku, imageCount, altCompleteCount, altCompletePercent, missingImages, duplicates, imageManagerStatus: status, lastUpdated, image_url } = product;
      let statusBadge;
      switch (status) {
        case 'Good':
          statusBadge = <Badge status="success">Good</Badge>;
          break;
        case 'ALT incomplete':
          statusBadge = <Badge status="warning">ALT incomplete</Badge>;
          break;
        case 'Duplicates found':
          statusBadge = <Badge status="critical">Duplicates found</Badge>;
          break;
        case 'No images':
          statusBadge = <Badge status="critical">No images</Badge>;
          break;
        default:
          statusBadge = <Badge>{status}</Badge>;
      }

      let altCompleteColor = '#008000';
      if (altCompletePercent === '0%' || altCompletePercent === '50%' ||
        altCompletePercent === '33%' || altCompletePercent === '25%') {
        altCompleteColor = '#d82c0d';
      }


      return (
        <IndexTable.Row
          id={id}
          key={id}
          selected={selectedResources.includes(id)}
          position={index}
        >
          <IndexTable.Cell>
            <Stack wrap={false} alignment="center" spacing="tight">
              {image_url ? (
                <div onClick={(e) => { e.stopPropagation(); setImagePopup({ id, image_url, title }); }} style={{ cursor: 'pointer' }}>
                  <img src={image_url} alt={title} style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px' }} />
                </div>
              ) : (
                <div style={{ width: '40px', height: '40px', background: '#f4f6f8', border: '1px solid #dfe3e8', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon source={ImageMajor} color="subdued" />
                </div>
              )}
              <div onClick={(e) => e.stopPropagation()}>
                <Text variant="bodyMd" fontWeight="bold" color="primary">{title}</Text>
                <Text variant="bodySm" color="subdued">SKU: {sku}</Text>
                <Text variant="bodySm" color="subdued">ID: {id}</Text>
              </div>
            </Stack>
          </IndexTable.Cell>
          <IndexTable.Cell>
            <Text variant="bodyMd" fontWeight="bold">{imageCount}</Text>
          </IndexTable.Cell>
          
          <IndexTable.Cell>
            <div style={{ textAlign: 'center' }}>
              <Text variant="bodyMd" color={duplicates !== '-' ? 'critical' : 'subdued'}>{duplicates}</Text>
            </div>
          </IndexTable.Cell>
          <IndexTable.Cell>{statusBadge}</IndexTable.Cell>
          <IndexTable.Cell>
            <div style={{ whiteSpace: 'pre-wrap' }}>
              <Text variant="bodySm">{lastUpdated}</Text>
            </div>
          </IndexTable.Cell>
          <IndexTable.Cell>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
              <Button icon={ViewMinor} accessibilityLabel="View" onClick={() => setViewingProduct(product)} />
              <Button size="slim" onClick={() => setImagePopup({ id, image_url, title })}>Edit</Button>
            </div>
          </IndexTable.Cell>
        </IndexTable.Row>
      );
    },
  );

  if (isBulkEditing) {
    return (
      <Page fullWidth title="Bulk edit images" backAction={{ content: "Image Manager", onAction: () => setIsBulkEditing(false) }}>
        <div style={{ padding: '20px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '20px', flexWrap: 'wrap' }}>
            <div>
              
              <div style={{ marginTop: '8px' }}>
                <Text variant="headingLg">Bulk edit image metadata</Text>
                <Text variant="bodyMd" color="subdued">Update the name and ALT text for each selected product.</Text>
              </div>
            </div>
            <Button primary onClick={handleSaveBulkEdit} loading={isSavingBulk}>Save all</Button>
          </div>

          <div style={{ display: 'grid', gap: '16px' }}>
            {Object.entries(bulkEditData).map(([id, data]) => {
              const product = products.find((item) => item.id === id);
              if (!product) return null;

              return (
                <Card key={id}>
                  <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start', padding: '20px', flexWrap: 'wrap' }}>
                    <div style={{ width: '180px', height: '140px', flex: '0 0 180px', border: '1px solid #dfe3e8', borderRadius: '8px', background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {product.image_url ? (
                        <img src={product.image_url} alt={data.image_alt || product.title} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                      ) : (
                        <Icon source={ImageMajor} color="subdued" />
                      )}
                    </div>
                    <div style={{ flex: '1 1 320px', minWidth: '260px' }}>
                      <Text variant="headingMd">{product.title}</Text>
                      <Text variant="bodySm" color="subdued">SKU: {product.sku} · ID: {id}</Text>
                      <div style={{ display: 'grid', gap: '16px', marginTop: '16px' }}>
                        <TextField
                          label="Name"
                          value={data.image_name}
                          onChange={(value) => setBulkEditData((current) => ({ ...current, [id]: { ...current[id], image_name: value } }))}
                          autoComplete="off"
                        />
                        <TextField
                          label="Image ALT text"
                          value={data.image_alt}
                          onChange={(value) => setBulkEditData((current) => ({ ...current, [id]: { ...current[id], image_alt: value } }))}
                          helpText={`${data.image_alt.length}/512`}
                          maxLength={512}
                          autoComplete="off"
                        />
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      
      

    </Page>
    );
  }

  if (isUploadPageOpen) {
    return (
      <Page fullWidth title="Upload image" backAction={{ content: "Image Manager", onAction: () => setIsUploadPageOpen(false) }}>
        <div style={{ maxWidth: '960px', margin: '0 auto', padding: '24px 0' }}>
          
          <div style={{ margin: '16px 0 24px' }}>
            <Text variant="headingLg">Upload product image</Text>
            <Text variant="bodyMd" color="subdued">Select an existing product, then upload an image for it.</Text>
          </div>

          <Card>
            <div style={{ padding: '24px', display: 'grid', gap: '20px' }}>
              <Select
                label="Select product"
                placeholder="Choose a product"
                options={uploadProductOptions}
                value={uploadProductId}
                onChange={setUploadProductId}
              />
            </div>
          </Card>

          <Card>
            <div style={{ padding: '24px', marginTop: '20px' }}>
              <Text variant="headingMd">Upload image</Text>
              <div style={{ marginTop: '16px', border: '2px dashed #c9cccf', borderRadius: '8px', minHeight: '240px', padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', background: '#f9fafb' }}>
                {uploadPreview ? (
                  <img src={uploadPreview} alt="Selected upload preview" style={{ maxWidth: '100%', maxHeight: '220px', objectFit: 'contain', borderRadius: '6px' }} />
                ) : (
                  <Text color="subdued">Choose an image from your device</Text>
                )}
                <div style={{ display: 'flex', gap: '8px', marginTop: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
                  <label>
                    <Button onClick={() => document.getElementById('image-upload-input').click()}>Choose image</Button>
                    <input id="image-upload-input" type="file" accept="image/*" onChange={handleUploadFileChange} style={{ display: 'none' }} />
                  </label>
                  <Button onClick={() => setIsUploadFileSelectorOpen(true)}>Select existing</Button>
                </div>
                {uploadFile && <div style={{ marginTop: '8px' }}><Text variant="bodySm" color="subdued">{uploadFile.name}</Text></div>}
                {selectedExistingImage && !uploadFile && <div style={{ marginTop: '8px' }}><Text variant="bodySm" color="subdued">Existing Shopify image selected</Text></div>}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px' }}>
                <Button onClick={handleDiscardUpload} disabled={isUploadingImage}>Discard</Button>
                <Button primary onClick={handleUploadImage} loading={isUploadingImage} disabled={!uploadProductId || (!uploadFile && !selectedExistingImage)}>Save</Button>
              </div>
            </div>
          </Card>
        </div>
        <FileSelectorModal
          open={isUploadFileSelectorOpen}
          onClose={() => setIsUploadFileSelectorOpen(false)}
          onSelect={(file) => {
            setIsUploadFileSelectorOpen(false);
            setSelectedExistingImage(file);
            setUploadFile(null);
            setUploadPreview(file.url);
          }}
        />
      </Page>
    );
  }

  return (
    <Page fullWidth>
      <TitleBar 
        title="Image Manager" 
        secondaryActions={[{ content: unreadCount > 0 ? `🔔 ${unreadCount}` : "🔔", onAction: () => navigate("/notifications") }]} 
      />
      <Stack distribution="equalSpacing" alignment="center">
        <div>
          
          <Text as="p" color="subdued" variant="bodyMd">Audit and optimize product images to improve quality and discoverability.</Text>
        </div>
        <ButtonGroup>
          <Button onClick={handleSync} loading={isSyncing}>Sync</Button>
          <Button primary onClick={() => setIsUploadPageOpen(true)} disabled={isSyncing}>Upload</Button>
        </ButtonGroup>
      </Stack>

      <div style={{ marginTop: '24px', marginBottom: '24px' }}>
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '20px' }}>
            <div style={{ flex: 1, textAlign: 'center', borderRight: '1px solid #dfe3e8' }}>
              <Text variant="bodySm" color="subdued">Total Products</Text>
              <Text variant="headingXl">{isLoading ? '-' : products.length}</Text>
            </div>
            <div style={{ flex: 1, textAlign: 'center', borderRight: '1px solid #dfe3e8' }}>
              <Text variant="bodySm" color="subdued">With Images</Text>
              <Text variant="headingXl">{isLoading ? '-' : products.filter(p => p.imageCount > 0).length}</Text>
            </div>
            <div style={{ flex: 1, textAlign: 'center', borderRight: '1px solid #dfe3e8' }}>
              <Text variant="bodySm" color="subdued">No Images</Text>
              <Text variant="headingXl">{isLoading ? '-' : products.filter(p => p.imageCount === 0).length}</Text>
            </div>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <Text variant="bodySm" color="subdued">Duplicates</Text>
              <Text variant="headingXl" color="critical">-</Text>
            </div>
          </div>
        </Card>
      </div>

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
            <Button onClick={handleStartBulkEdit} disabled={selectedResources.length === 0}>
              Bulk edit
            </Button>
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
            selectedItemsCount={
              allResourcesSelected ? 'All' : selectedResources.length
            }
            onSelectionChange={handleSelectionChange}
            headings={[
              { title: 'Product' },
              { title: 'Image Count' },
              { title: 'Duplicates', alignment: 'center' },
              { title: 'Status' },
              { title: 'Last Updated' },
              { title: 'Action' },
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
      {error && <Toast content={error} error onDismiss={() => setError("")} />}
      
      {imagePopup && !isFileSelectorOpen && (
        <Modal
          open={!!imagePopup}
          onClose={() => setImagePopup(null)}
          title={`Edit image: ${imagePopup.title}`}
          primaryAction={{
            content: 'Save',
            onAction: handleSavePopupImage,
            loading: isSavingPopupImage
          }}
          secondaryActions={[
            {
              content: 'Cancel',
              onAction: () => {
                setImagePopup(null);
                setPopupUploadFile(null);
              },
            },
          ]}
          large
        >
          <Modal.Section>
            <Text variant="bodyMd" color="subdued">Default variant</Text>
            <div style={{ display: 'flex', gap: '24px', marginTop: '16px' }}>
              {/* Left Column - Image Preview */}
              <div style={{ flex: '0 0 45%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ position: 'relative', border: '1px solid #dfe3e8', borderRadius: '8px', padding: '16px', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9fafb', minHeight: '300px' }}>
                  <div style={{ position: 'absolute', top: '8px', right: '8px' }}>
                    <Button icon={DeleteMinor} plain destructive onClick={() => setDeleteConfirmation(true)} />
                  </div>
                  {imagePopup.image_url ? (
                    <img src={imagePopup.image_url} alt={imagePopup.title} style={{ maxWidth: '100%', maxHeight: '300px', objectFit: 'contain' }} />
                  ) : (
                    <Icon source={ImageMajor} color="subdued" />
                  )}
                  <div style={{ position: 'absolute', bottom: '8px', right: '8px' }}>
                    <Popover
                      active={editPopoverActive}
                      activator={<Button icon={EditMinor} onClick={() => setEditPopoverActive((active) => !active)} />}
                      onClose={() => setEditPopoverActive(false)}
                      autofocusTarget="first-node"
                    >
                      <ActionList
                        actionRole="menuitem"
                        items={[
                          {
                            content: 'Select existing',
                            onAction: () => {
                              setEditPopoverActive(false);
                              setIsFileSelectorOpen(true);
                            },
                          },
                          {
                            content: 'Upload from device',
                            onAction: () => {
                              setEditPopoverActive(false);
                              const input = document.createElement('input');
                              input.type = 'file';
                              input.accept = 'image/*';
                              input.onchange = (e) => {
                                const file = e.target.files[0];
                                if (file) {
                                  setPopupUploadFile(file);
                                  const reader = new FileReader();
                                  reader.onload = (e) => {
                                    setImagePopup({ ...imagePopup, image_url: e.target.result });
                                  };
                                  reader.readAsDataURL(file);
                                }
                              };
                              input.click();
                            },
                          },
                        ]}
                      />
                    </Popover>
                  </div>
                </div>
              </div>

              {/* Right Column - Details & Form */}
              <div style={{ flex: '1', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <TextField 
                  label="Name" 
                  value={imagePopup.image_url ? String(imagePopup.image_url).split('/').pop().split('?')[0] : ''} 
                  autoComplete="off" 
                  onChange={() => {}}
                />
                
                <TextField 
                  label="Image ALT text" 
                  value="" 
                  autoComplete="off" 
                  onChange={() => {}}
                  helpText="Describe the image for accessibility. 0/512"
                />

                {imagePopup.image_url && (
                <div style={{ backgroundColor: '#f4f6f8', padding: '16px', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <Text variant="headingSm">Details</Text>
                    <div style={{ marginTop: '8px' }}>
                      <Text variant="bodyMd" color="subdued">JPEG • 1024 x 1024 • 250 kB</Text>
                      <Text variant="bodyMd" color="subdued">Added 8/21/2026</Text>
                    </div>
                  </div>
                  <div>
                    <Text variant="headingSm">Used in</Text>
                    <div style={{ marginTop: '8px' }}>
                      <Text variant="bodyMd">{imagePopup.title}</Text>
                    </div>
                  </div>
                </div>
                )}
              </div>
            </div>
          </Modal.Section>
        </Modal>
      )}

      {deleteConfirmation && (
        <Modal
          open={deleteConfirmation}
          onClose={() => setDeleteConfirmation(false)}
          title="Delete image"
          primaryAction={{
            content: 'Delete',
            destructive: true,
            loading: isDeletingImage,
            onAction: handleDeleteImage,
          }}
          secondaryActions={[
            {
              content: 'Cancel',
              onAction: () => setDeleteConfirmation(false),
            },
          ]}
        >
          <Modal.Section>
            <Text variant="bodyMd">Are you sure you want to delete this image? This action cannot be undone.</Text>
          </Modal.Section>
        </Modal>
      )}

      <FileSelectorModal 
        open={isFileSelectorOpen}
        onClose={() => setIsFileSelectorOpen(false)}
        onSelect={(file) => {
          setIsFileSelectorOpen(false);
          setPopupUploadFile(null);
          setImagePopup({ ...imagePopup, image_url: file.url, image_name: file.id });
        }}
      />

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
                  <Badge status={(viewingProduct.status?.label || viewingProduct.status) === 'active' ? 'success' : 'info'}>
                    {viewingProduct.status ? String(viewingProduct.status.label || viewingProduct.status).toUpperCase() : 'DRAFT'}
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

      <FileSelectorModal
        open={isUploadFileSelectorOpen}
        onClose={() => setIsUploadFileSelectorOpen(false)}
        onSelect={(file) => {
          setIsUploadFileSelectorOpen(false);
          setSelectedExistingImage(file);
          setUploadFile(null);
          setUploadPreview(file.url);
        }}
      />
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


export default function ImageManager() {
  const navigate = useNavigate();
  return (
    <ErrorBoundary>
      <ImageManagerContent />
    </ErrorBoundary>
  );
}
