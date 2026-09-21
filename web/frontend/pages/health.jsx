import { useState } from "react";
import {
  Page,
  Card,
  Text,
  Button,
  Divider,
  Badge,
  IndexTable,
  TextField,
  ButtonGroup,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { useNavigate } from "react-router-dom";

export default function HealthDetails() {
  const navigate = useNavigate();
  const [selectedTab, setSelectedTab] = useState("all");
  const [searchValue, setSearchValue] = useState("");

  const affectedProducts = [
    {
      id: 1,
      title: "Aria Ceramic Mug — Sand",
      sku: "SKU-10234",
      issue: "Missing product image",
      severity: "Critical",
      status: "Open",
    },
    {
      id: 2,
      title: "Linen Throw Blanket, Ivory",
      sku: "SKU-10298",
      issue: "Description under 40 words",
      severity: "Warning",
      status: "Open",
    },
    {
      id: 3,
      title: "Oak Bookshelf — 5 Tier",
      sku: "SKU-10199",
      issue: "Duplicate SKU detected",
      severity: "Warning",
      status: "In review",
    },
    {
      id: 4,
      title: "Wool Throw Pillow, Charcoal",
      sku: "SKU-10312",
      issue: "Not mapped to category",
      severity: "Info",
      status: "Open",
    },
    {
      id: 5,
      title: "Glass Carafe Set",
      sku: "SKU-10256",
      issue: "Missing product image",
      severity: "Critical",
      status: "Open",
    },
  ];

  return (
    <Page
      title="Catalog Health"
      subtitle="A breakdown of the checks behind your score, what's failing, and which products are affected — last scanned 10:15 AM."
      backAction={{ content: "Dashboard", onAction: () => navigate("/") }}
      primaryAction={{ content: "Re-run health scan" }}
      secondaryActions={[{ content: "Export report" }]}
      fullWidth
    >
      <TitleBar title="Catalog Health" />
      <style>{CSS}</style>

      {/* Top Grid */}
      <div className="health-grid" style={{ marginBottom: "24px" }}>
        {/* Main Score Card */}
        <div className="stretch-card-container">
          <Card>
            <div className="score-card-content" style={{ height: "100%" }}>
            <HealthRing value={46} />
            <div style={{ marginTop: "24px" }}>
              <Text as="h2" variant="headingMd" color="warning">
                Needs attention
              </Text>
              <div style={{ marginTop: "4px" }}>
                <Text as="p" color="subdued" variant="bodySm">
                  54 products below standard
                </Text>
              </div>
            </div>
            <div
              style={{
                marginTop: "16px",
                marginBottom: "24px",
                maxWidth: "240px",
              }}
            >
              <Text as="p" color="subdued">
                Keep going — 46% of your catalog meets quality and completeness
                standards.
              </Text>
            </div>
            <Button plain>↻ Re-run scan</Button>
          </div>
        </Card>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Mini Cards Row */}
          <div className="mini-cards-row">
            <div className="stretch-card-container">
              <Card>
                <div style={{ padding: "16px", height: "100%", display: "flex", flexDirection: "column" }}>
                  <Text as="p" color="subdued" variant="bodyMd">
                    Week over week
                  </Text>
                  <div style={{ margin: "4px 0", flexGrow: 1 }}>
                    <Text as="p" variant="headingXl" color="critical">
                      ↓ 3 pts
                    </Text>
                  </div>
                  <div>
                    <Text as="p" color="subdued" variant="bodySm">
                      was 49 last Monday
                    </Text>
                  </div>
                </div>
              </Card>
            </div>
            <div className="stretch-card-container">
              <Card>
                <div style={{ padding: "16px", height: "100%", display: "flex", flexDirection: "column" }}>
                  <Text as="p" color="subdued" variant="bodyMd">
                    Checks passing
                  </Text>
                  <div style={{ margin: "4px 0", flexGrow: 1 }}>
                    <Text as="p" variant="headingXl">
                      2/6
                    </Text>
                  </div>
                  <div>
                    <Text as="p" color="subdued" variant="bodySm">
                      4 need attention
                    </Text>
                  </div>
                </div>
              </Card>
            </div>
            <div className="stretch-card-container">
              <Card>
                <div style={{ padding: "16px", height: "100%", display: "flex", flexDirection: "column" }}>
                  <Text as="p" color="subdued" variant="bodyMd">
                    Resolved this week
                  </Text>
                  <div style={{ margin: "4px 0", flexGrow: 1 }}>
                    <Text as="p" variant="headingXl" color="success">
                      12
                    </Text>
                  </div>
                  <div>
                    <Text as="p" color="subdued" variant="bodySm">
                      keep the streak going
                    </Text>
                  </div>
                </div>
              </Card>
            </div>
          </div>

          <div className="stretch-card-container" style={{ flexGrow: 1, minHeight: 0 }}>
            <Card>
              <div style={{ padding: "16px", height: "100%", display: "flex", flexDirection: "column" }}>
                <div style={{ marginBottom: "16px" }}>
                  <Text as="h3" variant="headingMd">
                    Fix these first for the biggest score lift
                  </Text>
                </div>
                <div className="fix-list" style={{ flexGrow: 1 }}>
                <div className="fix-item">
                  <div className="fix-left">
                    <span className="dot red"></span>
                    <Text as="p" fontWeight="medium">Missing product images</Text>
                  </div>
                  <Text as="p" color="subdued" variant="bodySm">24 products · 25% weight</Text>
                </div>
                <Divider />
                <div className="fix-item">
                  <div className="fix-left">
                    <span className="dot red"></span>
                    <Text as="p" fontWeight="medium">Incomplete descriptions</Text>
                  </div>
                  <Text as="p" color="subdued" variant="bodySm">17 products · 20% weight</Text>
                </div>
                <Divider />
                <div className="fix-item">
                  <div className="fix-left">
                    <span className="dot orange"></span>
                    <Text as="p" fontWeight="medium">Missing categories</Text>
                  </div>
                  <Text as="p" color="subdued" variant="bodySm">11 products · 15% weight</Text>
                </div>
              </div>
            </div>
          </Card>
          </div>
        </div>
      </div>

      {/* Issue Counts */}
      <div className="section-header">
        <Text as="h2" variant="headingLg">Issue counts</Text>
        <Text as="p" color="subdued">Across all active checks</Text>
      </div>
      <div className="issue-counts-grid" style={{ marginBottom: "32px" }}>
        <div className="stretch-card-container">
          <Card>
            <div className="issue-card" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
              <div className="issue-header">
                <Text as="p" color="subdued">Critical</Text>
                <div className="icon-badge red">!</div>
              </div>
              <div style={{ margin: "4px 0", flexGrow: 1 }}>
                <Text as="p" variant="heading2xl">18</Text>
              </div>
              <div>
                <Text as="p" color="subdued" variant="bodySm">Blocking — fix first</Text>
              </div>
            </div>
          </Card>
        </div>
        <div className="stretch-card-container">
          <Card>
            <div className="issue-card" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
              <div className="issue-header">
                <Text as="p" color="subdued">Warning</Text>
                <div className="icon-badge orange">▲</div>
              </div>
              <div style={{ margin: "4px 0", flexGrow: 1 }}>
                <Text as="p" variant="heading2xl">27</Text>
              </div>
              <div>
                <Text as="p" color="subdued" variant="bodySm">Degrades listing quality</Text>
              </div>
            </div>
          </Card>
        </div>
        <div className="stretch-card-container">
          <Card>
            <div className="issue-card" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
              <div className="issue-header">
                <Text as="p" color="subdued">Info</Text>
                <div className="icon-badge purple">i</div>
              </div>
              <div style={{ margin: "4px 0", flexGrow: 1 }}>
                <Text as="p" variant="heading2xl">9</Text>
              </div>
              <div>
                <Text as="p" color="subdued" variant="bodySm">Nice to resolve</Text>
              </div>
            </div>
          </Card>
        </div>
        <div className="stretch-card-container">
          <Card>
            <div className="issue-card" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
              <div className="issue-header">
                <Text as="p" color="subdued">Resolved this week</Text>
                <div className="icon-badge green">✓</div>
              </div>
              <div style={{ margin: "4px 0", flexGrow: 1 }}>
                <Text as="p" variant="heading2xl">12</Text>
              </div>
              <div>
                <Text as="p" color="subdued" variant="bodySm">Keep the streak going</Text>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Health Checks Table */}
      <div className="section-header">
        <Text as="h2" variant="headingLg">Health checks</Text>
        <Text as="p" color="subdued">6 checks · weighted toward score</Text>
      </div>
      <div style={{ marginBottom: "32px" }}>
        <Card padding="0">
          <div className="custom-table">
            <div className="ct-header">
              <span className="ct-col-main"><Text as="span" color="subdued" variant="bodySm">CHECK</Text></span>
              <span className="ct-col-weight"><Text as="span" color="subdued" variant="bodySm">WEIGHT</Text></span>
              <span className="ct-col-affected"><Text as="span" color="subdued" variant="bodySm">AFFECTED</Text></span>
              <span className="ct-col-action"></span>
            </div>
            <Divider />
            
            <div className="ct-row">
              <div className="ct-col-main">
                <div className="check-icon-wrapper red">✕</div>
                <div>
                  <Text as="p" fontWeight="bold">Missing product images</Text>
                  <Text as="p" color="subdued" variant="bodySm">At least one image required per listing</Text>
                </div>
              </div>
              <div className="ct-col-weight"><Text as="span">25% of score</Text></div>
              <div className="ct-col-affected">
                <Text as="p" fontWeight="bold">24 products</Text>
                <Text as="p" color="subdued" variant="bodySm">of 102</Text>
              </div>
              <div className="ct-col-action"><Button plain>Fix all →</Button></div>
            </div>
            <Divider />
            
            <div className="ct-row">
              <div className="ct-col-main">
                <div className="check-icon-wrapper red">✕</div>
                <div>
                  <Text as="p" fontWeight="bold">Incomplete descriptions</Text>
                  <Text as="p" color="subdued" variant="bodySm">Under 40 words or missing key attributes</Text>
                </div>
              </div>
              <div className="ct-col-weight"><Text as="span">20% of score</Text></div>
              <div className="ct-col-affected">
                <Text as="p" fontWeight="bold">17 products</Text>
                <Text as="p" color="subdued" variant="bodySm">of 102</Text>
              </div>
              <div className="ct-col-action"><Button plain>Fix all →</Button></div>
            </div>
            <Divider />

            <div className="ct-row">
              <div className="ct-col-main">
                <div className="check-icon-wrapper orange">▲</div>
                <div>
                  <Text as="p" fontWeight="bold">Duplicate SKUs</Text>
                  <Text as="p" color="subdued" variant="bodySm">Same SKU used across multiple listings</Text>
                </div>
              </div>
              <div className="ct-col-weight"><Text as="span">15% of score</Text></div>
              <div className="ct-col-affected">
                <Text as="p" fontWeight="bold">6 products</Text>
                <Text as="p" color="subdued" variant="bodySm">of 102</Text>
              </div>
              <div className="ct-col-action"><span className="review-link">Review →</span></div>
            </div>
            <Divider />

            <div className="ct-row">
              <div className="ct-col-main">
                <div className="check-icon-wrapper orange">▲</div>
                <div>
                  <Text as="p" fontWeight="bold">Missing categories</Text>
                  <Text as="p" color="subdued" variant="bodySm">Not mapped to a storefront category</Text>
                </div>
              </div>
              <div className="ct-col-weight"><Text as="span">15% of score</Text></div>
              <div className="ct-col-affected">
                <Text as="p" fontWeight="bold">11 products</Text>
                <Text as="p" color="subdued" variant="bodySm">of 102</Text>
              </div>
              <div className="ct-col-action"><span className="review-link">Review →</span></div>
            </div>
            <Divider />

            <div className="ct-row">
              <div className="ct-col-main">
                <div className="check-icon-wrapper green">✓</div>
                <div>
                  <Text as="p" fontWeight="bold">Pricing completeness</Text>
                  <Text as="p" color="subdued" variant="bodySm">Valid price set for every active variant</Text>
                </div>
              </div>
              <div className="ct-col-weight"><Text as="span">15% of score</Text></div>
              <div className="ct-col-affected">
                <Text as="p" fontWeight="bold">0 products</Text>
                <Text as="p" color="subdued" variant="bodySm">of 102</Text>
              </div>
              <div className="ct-col-action"><Text as="span" color="subdued">Passing</Text></div>
            </div>
            <Divider />

            <div className="ct-row">
              <div className="ct-col-main">
                <div className="check-icon-wrapper green">✓</div>
                <div>
                  <Text as="p" fontWeight="bold">SEO title length</Text>
                  <Text as="p" color="subdued" variant="bodySm">Title between 20–70 characters</Text>
                </div>
              </div>
              <div className="ct-col-weight"><Text as="span">10% of score</Text></div>
              <div className="ct-col-affected">
                <Text as="p" fontWeight="bold">3 products</Text>
                <Text as="p" color="subdued" variant="bodySm">of 102</Text>
              </div>
              <div className="ct-col-action"><Text as="span" color="subdued">Passing</Text></div>
            </div>

          </div>
        </Card>
      </div>

      {/* Affected Products Table */}
      <div className="section-header">
        <Text as="h2" variant="headingLg">Affected products</Text>
        <Text as="p" color="subdued">54 products with at least one open issue</Text>
      </div>
      
      <Card padding="0">
        <div style={{ padding: "16px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
          <div className="custom-tabs">
            <button className={`custom-tab ${selectedTab === 'all' ? 'active' : ''}`} onClick={() => setSelectedTab('all')}>All (54)</button>
            <button className={`custom-tab ${selectedTab === 'critical' ? 'active' : ''}`} onClick={() => setSelectedTab('critical')}>Critical (18)</button>
            <button className={`custom-tab ${selectedTab === 'warning' ? 'active' : ''}`} onClick={() => setSelectedTab('warning')}>Warning (27)</button>
            <button className={`custom-tab ${selectedTab === 'info' ? 'active' : ''}`} onClick={() => setSelectedTab('info')}>Info (9)</button>
          </div>
          <div style={{ width: "300px", maxWidth: "100%" }}>
            <TextField
              placeholder="Search affected products..."
              value={searchValue}
              onChange={setSearchValue}
              autoComplete="off"
            />
          </div>
        </div>
        
        <IndexTable
          resourceName={{ singular: 'product', plural: 'products' }}
          itemCount={affectedProducts.length}
          selectable={true}
          headings={[
            { title: 'PRODUCT' },
            { title: 'ISSUE' },
            { title: 'SEVERITY' },
            { title: 'STATUS' },
            { title: 'ACTIONS', hidden: true },
          ]}
        >
          {affectedProducts.map((product, index) => {
            let tone = "success";
            if (product.severity === "Critical") tone = "critical";
            if (product.severity === "Warning") tone = "warning";
            if (product.severity === "Info") tone = "info";

            return (
              <IndexTable.Row id={product.id} key={product.id} position={index}>
                <IndexTable.Cell>
                  <Text variant="bodyMd" fontWeight="bold" as="span">{product.title}</Text>
                  <br />
                  <Text variant="bodySm" color="subdued" as="span">{product.sku}</Text>
                </IndexTable.Cell>
                <IndexTable.Cell>{product.issue}</IndexTable.Cell>
                <IndexTable.Cell>
                  <Badge status={tone}>{product.severity}</Badge>
                </IndexTable.Cell>
                <IndexTable.Cell>{product.status}</IndexTable.Cell>
                <IndexTable.Cell>
                  <ButtonGroup>
                    <Button size="slim">Fix</Button>
                    <Button size="slim">Open</Button>
                  </ButtonGroup>
                </IndexTable.Cell>
              </IndexTable.Row>
            );
          })}
        </IndexTable>
        
        <div style={{ padding: "16px", display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #ebebeb" }}>
          <Text as="p" color="subdued" variant="bodySm">Showing 5 of 54 affected products</Text>
          <Text as="p" color="subdued" variant="bodySm">Page 1 of 11 →</Text>
        </div>
      </Card>
      
      <div style={{ height: "40px" }} />
    </Page>
  );
}

// ---------------------------------------------------------------------------
// Health Ring Component (copied from index.jsx)
// ---------------------------------------------------------------------------
function HealthRing({ value, size = 160, stroke = 12 }) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - value / 100);

  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#E4E5E7" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#f4a261"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "row", gap: "2px" }}>
        <div style={{ fontSize: '36px', fontWeight: 'bold' }}>{value}</div>
        <div style={{ fontSize: '14px', color: '#8a8f96', marginTop: '8px' }}>/100</div>
      </div>
    </div>
  );
}

