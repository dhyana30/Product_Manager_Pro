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
  ButtonGroup,
  Icon,
} from '@shopify/polaris';
import { CirclePlusMinor, EditMinor } from '@shopify/polaris-icons';
import { TitleBar } from '@shopify/app-bridge-react';
import { useAuthenticatedFetch } from '../hooks';

export default function ProductCreate() {
  const navigate = useNavigate();
  const fetch = useAuthenticatedFetch();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [vendor, setVendor] = useState('None');
  const [productType, setProductType] = useState('None');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('Active');
  const [price, setPrice] = useState('0.00');
  const [sku, setSku] = useState('');
  const [weight, setWeight] = useState('0.0');
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
          sku,
          weight,
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
                <TextField
                  label="Description"
                  value={description}
                  onChange={setDescription}
                  multiline={6}
                  autoComplete="off"
                />
              </FormLayout>
            </Card>

            <Card title="Media" sectioned>
              <DropZone onDrop={() => {}}>
                <DropZone.FileUpload actionHint="Accepts images, videos, or 3D models" />
              </DropZone>
            </Card>

            <Card title="Category" sectioned>
              <TextField
                labelHidden
                label="Product category"
                value={category}
                onChange={setCategory}
                placeholder="Choose a product category"
                helpText="Determines tax rates and adds metafields to improve search, filters, and cross-channel sales"
                autoComplete="off"
              />
            </Card>

            <Card title="Price" sectioned>
              <FormLayout>
                <TextField
                  labelHidden
                  label="Price"
                  type="number"
                  value={price}
                  onChange={setPrice}
                  prefix="$"
                  autoComplete="off"
                />
                <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
                  <Button>Compare-at</Button>
                  <Button>Unit price</Button>
                  <Button>Charge tax Yes</Button>
                  <Button>Cost per item</Button>
                </div>
              </FormLayout>
            </Card>

            <Card title="Inventory" sectioned>
              <div style={{ marginBottom: '16px' }}>
                <Stack distribution="equalSpacing" alignment="center">
                  <Text as="p" fontWeight="bold">Inventory</Text>
                  <Checkbox label="Inventory tracked" checked={true} onChange={() => {}} />
                </Stack>
              </div>
              <FormLayout>
                <Stack distribution="equalSpacing">
                  <Text as="p" color="subdued">Quantity</Text>
                  <Text as="p" color="subdued">Quantity</Text>
                </Stack>
                
                {[
                  'depot 1',
                  'depot 2',
                  'depot 3',
                  'My Custom Location',
                  'Shop',
                  'Shop location'
                ].map((loc) => (
                  <Stack key={loc} distribution="equalSpacing" alignment="center">
                    <Text as="p">{loc}</Text>
                    <div style={{ width: '100px' }}>
                      <TextField type="number" value="0" onChange={() => {}} autoComplete="off" />
                    </div>
                  </Stack>
                ))}
                
                <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
                  <Button>SKU</Button>
                  <Button>Barcodes</Button>
                  <Button>Sell when out of stock Off</Button>
                </div>
              </FormLayout>
            </Card>

            <Card title="Shipping" sectioned>
              <div style={{ marginBottom: '16px' }}>
                <Stack distribution="equalSpacing" alignment="center">
                  <Text as="p" fontWeight="bold">Shipping</Text>
                  <Checkbox label="Physical product" checked={true} onChange={() => {}} />
                </Stack>
              </div>
              <FormLayout>
                <FormLayout.Group>
                  <Select
                    label="Package"
                    options={['Store default - Sample box - 22 x 13.7 x 4.2 cm, 0 kg']}
                    value={'Store default - Sample box - 22 x 13.7 x 4.2 cm, 0 kg'}
                    onChange={() => {}}
                  />
                  <TextField
                    label="Product weight"
                    type="number"
                    value={weight}
                    onChange={setWeight}
                    suffix="kg"
                    autoComplete="off"
                  />
                </FormLayout.Group>
                <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
                  <Button>Country of origin</Button>
                  <Button>HS Code</Button>
                </div>
              </FormLayout>
            </Card>

            <Card title="Variants" sectioned>
              <Button plain icon={CirclePlusMinor}>Add options like size or color</Button>
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
    </Page>
  );
}
