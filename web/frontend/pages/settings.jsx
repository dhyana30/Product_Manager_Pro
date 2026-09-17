import { useNavigate } from "react-router-dom";
import React, { useState } from "react";
import * as XLSX from "xlsx";
import {
  Page,
  Card,
  Layout,
  Stack,
  Text,
  Select,
  Button,
  Checkbox,
  FormLayout,
  Icon,
  Badge,
  TextField
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import {
  SettingsMinor,
  StoreMinor,
  RefreshMinor,
  NotificationMajor,
  ExportMinor,
  PlusMinor,
  ChevronRightMinor
} from "@shopify/polaris-icons";
import { useAuthenticatedFetch } from "../hooks/useAuthenticatedFetch";

const RESPONSIVE_CSS = `
  .settings-container {
    display: flex;
    min-height: 400px;
  }
  .settings-sidebar {
    width: 220px;
    border-right: 1px solid #dfe3e8;
    flex-shrink: 0;
    background: #f9fafb;
    padding: 12px 0;
  }
  .settings-nav-item {
    display: flex;
    align-items: center;
    padding: 10px 16px;
    cursor: pointer;
    color: #202223;
    text-decoration: none;
    border-left: 3px solid transparent;
  }
  .settings-nav-item:hover {
    background: #f4f6f8;
  }
  .settings-nav-item.active {
    background: #ffffff;
    border-left: 3px solid #000;
    font-weight: 600;
  }
  .settings-nav-icon {
    margin-right: 12px;
    color: #5c5f62;
  }
  .settings-nav-item.active .settings-nav-icon {
    color: #202223;
  }
  .settings-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    background: #ffffff;
  }
  .settings-header {
    padding: 16px 24px;
    border-bottom: 1px solid #dfe3e8;
  }
  .settings-body {
    padding: 24px;
    flex: 1;
  }
  .settings-footer {
    padding: 16px 24px;
    border-top: 1px solid #dfe3e8;
    display: flex;
    justify-content: flex-end;
  }
  
  .summary-card {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px;
    cursor: pointer;
    background: #ffffff;
    border-radius: 8px;
    box-shadow: 0 0 0 1px rgba(63, 63, 68, 0.05), 0 1px 3px 0 rgba(63, 63, 68, 0.15);
    margin-bottom: 12px;
  }
  .summary-card:hover {
    background: #f9fafb;
  }
  .summary-right {
    display: flex;
    align-items: center;
    gap: 12px;
    color: #5c5f62;
  }
`;

export default function Settings() {
  const navigate = useNavigate();
  const fetch = useAuthenticatedFetch();
  const [selectedMenu, setSelectedMenu] = useState("general");

  // General State
  const [rowsPerPage, setRowsPerPage] = useState("20");
  const [tableDensity, setTableDensity] = useState("Comfortable");
  const [defaultSorting, setDefaultSorting] = useState("Updated date (newest first)");
  const [keepHeadersVisible, setKeepHeadersVisible] = useState(true);

  // Sync State
  const [syncFrequency, setSyncFrequency] = useState("Every hour");
  const [enableAutomaticSync, setEnableAutomaticSync] = useState(false);

  // Export State
  const [exportFormat, setExportFormat] = useState("CSV");
  const [includeImages, setIncludeImages] = useState(true);
  const [includeVariants, setIncludeVariants] = useState(true);

  // Notifications State
  const [emailNotif, setEmailNotif] = useState(true);
  const [inAppNotif, setInAppNotif] = useState(true);
  const [lowInventoryAlerts, setLowInventoryAlerts] = useState(true);
  const [syncSummaries, setSyncSummaries] = useState(true);

  const handleSave = () => {
    console.log("Saving settings...");
  };

  const handleExport = async () => {
    try {
      const isExcel = exportFormat.toLowerCase().includes('excel');
      const params = new URLSearchParams({
        format: 'csv', // Backend always sends CSV, we convert it for excel
        include_images: includeImages.toString(),
        include_variants: includeVariants.toString()
      });

      const response = await fetch(`/api/export?${params.toString()}`);
      if (!response.ok) throw new Error('Export failed');

      if (isExcel) {
        const csvText = await response.text();
        const workbook = XLSX.read(csvText, { type: 'string' });
        XLSX.writeFile(workbook, `products-export-${new Date().toISOString().split('T')[0]}.xlsx`);
      } else {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `products-export-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error(err);
      // Fallback alert if app bridge toast isn't available
      alert('Export failed. Please try again.');
    }
  };

  const menuItems = [
    { id: "general", label: "General", icon: SettingsMinor, subtitle: "Manage preferences for this section." },
    { id: "connection", label: "Shopify connection", icon: StoreMinor, subtitle: "Manage your Shopify store connection." },
    { id: "sync", label: "Sync preferences", icon: RefreshMinor, subtitle: "Manage preferences for this section." },
    { id: "export", label: "Export", icon: ExportMinor, subtitle: "Configure export formats and options." }
  ];

  const activeItem = menuItems.find(m => m.id === selectedMenu) || menuItems[0];

  const renderSidebar = () => (
    <div className="settings-sidebar">
      {menuItems.map((item) => (
        <div
          key={item.id}
          className={`settings-nav-item ${selectedMenu === item.id ? "active" : ""}`}
          onClick={() => setSelectedMenu(item.id)}
        >
          <div className="settings-nav-icon">
            <Icon source={item.icon} />
          </div>
          <Text as="span" variant="bodyMd">
            {item.label}
          </Text>
        </div>
      ))}
    </div>
  );

  const renderContent = () => {
    switch (selectedMenu) {
      case "general":
        return (
          <FormLayout>
            <FormLayout.Group>
              <Select
                label="Rows per page"
                options={["10", "20", "50", "100"]}
                value={rowsPerPage}
                onChange={setRowsPerPage}
              />
            </FormLayout.Group>
            <FormLayout.Group>
              <Select
                label="Table density"
                options={["Comfortable", "Compact"]}
                value={tableDensity}
                onChange={setTableDensity}
              />
              <Select
                label="Default sorting"
                options={["Updated date (newest first)", "Updated date (oldest first)", "A-Z"]}
                value={defaultSorting}
                onChange={setDefaultSorting}
              />
            </FormLayout.Group>
            <div style={{ marginTop: 8 }}>
              <Checkbox
                label="Keep table headers visible while scrolling"
                checked={keepHeadersVisible}
                onChange={setKeepHeadersVisible}
              />
            </div>
          </FormLayout>
        );
      case "sync":
        return (
          <FormLayout>
            <FormLayout.Group>
              <Select
                label="Sync frequency"
                options={["Every hour", "Daily", "Weekly", "Manual"]}
                value={syncFrequency}
                onChange={setSyncFrequency}
              />
              <div style={{ paddingTop: 28 }}>
                <Checkbox
                  label="Enable automatic synchronization"
                  checked={enableAutomaticSync}
                  onChange={setEnableAutomaticSync}
                />
              </div>
            </FormLayout.Group>
          </FormLayout>
        );
      case "connection":
        return (
          <FormLayout>
            <TextField
              label="Connected Store"
              value="demo1-demo.myshopify.com"
              disabled
              autoComplete="off"
            />
            <TextField
              label="API Version"
              value="2026-07"
              disabled
              autoComplete="off"
            />
            <TextField
              label="Connection Status"
              value="Connected"
              disabled
              autoComplete="off"
            />
            <TextField
              label="Last Sync"
              value="8/24/2026, 5:40:04 PM"
              disabled
              autoComplete="off"
            />
          </FormLayout>
        );
      case "export":
        return (
          <FormLayout>
            <FormLayout.Group>
              <Select
                label="Default export format"
                options={["CSV", "Excel (XLSX)"]}
                value={exportFormat}
                onChange={setExportFormat}
              />
            </FormLayout.Group>
            <div style={{ paddingTop: 12 }}>
              <Stack vertical spacing="tight">
                <Checkbox
                  label="Include product images in exports"
                  checked={includeImages}
                  onChange={setIncludeImages}
                />
                <Checkbox
                  label="Include variant details in exports"
                  checked={includeVariants}
                  onChange={setIncludeVariants}
                />
              </Stack>
            </div>
            <div style={{ paddingTop: 16 }}>
              <Button primary onClick={handleExport}>
                Start export
              </Button>
            </div>
          </FormLayout>
        );
      default:
        return null;
    }
  };

  const renderSummaryCard = (title, subtitle, statusValue, onClickMenuId) => {
    // Determine tone based on the mock screenshots. They are just text in screenshots actually, wait!
    // In screenshots, "Connected" doesn't have a green background, it's just gray text or standard text. 
    // I'll just use plain text with a secondary color to exactly match screenshot.
    return (
      <div className="summary-card" onClick={() => setSelectedMenu(onClickMenuId)}>
        <div>
          <Text as="p" fontWeight="semibold">{title}</Text>
          <Text as="p" color="subdued" variant="bodySm">{subtitle}</Text>
        </div>
        <div className="summary-right">
          <Badge status="new">{statusValue}</Badge>
          <Icon source={ChevronRightMinor} />
        </div>
      </div>
    );
  };

  return (
    <Page>
      <TitleBar title="Settings" />
      <style>{RESPONSIVE_CSS}</style>
      
      <div style={{ marginBottom: 16 }}>
        <Text as="p" color="subdued">Configure Product Manager Pro preferences.</Text>
      </div>

      <Layout>
        <Layout.Section>
          {/* Main Card Layout */}
          <div style={{ 
            borderRadius: 8, 
            background: "#fff", 
            boxShadow: "0 0 0 1px rgba(63, 63, 68, 0.05), 0 1px 3px 0 rgba(63, 63, 68, 0.15)",
            overflow: "hidden",
            marginBottom: 20
          }}>
            <div className="settings-container">
              {renderSidebar()}
              
              <div className="settings-content">
                <div className="settings-header">
                  <Text as="h2" variant="headingMd">{activeItem.label}</Text>
                  <div style={{ marginTop: 4 }}>
                    <Text as="p" color="subdued">{activeItem.subtitle}</Text>
                  </div>
                </div>
                
                <div className="settings-body">
                  <div style={{ maxWidth: 800 }}>
                    {renderContent()}
                  </div>
                </div>
                
                <div className="settings-footer">
                  <Button primary onClick={handleSave}>Save settings</Button>
                </div>
              </div>
            </div>
          </div>

          {/* Summary Cards */}
          {renderSummaryCard("Shopify connection", "demo1-demo.myshopify.com", "Connected", "connection")}
          {renderSummaryCard("Sync preferences", "Direction: from shopify", "Manual", "sync")}
          
        </Layout.Section>
      </Layout>
    </Page>
  );
}