const CSS = `
  .health-grid {
    display: grid;
    grid-template-columns: 1fr 2fr;
    gap: 16px;
  }
  
  @media (max-width: 900px) {
    .health-grid {
      grid-template-columns: 1fr;
    }
  }

  .score-card-content {
    padding: 40px 20px;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    justify-content: center;
    height: 100%;
  }

  .mini-cards-row {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 16px;
  }

  .fix-list {
    display: flex;
    flex-direction: column;
  }

  .fix-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 0;
  }
  
  .fix-left {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
  }
  .dot.red { background-color: #d82c0d; }
  .dot.orange { background-color: #f4a261; }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    margin-bottom: 12px;
    margin-top: 16px;
    flex-wrap: wrap;
    gap: 8px;
  }

  .issue-counts-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 16px;
  }

  .issue-card {
    padding: 16px;
  }

  .issue-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .icon-badge {
    width: 24px;
    height: 24px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    font-weight: bold;
  }
  .icon-badge.red { background-color: #ffe6e6; color: #d82c0d; }
  .icon-badge.orange { background-color: #fff5e6; color: #f4a261; }
  .icon-badge.purple { background-color: #f4f0ff; color: #7a62ff; }
  .icon-badge.green { background-color: #e6ffed; color: #008060; }

  .custom-table {
    display: flex;
    flex-direction: column;
  }

  .ct-header, .ct-row {
    display: flex;
    align-items: center;
    padding: 16px;
    gap: 16px;
  }

  .ct-col-main { flex: 2; display: flex; align-items: flex-start; gap: 12px; }
  .ct-col-weight { flex: 1; }
  .ct-col-affected { flex: 1; }
  .ct-col-action { flex: 0.5; text-align: right; white-space: nowrap; }

  .check-icon-wrapper {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    font-weight: bold;
    flex-shrink: 0;
    margin-top: 2px;
  }
  .check-icon-wrapper.red { background-color: #ffe6e6; color: #d82c0d; }
  .check-icon-wrapper.orange { background-color: #fff5e6; color: #b77b25; }
  .check-icon-wrapper.green { background-color: #e6ffed; color: #008060; }

  .review-link {
    color: #008060;
    font-weight: 500;
    cursor: pointer;
  }
  
  .review-link:hover {
    text-decoration: underline;
  }

  .custom-tabs {
    display: flex;
    gap: 8px;
  }
  
  .custom-tab {
    background: transparent;
    border: 1px solid #c9cccf;
    border-radius: 20px;
    padding: 6px 16px;
    font-size: 14px;
    cursor: pointer;
    color: #202223;
  }
  
  .custom-tab.active {
    background: #202223;
    color: white;
    border-color: #202223;
  }
`;

