import { useState } from "react";
import { Button, Card, Layout, Page, Stack, Text, Toast } from "@shopify/polaris";
import { TitleBar, useAuthenticatedFetch } from "@shopify/app-bridge-react";
import { useNavigate } from "react-router-dom";
import { useStoreTimezone } from "../utils/storeTimezone";
import { formatDateTime } from "../utils/timezone";

export default function Export() {
  const timeZone = useStoreTimezone();
  const fetch = useAuthenticatedFetch();
  const navigate = useNavigate();
  const [isExporting, setIsExporting] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [format, setFormat] = useState('csv');
  const [recentJobs, setRecentJobs] = useState(() => {
    try { return JSON.parse(localStorage.getItem('recent_exports') || '[]'); } catch { return []; }
  });

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
      const newJob = { id: Date.now(), format, date: formatDateTime(new Date().toISOString(), timeZone), name: `products-export.${format}` };
      const updatedJobs = [newJob, ...recentJobs].slice(0, 5);
      setRecentJobs(updatedJobs);
      localStorage.setItem('recent_exports', JSON.stringify(updatedJobs));
    } catch (err) {
      setToastMsg("Failed to start export");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Page title="Export" backAction={{ content: "Dashboard", onAction: () => navigate("/") }}>
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
      </Layout>
    </Page>
  );
}