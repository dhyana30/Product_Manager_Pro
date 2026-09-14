import { useState } from "react";
import { Badge, Button, Card, Layout, Page, Stack, Text, TextField } from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { OperationsTable } from "../components";

const inventory = [
  { id: 1, product: "Everyday Canvas Tote", sku: "TOTE-001", location: "Main warehouse", available: "128", state: { label: "Healthy", status: "success" } },
  { id: 2, product: "Studio Ceramic Mug", sku: "MUG-014", location: "Main warehouse", available: "42", state: { label: "Healthy", status: "success" } },
  { id: 3, product: "Linen Market Apron", sku: "APR-203", location: "Main warehouse", available: "0", state: { label: "Out of stock", status: "critical" } },
  { id: 4, product: "Recycled Wool Throw", sku: "THR-088", location: "Eastside pop-up", available: "4", state: { label: "Low stock", status: "warning" } },
];

export default function Inventory() {
  const [query, setQuery] = useState("");
  const rows = inventory.filter((item) => `${item.product} ${item.sku} ${item.location}`.toLowerCase().includes(query.toLowerCase()));
  return <Page fullWidth><TitleBar title="Inventory" primaryAction={{ content: "Adjust inventory", onAction: () => {} }} /><Layout><Layout.Section><Stack distribution="equalSpacing" alignment="center"><Button>Transfer stock</Button></Stack><div style={{ margin: "16px 0" }}><Card sectioned><TextField label="Search inventory" labelHidden value={query} onChange={setQuery} autoComplete="off" placeholder="Search products, SKUs, or locations" /></Card></div><OperationsTable title={`${rows.length} inventory records`} resourceName={{ singular: "record", plural: "records" }} columns={[{ title: "Product", key: "product" }, { title: "SKU", key: "sku" }, { title: "Location", key: "location" }, { title: "Available", key: "available" }, { title: "State", key: "state", badge: true }]} rows={rows} /></Layout.Section><Layout.Section secondary><Card title="Stock overview" sectioned><Stack vertical><Text as="p">23 low-stock items</Text><Badge status="warning">Threshold: 10 units</Badge><Button plain>View transfer history</Button></Stack></Card></Layout.Section></Layout></Page>;
}
