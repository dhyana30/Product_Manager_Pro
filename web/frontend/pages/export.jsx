import { useState } from "react";
import { Button, Card, Layout, Page, Stack, Text, Toast } from "@shopify/polaris";
import { TitleBar, useAuthenticatedFetch } from "@shopify/app-bridge-react";

export default function Export() {
  const fetch = useAuthenticatedFetch();
  const [isExporting, setIsExporting] = useState(false);
  const [toastMsg, setToastMsg] = useState("");

  const [format, setFormat] = useState('csv');

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const response = await fetch(`/api/export?format=${format}&include_images=true&include_variants=true`);
      if (!response.ok) throw new Error("Export failed");
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `products-export.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      
      setToastMsg("Export completed successfully");
    } catch (err) {
      setToastMsg("Failed to start export");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Page fullWidth>
      <TitleBar title="Export" primaryAction={{ content: "Export catalog", onAction: handleExport, loading: isExporting }} />
      {toastMsg && <Toast content={toastMsg} onDismiss={() => setToastMsg("")} />}
      <Layout>
        <Layout.Section>
          <div style={{ marginTop: 20 }}>
            <Card title="Catalog export" sectioned>
              <Stack vertical>
                <Text as="p">Generate a snapshot of products, variants, inventory, and SEO metadata.</Text>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                    <input type="radio" name="format" value="csv" checked={format === 'csv'} onChange={() => setFormat('csv')} />
                    CSV (Plain Text)
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                    <input type="radio" name="format" value="xlsx" checked={format === 'xlsx'} onChange={() => setFormat('xlsx')} />
                    XLSX (Excel)
                  </label>
                </div>
                <Button primary loading={isExporting} onClick={handleExport}>Start export</Button>
              </Stack>
            </Card>
          </div>
        </Layout.Section>
        <Layout.Section secondary>
          <Card title="Recent jobs" sectioned>
            <Text as="p">No exports are running.</Text>
            <Text as="p" color="subdued">Completed files remain available for 24 hours.</Text>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}