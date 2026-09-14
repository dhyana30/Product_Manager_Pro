import { Button, Card, Layout, Page, Stack, Text } from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";

export default function Export() {
  return <Page fullWidth><TitleBar title="Export" primaryAction={{ content: "Export catalog", onAction: () => {} }} /><Layout><Layout.Section><div style={{ marginTop: 20 }}><Card title="Catalog export" sectioned><Stack vertical><Text as="p">Generate a CSV or XLSX snapshot of products, variants, inventory, and SEO metadata.</Text><Button primary>Start export</Button></Stack></Card></div></Layout.Section><Layout.Section secondary><Card title="Recent jobs" sectioned><Text as="p">No exports are running.</Text><Text as="p" color="subdued">Completed files remain available for 24 hours.</Text></Card></Layout.Section></Layout></Page>;
}
