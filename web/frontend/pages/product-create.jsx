import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Page,
  Layout,
  Card,
  TextField,
  Select,
  DropZone,
  Stack,
  Text,
  Button,
  Checkbox,
  FormLayout,
  ButtonGroup,
  Popover,
  Icon,
  Modal,
} from '@shopify/polaris';
import { CirclePlusMinor, EditMinor , ChevronUpMinor, ChevronDownMinor, SelectMinor, InfoMinor, SearchMinor, HorizontalDotsMinor, DragHandleMinor } from '@shopify/polaris-icons';
import { TitleBar } from '@shopify/app-bridge-react';
import JoditEditor from 'jodit-react';
import { FileSelectorModal, CategoryPicker } from '../components';
import { useAuthenticatedFetch } from '../hooks';

export default function ProductCreate() {
  const navigate = useNavigate();
  const fetch = useAuthenticatedFetch();

  const [inventoryTracked, setInventoryTracked] = useState(true);
  const [inventoryExpanded, setInventoryExpanded] = useState(false);
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [sellOutOfStock, setSellOutOfStock] = useState(false);
  const [locationsModalOpen, setLocationsModalOpen] = useState(false);
  const [locations, setLocations] = useState([
    { id: '1', name: 'depot 1', quantity: 0, checked: true },
    { id: '2', name: 'depot 2', quantity: 0, checked: true },
    { id: '3', name: 'depot 3', quantity: 0, checked: true },
    { id: '4', name: 'My Custom Location', quantity: 0, checked: true },
    { id: '5', name: 'Shop', quantity: 0, checked: true },
    { id: '6', name: 'Shop location', quantity: 0, checked: true },
    { id: '7', name: 'Snow City Warehouse', app: 'App', subtitle: 'Add a SKU to use this location.', quantity: 0, checked: false, disabled: true }
  ]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const descriptionRef = useRef(description);
  const [storeMediaModalOpen, setStoreMediaModalOpen] = useState(false);
  const [mediaOrder, setMediaOrder] = useState([]);
  
  // Pricing states
  const [compareAtPrice, setCompareAtPrice] = useState('');
  const [costPerItem, setCostPerItem] = useState('');
  const [showCost, setShowCost] = useState(false);
  const [taxable, setTaxable] = useState(true);
  const [showUnitPrice, setShowUnitPrice] = useState(false);
  const [unitPriceActive, setUnitPriceActive] = useState(false);
  const [unitTotalAmount, setUnitTotalAmount] = useState('');
  const [unitBaseMeasure, setUnitBaseMeasure] = useState('1');
  const [unitBaseUnit, setUnitBaseUnit] = useState('KG');
  const [currency, setCurrency] = useState('USD');
  const [pricingExpanded, setPricingExpanded] = useState(false);

  useEffect(() => {
    async function fetchShop() {
      try {
        const res = await fetch('/api/shop-settings');
        if (res.ok) {
          const data = await res.json();
          setCurrency(data.currencyCode || 'USD');
        }
      } catch (e) {}
    }
    fetchShop();
  }, [fetch]);

  const handleStoreMediaSelect = (files) => {
     // placeholder for media logic
     setStoreMediaModalOpen(false);
  };

  const [vendor, setVendor] = useState('None');
  const [productType, setProductType] = useState('None');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('Active');
  const [price, setPrice] = useState('0.00');

  const [weight, setWeight] = useState('0.0');
  const [shippingPhysical, setShippingPhysical] = useState(true);
  const [shippingExpanded, setShippingExpanded] = useState(false);
  const [weightUnit, setWeightUnit] = useState('kg');
  const [country, setCountry] = useState('');
  const [hsCode, setHsCode] = useState('');
  const [variantsEnabled, setVariantsEnabled] = useState(false);
  const [variantPopoverActive, setVariantPopoverActive] = useState(false);
  const [variantOptionName, setVariantOptionName] = useState('Size');
  const [variantOptionValue, setVariantOptionValue] = useState('Medium');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/products/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description: descriptionRef.current,
          vendor,
          productType,
          category,
          status,
          price,
          sku,
          weight,
          compareAtPrice,
          costPerItem,
          taxable,
          unitPriceMeasurement: (showUnitPrice && unitTotalAmount && unitBaseMeasure) ? {
            measuredType: 'WEIGHT',
            quantityValue: unitTotalAmount,
            quantityUnit: unitBaseUnit,
            referenceValue: unitBaseMeasure,
            referenceUnit: unitBaseUnit
          } : null,
          mediaOrder
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create product');
      }

      navigate('/catalog');
    } catch (error) {
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Page
      backAction={{ content: 'Products', onAction: () => navigate('/catalog') }}
      title="Add product"
      primaryAction={{
        content: 'Save',
        onAction: handleSave,
        loading: isSaving,
      }}
      secondaryActions={[
        {
          content: 'Discard',
          onAction: () => navigate('/catalog'),
        },
      ]}
    >
      <Layout>
        <Layout.Section>
          <Stack vertical spacing="loose">
            <Card sectioned>
              <FormLayout>
                <TextField
                  label="Title"
                  value={title}
                  onChange={setTitle}
                  placeholder="Short sleeve t-shirt"
                  autoComplete="off"
                />
                <div>
                  <Text as="p" variant="bodyMd" style={{marginBottom: '4px'}}>Description</Text>
                  <div className="shopify-style-editor" style={{ border: '1px solid #dfe3e8', borderRadius: '4px', overflow: 'hidden' }}>
                    <JoditEditor
                      value={description}
                      config={{
                        buttons: ['paragraph', 'bold', 'italic', 'underline', 'font', 'align', 'link', 'image', 'video', 'table', 'dots', 'source'],
                        removeButtons: ['brush', 'file', 'copyformat', 'undo', 'redo', 'fullsize', 'hr', 'eraser', 'symbol', 'superscript', 'subscript'],
                        showCharsCounter: false,
                        showWordsCounter: false,
                        showXPathInStatusbar: false,
                        toolbarAdaptive: false,
                        hidePoweredByJodit: true,
                        statusbar: false,
                        height: 300
                      }}
                      onChange={(newContent) => {
                         descriptionRef.current = newContent;
                      }}
                    />
                  </div>
                </div>
              </FormLayout>
            </Card>

            <Card title="Media" sectioned>
              <DropZone onDrop={() => {}}>
                <div style={{ padding: '24px 0', textAlign: 'center' }}>
                  <div style={{ marginBottom: '8px' }}>
                    <Text variant="bodyMd" as="p" color="subdued">Accepts images, videos, or 3D models</Text>
                  </div>
                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '16px' }}>
                    <Button onClick={(e) => e.stopPropagation()}>Add images</Button>
                    <Button onClick={(e) => { e.stopPropagation(); setStoreMediaModalOpen(true); }}>Select existing</Button>
                  </div>
                </div>
              </DropZone>
            </Card>

            <Card title="Category" sectioned>
              <div>
                <CategoryPicker selectedCategory={category} onSelect={setCategory} />
                <Text variant="bodySm" color="subdued" as="p" style={{ marginTop: '4px' }}>
                  Determines tax rates and adds metafields to improve search, filters, and cross-channel sales
                </Text>
              </div>
            </Card>

            <Card>
              <Card.Section>
                <div style={{ maxWidth: '240px' }}>
                  <TextField label="Price" type="number" value={price} onChange={setPrice} prefix={currency} autoComplete="off" />
                </div>
              </Card.Section>
              
              {!pricingExpanded && (
                <div 
                  style={{ padding: '16px 20px', borderTop: '1px solid #dfe3e8', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} 
                  onClick={() => setPricingExpanded(true)}
                >
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', backgroundColor: '#ebebeb', padding: '4px 12px', borderRadius: '6px', fontSize: '13px', color: '#202223' }}>Compare-at</div>
                    <div style={{ display: 'inline-flex', alignItems: 'center', backgroundColor: '#ebebeb', padding: '4px 12px', borderRadius: '6px', fontSize: '13px', color: '#202223' }}>Unit price</div>
                    <div style={{ display: 'inline-flex', alignItems: 'center', backgroundColor: '#ebebeb', padding: '4px 12px', borderRadius: '6px', fontSize: '13px', color: '#202223' }}>
                      Charge tax <span style={{ marginLeft: '8px', backgroundColor: '#d1d3d4', padding: '1px 8px', borderRadius: '12px', fontSize: '12px' }}>Yes</span>
                    </div>
                    <div style={{ display: 'inline-flex', alignItems: 'center', backgroundColor: '#ebebeb', padding: '4px 12px', borderRadius: '6px', fontSize: '13px', color: '#202223' }}>Cost per item</div>
                  </div>
                  <Icon source={ChevronDownMinor} color="subdued" />
                </div>
              )}
              
              {pricingExpanded && (
                <Card.Section>
                  <div 
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', marginBottom: '16px' }}
                    onClick={() => setPricingExpanded(false)}
                  >
                    <Text variant="headingSm" as="h6">Additional display prices</Text>
                    <Icon source={ChevronUpMinor} color="subdued" />
                  </div>
                  
                  <FormLayout>
                    <FormLayout.Group>
                      <TextField label="Compare-at price" type="number" value={compareAtPrice} onChange={setCompareAtPrice} prefix={currency} autoComplete="off" />
                      
                      <div>
                        <div style={{ marginBottom: '4px' }}>
                          <Text as="p" variant="bodyMd">Unit price</Text>
                        </div>
                        <Popover
                          active={unitPriceActive}
                          activator={
                            <div 
                              onClick={() => setUnitPriceActive(true)}
                              style={{ border: '1px solid #c9cccf', borderRadius: '4px', padding: '0 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', height: '36px', backgroundColor: '#fff', boxShadow: 'inset 0 1px 0 0 rgba(0,0,0,0.05)' }}
                            >
                              <Text as="span" color="subdued">{showUnitPrice ? 'Configured' : '--'}</Text>
                              <Icon source={SelectMinor} color="subdued" />
                            </div>
                          }
                          onClose={() => setUnitPriceActive(false)}
                          autofocusTarget="none"
                        >
                          <div style={{ padding: '16px', minWidth: '320px' }}>
                            <FormLayout>
                              <TextField 
                                label="Total amount" 
                                type="number" 
                                value={unitTotalAmount} 
                                onChange={setUnitTotalAmount} 
                                autoComplete="off"
                                connectedRight={
                                  <Select
                                    labelHidden
                                    label="Unit"
                                    options={['g', 'kg', 'ml', 'L', 'm', 'cm']}
                                    value={unitBaseUnit}
                                    onChange={setUnitBaseUnit}
                                  />
                                }
                              />
                              <TextField 
                                label="Base measure" 
                                type="number" 
                                value={unitBaseMeasure} 
                                onChange={setUnitBaseMeasure} 
                                autoComplete="off"
                                connectedRight={
                                  <Select
                                    labelHidden
                                    label="Unit"
                                    options={['g', 'kg', 'ml', 'L', 'm', 'cm']}
                                    value={unitBaseUnit}
                                    onChange={setUnitBaseUnit}
                                  />
                                }
                              />
                            </FormLayout>
                            <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Button plain destructive onClick={() => { setShowUnitPrice(false); setUnitPriceActive(false); }}>Clear</Button>
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <Button onClick={() => setUnitPriceActive(false)}>Cancel</Button>
                                <Button primary onClick={() => { setShowUnitPrice(true); setUnitPriceActive(false); }}>Done</Button>
                              </div>
                            </div>
                          </div>
                        </Popover>
                      </div>
                    </FormLayout.Group>
                    
                    <div style={{ marginTop: '4px' }}>
                      <Checkbox label="Charge tax on this product" checked={taxable} onChange={setTaxable} />
                    </div>
                  </FormLayout>
                </Card.Section>
              )}

              {pricingExpanded && (
                <Card.Section>
                  {!showCost ? (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <div 
                        onClick={() => setShowCost(true)}
                        style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', border: '1px solid #c9cccf', padding: '4px 8px', borderRadius: '8px', fontSize: '13px', backgroundColor: '#fff' }}
                      >
                        Cost <span style={{ marginLeft: '8px', backgroundColor: '#f4f6f8', padding: '2px 8px', borderRadius: '4px', color: '#5c5f62' }}>{costPerItem || '--'}</span>
                      </div>
                      <div 
                        onClick={() => setShowCost(true)}
                        style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', border: '1px solid #c9cccf', padding: '4px 8px', borderRadius: '8px', fontSize: '13px', backgroundColor: '#fff' }}
                      >
                        Profit <span style={{ marginLeft: '8px', backgroundColor: '#f4f6f8', padding: '2px 8px', borderRadius: '4px', color: '#5c5f62' }}>{price && costPerItem ? (parseFloat(price) - parseFloat(costPerItem)).toFixed(2) : '--'}</span>
                      </div>
                      <div 
                        onClick={() => setShowCost(true)}
                        style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', border: '1px solid #c9cccf', padding: '4px 8px', borderRadius: '8px', fontSize: '13px', backgroundColor: '#fff' }}
                      >
                        Margin <span style={{ marginLeft: '8px', backgroundColor: '#f4f6f8', padding: '2px 8px', borderRadius: '4px', color: '#5c5f62' }}>{price && costPerItem && parseFloat(price) > 0 ? ((parseFloat(price) - parseFloat(costPerItem)) / parseFloat(price) * 100).toFixed(1) + '%' : '--'}</span>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        <TextField label="Cost per item" type="number" value={costPerItem} onChange={setCostPerItem} prefix={currency} autoComplete="off" />
                      </div>
                      <div style={{ flex: 1 }}>
                        <Text as="p" variant="bodyMd">Profit</Text>
                        <div style={{ marginTop: '8px' }}>
                          <Text as="p">{price && costPerItem ? (parseFloat(price) - parseFloat(costPerItem)).toFixed(2) : '--'}</Text>
                        </div>
                      </div>
                      <div style={{ flex: 1 }}>
                        <Text as="p" variant="bodyMd">Margin</Text>
                        <div style={{ marginTop: '8px' }}>
                          <Text as="p">{price && costPerItem && parseFloat(price) > 0 ? ((parseFloat(price) - parseFloat(costPerItem)) / parseFloat(price) * 100).toFixed(1) + '%' : '--'}</Text>
                        </div>
                      </div>
                    </div>
                  )}
                </Card.Section>
              )}
            </Card>

            <Card>
              <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text variant="headingSm" as="h3">Inventory</Text>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Text as="p" color="subdued">Inventory tracked</Text>
                  <div 
                    onClick={() => setInventoryTracked(!inventoryTracked)}
                    style={{ 
                      width: '36px', height: '20px', backgroundColor: inventoryTracked ? '#2c6ecb' : '#dfe3e8', 
                      borderRadius: '10px', position: 'relative', cursor: 'pointer', transition: 'background-color 0.2s' 
                    }}
                  >
                    <div style={{
                      width: '16px', height: '16px', backgroundColor: '#fff', borderRadius: '50%',
                      position: 'absolute', top: '2px', left: inventoryTracked ? '18px' : '2px', transition: 'left 0.2s',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                    }} />
                  </div>
                </div>
              </div>

              <div style={{ margin: '0 20px', border: '1px solid #dfe3e8', borderRadius: '8px', overflow: 'hidden' }}>
                <div style={{ padding: '12px 16px', backgroundColor: '#f9fafb', borderBottom: '1px solid #dfe3e8', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }} onClick={() => setLocationsModalOpen(true)}>
                    <Text as="span" color="subdued">Quantity</Text>
                    <Icon source={EditMinor} color="subdued" />
                  </div>
                  <Text as="span" color="subdued"><span style={{ borderBottom: '1px dashed #8c9196' }}>Quantity</span></Text>
                </div>
                
                {locations.filter(l => l.checked).map((loc, i, arr) => (
                  <div key={loc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: i === arr.length - 1 ? 'none' : '1px solid #dfe3e8' }}>
                    <Text as="span">{loc.name}</Text>
                    <div style={{ width: '100px' }}>
                      <TextField 
                        type="number" 
                        value={loc.quantity.toString()} 
                        onChange={(v) => {
                          const newLocs = [...locations];
                          const idx = newLocs.findIndex(l => l.id === loc.id);
                          newLocs[idx].quantity = parseInt(v) || 0;
                          setLocations(newLocs);
                        }}
                        autoComplete="off" 
                      />
                    </div>
                  </div>
                ))}
              </div>

              {!inventoryExpanded ? (
                <div 
                  style={{ padding: '16px 20px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }} 
                  onClick={() => setInventoryExpanded(true)}
                >
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', backgroundColor: '#ebebeb', padding: '4px 12px', borderRadius: '6px', fontSize: '13px', color: '#202223' }}>SKU</div>
                    <div style={{ display: 'inline-flex', alignItems: 'center', backgroundColor: '#ebebeb', padding: '4px 12px', borderRadius: '6px', fontSize: '13px', color: '#202223' }}>Barcodes</div>
                    <div style={{ display: 'inline-flex', alignItems: 'center', backgroundColor: '#ebebeb', padding: '4px 12px', borderRadius: '6px', fontSize: '13px', color: '#202223' }}>
                      Sell when out of stock <span style={{ marginLeft: '8px', backgroundColor: '#d1d3d4', padding: '1px 8px', borderRadius: '12px', fontSize: '12px' }}>{sellOutOfStock ? 'On' : 'Off'}</span>
                    </div>
                  </div>
                  <Icon source={ChevronDownMinor} color="subdued" />
                </div>
              ) : (
                <div style={{ padding: '16px 20px', borderTop: '1px solid #dfe3e8', marginTop: '16px' }}>
                  <div 
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', marginBottom: '16px' }}
                    onClick={() => setInventoryExpanded(false)}
                  >
                    <Text variant="headingSm" as="h6">More details</Text>
                    <Icon source={ChevronUpMinor} color="subdued" />
                  </div>
                  
                  <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <TextField label="SKU (Stock Keeping Unit)" value={sku} onChange={setSku} autoComplete="off" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <TextField 
                        label="Barcodes" 
                        value={barcode} 
                        onChange={setBarcode} 
                        autoComplete="off" 
                        placeholder="ISBN, UPC, GTIN, etc."
                        connectedRight={
                          <div style={{ padding: '0 8px', display: 'flex', alignItems: 'center', height: '100%', borderLeft: '1px solid #c9cccf', backgroundColor: '#fafbfb' }}>
                            <Icon source={ChevronDownMinor} color="subdued" />
                          </div>
                        }
                      />
                    </div>
                  </div>
                  
                  <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Checkbox label="Continue selling when out of stock" checked={sellOutOfStock} onChange={setSellOutOfStock} />
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: '#f4f6f8', padding: '2px 8px', borderRadius: '4px', fontSize: '12px', color: '#5c5f62', border: '1px solid #dfe3e8' }}>
                      <Icon source={InfoMinor} color="subdued" /> POS excluded
                    </div>
                  </div>
                </div>
              )}
            </Card>

            <Card>
              <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text variant="headingSm" as="h3">Shipping</Text>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Text as="p" color="subdued">Physical product</Text>
                  <div 
                    onClick={() => setShippingPhysical(!shippingPhysical)}
                    style={{ 
                      width: '36px', height: '20px', backgroundColor: shippingPhysical ? '#2c6ecb' : '#dfe3e8', 
                      borderRadius: '10px', position: 'relative', cursor: 'pointer', transition: 'background-color 0.2s' 
                    }}
                  >
                    <div style={{
                      width: '16px', height: '16px', backgroundColor: '#fff', borderRadius: '50%',
                      position: 'absolute', top: '2px', left: shippingPhysical ? '18px' : '2px', transition: 'left 0.2s',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                    }} />
                  </div>
                </div>
              </div>

              <div style={{ padding: '0 20px 16px' }}>
                <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-end', width: '100%' }}>
                  <div style={{ flex: 2, minWidth: 0 }}>
                    <div style={{ marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ fontSize: '14px', color: '#202223' }}>Package</span>
                      <Icon source={InfoMinor} color="subdued" />
                    </div>
                    <div style={{ border: '1px solid #c9cccf', borderRadius: '4px', padding: '0 12px', height: '36px', display: 'flex', alignItems: 'center', backgroundColor: '#fff', boxShadow: 'inset 0 1px 0 0 rgba(0,0,0,0.05)', cursor: 'pointer', boxSizing: 'border-box', width: '100%' }}>
                      <div style={{ flexShrink: 0, marginRight: '8px', display: 'flex' }}>
                        <svg viewBox="0 0 20 20" style={{ width: '18px', height: '18px', fill: '#5c5f62' }}>
                          <path fillRule="evenodd" d="M3 4a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4Zm2 3v9a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V7H5Zm6 2v4a1 1 0 0 1-2 0V9a1 1 0 0 1 2 0Z"/>
                        </svg>
                      </div>
                      <div style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '14px', color: '#202223' }}>
                        <span style={{fontWeight: 500}}>Store default</span> • Sample box - 22 x 13.7 x 4.2 cm, 0 kg
                      </div>
                      <div style={{ flexShrink: 0, marginLeft: '8px', display: 'flex' }}>
                        <Icon source={SelectMinor} color="subdued" />
                      </div>
                    </div>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <TextField
                      label="Product weight"
                      type="number"
                      value={weight}
                      onChange={setWeight}
                      autoComplete="off"
                      connectedRight={
                        <Select
                          labelHidden
                          label="Unit"
                          options={['g', 'kg', 'lb', 'oz']}
                          value={weightUnit}
                          onChange={setWeightUnit}
                        />
                      }
                    />
                  </div>
                </div>
              </div>

              {!shippingExpanded ? (
                <div 
                  style={{ padding: '16px 20px', borderTop: '1px solid #dfe3e8', cursor: 'pointer', display: 'flex', alignItems: 'center', width: '100%', boxSizing: 'border-box' }} 
                  onClick={() => setShippingExpanded(true)}
                >
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', backgroundColor: '#ebebeb', padding: '4px 12px', borderRadius: '6px', fontSize: '13px', color: '#202223' }}>Country of origin</div>
                    <div style={{ display: 'inline-flex', alignItems: 'center', backgroundColor: '#ebebeb', padding: '4px 12px', borderRadius: '6px', fontSize: '13px', color: '#202223' }}>HS Code</div>
                  </div>
                  <div style={{ flex: 1 }} />
                  <Icon source={ChevronDownMinor} color="subdued" />
                </div>
              ) : (
                <div style={{ padding: '16px 20px', borderTop: '1px solid #dfe3e8', width: '100%', boxSizing: 'border-box' }}>
                  <div 
                    style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', marginBottom: '16px', width: '100%' }}
                    onClick={() => setShippingExpanded(false)}
                  >
                    <Text variant="headingSm" as="h6">More details</Text>
                    <div style={{ flex: 1 }} />
                    <Icon source={ChevronUpMinor} color="subdued" />
                  </div>
                  
                  <div style={{ marginBottom: '16px', width: '100%' }}>
                    <div style={{ marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px', width: '100%' }}>
                      <span style={{ fontSize: '14px', color: '#202223' }}>Country/Region of origin</span>
                      <Icon source={InfoMinor} color="subdued" />
                    </div>
                    <Select
                      labelHidden
                      label="Country of origin"
                      options={[{label: 'Select', value: ''}, {label: 'United States', value: 'US'}, {label: 'Canada', value: 'CA'}]}
                      value={country}
                      onChange={setCountry}
                    />
                  </div>
                  
                  <div style={{ width: '100%' }}>
                    <div style={{ marginBottom: '4px', display: 'flex', alignItems: 'center', width: '100%' }}>
                      <span style={{ fontSize: '14px', color: '#202223' }}>Harmonized System (HS) code</span>
                      <div style={{ marginLeft: '4px' }}>
                        <Icon source={InfoMinor} color="subdued" />
                      </div>
                      <div style={{ flex: 1 }} />
                      <Icon source={HorizontalDotsMinor} color="subdued" />
                    </div>
                    <TextField
                      labelHidden
                      label="HS Code"
                      placeholder="Enter a 6-digit code or search by keyword"
                      value={hsCode}
                      onChange={setHsCode}
                      autoComplete="off"
                      connectedRight={
                        <div style={{ padding: '0 8px', display: 'flex', alignItems: 'center', height: '100%', borderLeft: '1px solid #c9cccf', backgroundColor: '#fafbfb', cursor: 'pointer' }}>
                          <Icon source={ChevronDownMinor} color="subdued" />
                        </div>
                      }
                    />
                  </div>
                </div>
              )}
            </Card>

            <Card>
              <div style={{ padding: '16px 20px' }}>
                <Text variant="headingSm" as="h3">Variants</Text>
                
                <div style={{ marginTop: '16px' }}>
                  {!variantsEnabled ? (
                    <Popover
                      active={variantPopoverActive}
                      activator={
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }} onClick={() => setVariantPopoverActive(true)}>
                          <Icon source={CirclePlusMinor} color="base" />
                          <span style={{ fontSize: '14px', color: '#202223' }}>Add options like size or color</span>
                        </div>
                      }
                      onClose={() => setVariantPopoverActive(false)}
                      autofocusTarget="none"
                    >
                      <div style={{ width: '280px' }}>
                        <div style={{ padding: '12px' }}>
                          <TextField
                            prefix={<Icon source={SearchMinor} color="subdued" />}
                            placeholder="Search"
                            autoComplete="off"
                          />
                          <div style={{ marginTop: '16px', marginBottom: '8px' }}>
                            <Text as="p" color="subdued" variant="bodySm">Recommended</Text>
                          </div>
                          <div 
                            style={{ padding: '6px 12px', margin: '0 -4px', backgroundColor: '#f4f6f8', borderRadius: '4px', cursor: 'pointer' }}
                            onClick={() => { setVariantsEnabled(true); setVariantPopoverActive(false); }}
                          >
                            <span style={{ fontSize: '14px', color: '#202223' }}>Selection</span>
                          </div>
                          <div 
                            onClick={() => { 
                              setVariantOptionName('Specification'); 
                              setVariantOptionValue(''); 
                              setVariantsEnabled(true); 
                              setVariantPopoverActive(false); 
                            }}
                            style={{ padding: '6px 12px', margin: '0 -4px', cursor: 'pointer' }}
                          >
                            <span style={{ fontSize: '14px', color: '#202223' }}>Specification</span>
                          </div>
                        </div>
                        <div 
                          onClick={() => { 
                            setVariantOptionName(''); 
                            setVariantOptionValue(''); 
                            setVariantsEnabled(true); 
                            setVariantPopoverActive(false); 
                          }}
                          style={{ borderTop: '1px solid #dfe3e8', padding: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                        >
                          <Icon source={CirclePlusMinor} color="subdued" />
                          <span style={{ fontSize: '14px', color: '#202223' }}>Create custom option</span>
                        </div>
                      </div>
                    </Popover>
                  ) : (
                    <div style={{ border: '1px solid #dfe3e8', borderRadius: '8px', overflow: 'hidden' }}>
                      <div style={{ display: 'flex', padding: '16px' }}>
                        <div style={{ paddingRight: '12px', paddingTop: '32px', cursor: 'grab' }}>
                          <Icon source={DragHandleMinor} color="subdued" />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                            <span style={{ fontSize: '14px', color: '#202223' }}>Option name</span>
                            <svg viewBox="0 0 20 20" width="16" height="16" fill="#5c5f62"><path d="M10 2c-4.418 0-8 1.343-8 3 0 1.25 2.148 2.33 5.344 2.785a10.97 10.97 0 0 0 2.656.326v.001c.883 0 1.764-.108 2.623-.314C15.835 7.352 18 6.262 18 5c0-1.657-3.582-3-8-3Zm0 5c-4.418 0-8 1.343-8 3 0 1.25 2.148 2.33 5.344 2.785a10.97 10.97 0 0 0 2.656.326v.001c.883 0 1.764-.108 2.623-.314C15.835 12.352 18 11.262 18 10c0-1.657-3.582-3-8-3v1.889c0 1.657-3.582 3-8 3s-8-1.343-8-3V7Zm0 5c-4.418 0-8 1.343-8 3 0 1.25 2.148 2.33 5.344 2.785a10.97 10.97 0 0 0 2.656.326v.001c.883 0 1.764-.108 2.623-.314C15.835 17.352 18 16.262 18 15c0-1.657-3.582-3-8-3v1.889c0 1.657-3.582 3-8 3s-8-1.343-8-3v-1.889Z"/></svg>
                          </div>
                          <TextField
                            value={variantOptionName}
                            onChange={setVariantOptionName}
                            autoComplete="off"
                          />
                          
                          <div style={{ marginTop: '16px', marginBottom: '4px' }}>
                            <span style={{ fontSize: '14px', color: '#202223' }}>Option values</span>
                          </div>
                          <TextField
                            value={variantOptionValue}
                            onChange={setVariantOptionValue}
                            autoComplete="off"
                          />
                          
                          <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div 
                              onClick={() => setVariantsEnabled(false)}
                              style={{ cursor: 'pointer', padding: '6px 12px', border: '1px solid #dfe3e8', borderRadius: '4px', backgroundColor: '#fff', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
                            >
                              <span style={{ color: '#d82c0d', fontSize: '14px', fontWeight: 500 }}>Delete</span>
                            </div>
                            <div 
                              onClick={() => setVariantsEnabled(false)}
                              style={{ cursor: 'pointer', padding: '6px 16px', backgroundColor: '#202223', borderRadius: '4px', boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }}
                            >
                              <span style={{ color: '#fff', fontSize: '14px', fontWeight: 500 }}>Done</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div style={{ padding: '12px 16px', borderTop: '1px solid #dfe3e8', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                        <Icon source={CirclePlusMinor} color="base" />
                        <span style={{ fontSize: '14px', color: '#202223', fontWeight: 500 }}>Add another option</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Card>

            <Card title="Purchase options" sectioned>
              <Button plain icon={CirclePlusMinor}>Subscriptions, preorders, try before you buy, and more</Button>
            </Card>

            <Card sectioned>
              <Stack distribution="equalSpacing" alignment="center">
                <Text variant="headingSm" as="h3">Product metafields</Text>
                <Button plain>Add definition</Button>
              </Stack>
              <div style={{ marginTop: '16px' }}>
                <FormLayout>
                  <TextField label="Category" autoComplete="off" />
                  <TextField label="Z8 Offers" autoComplete="off" />
                  <div style={{ marginTop: '8px' }}>
                    <Button plain icon={CirclePlusMinor}>Disclosures</Button>
                  </div>
                </FormLayout>
              </div>
            </Card>
            
            <Card sectioned>
              <Stack distribution="equalSpacing" alignment="center">
                <Text variant="headingSm" as="h3">Search engine listing</Text>
                <Button plain icon={EditMinor} />
              </Stack>
              <div style={{ marginTop: '16px' }}>
                <Text as="p" color="subdued">Add a title and description to see how this product might appear in a search engine listing</Text>
              </div>
            </Card>
          </Stack>
        </Layout.Section>

        <Layout.Section secondary>
          <Stack vertical spacing="loose">
            <Card title="Status" sectioned>
              <Select
                labelHidden
                label="Status"
                options={[
                  { label: 'Active', value: 'Active' },
                  { label: 'Draft', value: 'Draft' },
                ]}
                value={status}
                onChange={setStatus}
              />
            </Card>

            <Card title="Publishing" sectioned>
              <Text as="p" fontWeight="medium">Publishing</Text>
              <div style={{ marginTop: '12px' }}>
                <Stack vertical spacing="tight">
                  <Text as="p"><strong>8</strong> All channels</Text>
                  <Text as="p"><strong>8</strong> All catalogs</Text>
                </Stack>
              </div>
            </Card>

            <Card title="Product organization" sectioned>
              <FormLayout>
                <Select
                  label="Type"
                  options={['None', 'Physical', 'Digital']}
                  value={productType}
                  onChange={setProductType}
                />
                <Select
                  label="Vendor"
                  options={['None']}
                  value={vendor}
                  onChange={setVendor}
                />
                <TextField
                  label="Collections"
                  placeholder="@ Add collections"
                  autoComplete="off"
                />
                <TextField
                  label="Tags"
                  placeholder="@ Add tags"
                  autoComplete="off"
                />
              </FormLayout>
            </Card>

            <Card title="Theme template" sectioned>
              <Select
                labelHidden
                label="Template"
                options={['Default product']}
                value="Default product"
                onChange={() => {}}
              />
            </Card>
          </Stack>
        </Layout.Section>
      </Layout>
      {storeMediaModalOpen && (
        <FileSelectorModal
          open={storeMediaModalOpen}
          onClose={() => setStoreMediaModalOpen(false)}
          onSelect={handleStoreMediaSelect}
          multiSelect={true}
        />
      )}
      {locationsModalOpen && (
        <Modal
          open={locationsModalOpen}
          onClose={() => setLocationsModalOpen(false)}
          title="Edit inventory locations"
          primaryAction={{
            content: 'Save',
            onAction: () => setLocationsModalOpen(false),
          }}
          secondaryActions={[
            {
              content: 'Cancel',
              onAction: () => setLocationsModalOpen(false),
            },
          ]}
        >
          <Modal.Section>
            <Text as="p" variant="bodyMd" style={{ marginBottom: '16px' }}>Selected locations fulfill orders for this variant</Text>
            <TextField
              prefix={<Icon source={SearchMinor} color="subdued" />}
              placeholder="Search locations"
              autoComplete="off"
            />
            <div style={{ marginTop: '16px', border: '1px solid #dfe3e8', borderRadius: '8px', overflow: 'hidden' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid #dfe3e8', backgroundColor: '#fafbfb' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Checkbox 
                    checked={locations.every(l => l.disabled ? true : l.checked)} 
                    onChange={(v) => {
                      setLocations(locations.map(l => l.disabled ? l : { ...l, checked: v }));
                    }} 
                  />
                  <Text as="span" fontWeight="medium">Location</Text>
                </div>
                <Text as="span" fontWeight="medium">On hand</Text>
              </div>
              
              <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {locations.map((loc, i) => (
                  <div key={loc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: i === locations.length - 1 ? 'none' : '1px solid #dfe3e8', opacity: loc.disabled ? 0.6 : 1 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                      <div style={{ marginTop: '2px' }}>
                        <Checkbox 
                          checked={loc.checked} 
                          disabled={loc.disabled}
                          onChange={(v) => {
                            const newLocs = [...locations];
                            const idx = newLocs.findIndex(l => l.id === loc.id);
                            newLocs[idx].checked = v;
                            setLocations(newLocs);
                          }} 
                        />
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {loc.app && <span style={{ backgroundColor: '#ebebeb', padding: '2px 6px', borderRadius: '4px', fontSize: '12px', color: '#5c5f62' }}>App</span>}
                          <Text as="span" color={loc.disabled ? "subdued" : undefined}>{loc.name}</Text>
                        </div>
                        {loc.subtitle && <Text as="p" color="subdued" variant="bodySm" style={{ marginTop: '4px' }}>{loc.subtitle}</Text>}
                      </div>
                    </div>
                    <Text as="span" color={loc.disabled ? "subdued" : undefined}>{loc.disabled ? '' : loc.quantity}</Text>
                  </div>
                ))}
              </div>
            </div>
          </Modal.Section>
        </Modal>
      )}
    </Page>
  );
}
