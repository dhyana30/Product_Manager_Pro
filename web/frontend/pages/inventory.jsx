import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Badge, Button, Card, Layout, Page, Stack, Text, TextField } from "@shopify/polaris";
import { TitleBar, useAuthenticatedFetch } from "@shopify/app-bridge-react";
import { OperationsTable } from "../components";

export default function Inventory() {
  const navigate = useNavigate();
  const fetch = useAuthenticatedFetch();
  const [query, setQuery] = useState("");
  const [inventory, setInventory] = useState([]);
  
  useEffect(() => {
    async function loadInventory() {
      try {
        const response = await fetch('/api/inventory');
        if (response.ok) {
          const json = await response.json();
          const mapped = json.data.map(item => {
            const avail = parseInt(item.available, 10);
            let state = { label: "Healthy", status: "success" };
            if (avail <= 0) state = { label: "Out of stock", status: "critical" };
            else if (avail <= 10) state = { label: "Low stock", status: "warning" };
            
            return {
              ...item,
              state
            };
          });
          setInventory(mapped);
        }
      } catch (e) {
        console.error("Failed to load inventory", e);
      }
    }
    loadInventory();
  }, [fetch]);

  const rows = inventory.filter((item) => `${item.product} ${item.sku} ${item.location}`.toLowerCase().includes(query.toLowerCase()));
  const lowStockCount = inventory.filter(i => parseInt(i.available, 10) <= 10).length;

  return (
    <Page backAction={{ content: "Dashboard", onAction: () => navigate("/") }} fullWidth>
      <TitleBar title="Inventory" primaryAction={{ content: "Adjust inventory", onAction: () => {} }} />
      <Layout>
        <Layout.Section>
          <Stack distribution="equalSpacing" alignment="center">
            <Button>Transfer stock</Button>
          </Stack>
          <div style={{ margin: "16px 0" }}>
            <Card sectioned>
              <TextField label="Search inventory" labelHidden value={query} onChange={setQuery} autoComplete="off" placeholder="Search products, SKUs, or locations" />
            </Card>
          </div>
          <OperationsTable 
            title={`${rows.length} inventory records`} 
            resourceName={{ singular: "record", plural: "records" }} 
            columns={[{ title: "Product", key: "product" }, { title: "SKU", key: "sku" }, { title: "Location", key: "location" }, { title: "Available", key: "available" }, { title: "State", key: "state", badge: true }]} 
            rows={rows} 
          />
        </Layout.Section>
        <Layout.Section secondary>
          <Card title="Stock overview" sectioned>
            <Stack vertical>
              <Text as="p">{lowStockCount} low-stock items</Text>
              <Badge status="warning">Threshold: 10 units</Badge>
              <Button plain>View transfer history</Button>
            </Stack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
