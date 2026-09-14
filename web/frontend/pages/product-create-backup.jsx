import React, { useState } from 'react';
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
  ButtonGroup
} from '@shopify/polaris';
import { TitleBar } from '@shopify/app-bridge-react';
import { useAuthenticatedFetch } from '../hooks';

export default function ProductCreate() {
  const navigate = useNavigate();
  const fetch = useAuthenticatedFetch();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [vendor, setVendor] = useState('');
  const [productType, setProductType] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('Draft');
  const [price, setPrice] = useState('0.00');
  const [compareAtPrice, setCompareAtPrice] = useState('0.00');
  const [costPerItem, setCostPerItem] = useState('0.00');
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [inventory, setInventory] = useState('0');
  const [continueSelling, setContinueSelling] = useState(false);
  const [weight, setWeight] = useState('0.00');
  const [countryOrigin, setCountryOrigin] = useState('Select country');
  const [hsCode, setHsCode] = useState('');
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [urlHandle, setUrlHandle] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/products/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          vendor,
          productType,
          category,
          status,
          price,
          compareAtPrice,
          costPerItem,
          sku,
          barcode,
          inventory,
          continueSelling,
          weight,
          countryOrigin,
          hsCode,
          seoTitle,
          seoDescription,
          urlHandle
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
    <Page fullWidth>
      <TitleBar 
        title="Add product" 
        primaryAction={{
          content: 'Save',
          onAction: handleSave,
        }}
        secondaryActions={[
          {
            content: 'Discard',
            onAction: () => navigate('/catalog'),
          },
        ]}
      />
      <Layout>
        <Layout.Section>
          <Stack vertical spacing="loose">
            <Card title="Title and description" sectioned>
              <FormLayout>
                <TextField
                  label="Title"
                  value={title}
                  onChange={setTitle}
                  placeholder="Enter product title"
                  autoComplete="off"
                />
                <TextField
                  label="Description"
                  value={description}
                  onChange={setDescription}
                  multiline={6}
                  placeholder="Write a detailed product description..."
                  autoComplete="off"
                />
              </FormLayout>
            </Card>

            <Card title="Media" sectioned>
              <DropZone onDrop={() => {}}>
                <DropZone.FileUpload actionHint="Accepts JPG, PNG, WEBP up to 10MB" />
              </DropZone>
            </Card>

            <Card title="Category" sectioned>
              <TextField
                label="Product category"
                value={category}
                onChange={setCategory}
                placeholder="Choose a product category"
                helpText="Determines tax rates and adds metafields to improve search, filters, and cross-channel sales"
                autoComplete="off"
              />
            </Card>

            <Card title="Pricing" sectioned>
              <FormLayout>
                <FormLayout.Group>
                  <TextField
                    label="Price"
                    type="number"
                    value={price}
                    onChange={setPrice}
                    prefix="USD"
                    autoComplete="off"
                  />
                  <TextField
                    label="Compare at price"
                    type="number"
                    value={compareAtPrice}
                    onChange={setCompareAtPrice}
                    prefix="USD"
                    autoComplete="off"
                  />
                  <TextField
                    label="Cost per item"
                    type="number"
                    value={costPerItem}
                    onChange={setCostPerItem}
                    prefix="USD"
                    autoComplete="off"
                  />
                </FormLayout.Group>
                <FormLayout.Group>
                  <TextField
                    label="Profit"
                    type="text"
                    value="--"
                    disabled
                    prefix="USD"
                    autoComplete="off"
                  />
                  <TextField
                    label="Margin"
                    type="text"
                    value="--"
                    disabled
                    suffix="%"
                    autoComplete="off"
                  />
                  <div />
                </FormLayout.Group>
              </FormLayout>
            </Card>

            <Card title="Inventory" sectioned>
              <FormLayout>
                <FormLayout.Group>
                  <TextField
                    label="SKU"
                    value={sku}
                    onChange={setSku}
                    placeholder="Enter SKU"
                    autoComplete="off"
                  />
                  <TextField
                    label="Barcode (ISBN, UPC, GTIN)"
                    value={barcode}
                    onChange={setBarcode}
                    placeholder="Enter barcode"
                    autoComplete="off"
                  />
                </FormLayout.Group>
                <FormLayout.Group>
                  <div style={{ marginTop: '24px' }}>
                    <Stack vertical spacing="tight">
                      <Checkbox label="Track quantity for this product" checked={true} onChange={() => {}} />
                      <Checkbox label="Continue selling when out of stock" checked={continueSelling} onChange={setContinueSelling} />
                    </Stack>
                  </div>
                  <TextField
                    label="Quantity"
                    type="number"
                    value={inventory}
                    onChange={setInventory}
                    autoComplete="off"
                  />
                </FormLayout.Group>
              </FormLayout>
            </Card>

            <Card title="Shipping" sectioned>
              <FormLayout>
                <Checkbox label="This is a physical product" checked={true} onChange={() => {}} />
                <div style={{ marginTop: '16px' }} />
                <FormLayout.Group>
                  <TextField
                    label="Weight"
                    type="number"
                    value={weight}
                    onChange={setWeight}
                    suffix="kg"
                    autoComplete="off"
                  />
                  <TextField
                    label="Dimensions (L x W x H)"
                    placeholder="0.00 x 0.00 x 0.00"
                    suffix="cm"
                    autoComplete="off"
                  />
                </FormLayout.Group>
                <FormLayout.Group>
                  <Select
                    label="Country/Region of origin"
                    options={['Select country', 'United States', 'Canada', 'United Kingdom', 'Australia']}
                    value={countryOrigin}
                    onChange={setCountryOrigin}
                  />
                  <TextField
                    label="Harmonized System (HS) code"
                    placeholder="Search by keyword or HS code"
                    value={hsCode}
                    onChange={setHsCode}
                    autoComplete="off"
                  />
                </FormLayout.Group>
              </FormLayout>
            </Card>

            <Card title="Variants" sectioned>
              <Stack distribution="equalSpacing" alignment="center">
                <Checkbox label="This product has variants (e.g., size, color)" checked={false} onChange={() => {}} />
                <Button>Add option</Button>
              </Stack>
            </Card>
            
            <Card title="Search engine listing" sectioned>
              <FormLayout>
                <TextField
                  label="Page title"
                  value={seoTitle}
                  onChange={setSeoTitle}
                  maxLength={70}
                  autoComplete="off"
                  showCharacterCount
                />
                <TextField
                  label="Meta description"
                  value={seoDescription}
                  onChange={setSeoDescription}
                  multiline={3}
                  maxLength={320}
                  autoComplete="off"
                  showCharacterCount
                />
                <TextField
                  label="URL handle"
                  value={urlHandle}
                  onChange={setUrlHandle}
                  autoComplete="off"
                />
              </FormLayout>
            </Card>
          </Stack>
        </Layout.Section>

        <Layout.Section secondary>
          <Stack vertical spacing="loose">
            <Card title="Status" sectioned>
              <Select
                label="Status"
                labelHidden
                options={[
                  { label: 'Draft', value: 'Draft' },
                  { label: 'Active', value: 'Active' },
                ]}
                value={status}
                onChange={setStatus}
              />
            </Card>

            <Card title="Publishing" sectioned>
              <Text as="p" fontWeight="medium">Sales channels</Text>
              <div style={{ marginTop: '12px' }}>
                <Stack vertical spacing="tight">
                  <Checkbox label="Online Store" checked={true} onChange={() => {}} />
                  <Checkbox label="Amazon" checked={false} onChange={() => {}} />
                  <Checkbox label="eBay" checked={false} onChange={() => {}} />
                  <Checkbox label="Walmart" checked={false} onChange={() => {}} />
                </Stack>
              </div>
            </Card>

            <Card title="Product organization" sectioned>
              <FormLayout>
                <Select
                  label="Product type"
                  options={['Select product type', 'Physical', 'Digital']}
                  value="Select product type"
                  onChange={() => {}}
                />
                <TextField
                  label="Vendor"
                  value={vendor}
                  onChange={setVendor}
                  placeholder="Enter or select vendor"
                  autoComplete="off"
                />
                <TextField
                  label="Collections"
                  placeholder="Search or select collections"
                  autoComplete="off"
                />
                <TextField
                  label="Tags"
                  placeholder="Enter tags"
                  helpText="Press Enter to add multiple tags"
                  autoComplete="off"
                />
              </FormLayout>
            </Card>

            <Card title="Theme template" sectioned>
              <Select
                label="Template"
                options={['Default product']}
                value="Default product"
                onChange={() => {}}
              />
            </Card>
          </Stack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
