import { useEffect, useState } from "react";
import {
  Badge,
  Button,
  Card,
  Divider,
  Page,
  ProgressBar,
  Stack,
  Text,
  Tooltip,
} from "@shopify/polaris";
import { TitleBar, Toast } from "@shopify/app-bridge-react";
import { useNavigate } from "react-router-dom";
import { useStoreTimezone, formatInStoreTimezone } from "../utils/storeTimezone";
import { formatDateTime } from "../utils/timezone";
import { useAuthenticatedFetch } from "../hooks/useAuthenticatedFetch";
import { NotificationMajor } from "@shopify/polaris-icons";
import {
  IconArrowUpRight,
  IconCheckCircle,
  IconChevronRight,
  IconDownload,
  IconInfo,
  IconTrendUp,
  IconUpload,
} from "../components";

// ---------------------------------------------------------------------------

const TONE_COLOR = {
  success: "#008060",
  info: "#2c6ecb",
  critical: "#d82c0d",
};

function statusBadgeTone(status) {
  if (status === 'Queued') return 'new';
  if (status === 'Running') return 'info';
  if (status === 'Completed') return 'success';
  if (status === 'Failed') return 'critical';
  if (status === 'Cancelled') return 'warning';
  if (status.startsWith("Processing")) return "attention";
  return "success";
}

function BulkJobRow({ job, isLast, timeZone }) {
  const [expanded, setExpanded] = useState(false);
  
  return (
    <div>
      <div style={{...s.tableRow, cursor: job.error_message ? "pointer" : "default"}} onClick={() => job.error_message && setExpanded(!expanded)}>
        <span style={s.colJob}>
          <Text as="span" fontWeight="medium">{job.name}</Text>
        </span>
        <span style={s.colType}>
          <Text as="span" color="subdued">{job.type}</Text>
        </span>
        <span style={s.colStatus}>
          <Badge status={statusBadgeTone(job.status)}>
            {job.status} {job.status === 'Running' && job.progress > 0 ? `(${job.progress}%)` : ''}
          </Badge>
        </span>
        <span style={s.colStarted}>
          <Text as="span" color="subdued">{job.started ? formatInStoreTimezone(job.started, timeZone) : '-'}</Text>
        </span>
        <span style={s.colRecords}>
          <Text as="span">{job.records}</Text>
        </span>
        <span style={{ ...s.colChevron, color: "#8a8f96" }}>
          {job.error_message ? (expanded ? "▼" : "▶") : ""}
        </span>
      </div>
      {expanded && job.error_message && (
        <div style={{ padding: "12px 20px", backgroundColor: "#fafbfb", borderTop: "1px solid #ebebeb", borderBottom: "1px solid #ebebeb" }}>
          <Text as="p" color="critical">Error: {job.error_message}</Text>
        </div>
      )}
      {!isLast && <Divider />}
    </div>
  );
}

const RESPONSIVE_CSS = `
  @media (max-width: 960px) {
    .pmp-grid, .pmp-grid-reverse, .pmp-grid-half {
      grid-template-columns: 1fr !important;
    }
  }
`;

// ---------------------------------------------------------------------------

export default function HomePage() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");
  const [syncError, setSyncError] = useState("");
  const timeZone = useStoreTimezone();
  const authenticatedFetch = useAuthenticatedFetch();

  const handleSyncNow = async () => {
    setIsSyncing(true);
    setSyncError("");
    try {
      const response = await authenticatedFetch("/api/sync/pull", { method: "POST" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "Catalog sync failed.");

      const dashboardResponse = await authenticatedFetch("/api/dashboard");
      if (dashboardResponse.ok) setData(await dashboardResponse.json());
      setSyncMessage(payload.message || "Catalog synced successfully.");
    } catch (syncFailure) {
      setSyncError(syncFailure.message);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    async function loadDashboard() {
      try {
        const response = await authenticatedFetch("/api/dashboard");
        if (response.ok) {
          const json = await response.json();
          setData(json);
        }
      } catch (e) {
        console.error("Failed to load dashboard data", e);
      }
    }
    loadDashboard();
  }, []);

  if (!data) {
    return (
      <Page fullWidth>
        <Text as="p">Loading dashboard...</Text>
      </Page>
    );
  }

  return (
    <Page fullWidth>
      <style>{RESPONSIVE_CSS}</style>
      <TitleBar
        title="Dashboard"
        primaryAction={{ content: "Sync now", onAction: handleSyncNow, loading: isSyncing }}
        secondaryActions={[
          { content: "🔔", onAction: () => navigate("/notifications") },
          { content: "Open Product Grid", onAction: () => navigate("/catalog") },
        ]}
      />

      {syncMessage && <Toast content={syncMessage} onDismiss={() => setSyncMessage("")} />}
      {syncError && <Toast content={syncError} error onDismiss={() => setSyncError("")} />}

      <div style={s.header}>
        <div>
          <div style={{ marginTop: 4 }}>
            <Text as="p" color="subdued">
              Catalog health, activity, and AI usage — last updated 10:15 AM
            </Text>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '16px' }}>
      {/* Top Section */}
      <div className="pmp-grid" style={s.grid}>
        <div className="stretch-card-container" style={{ ...s.colOneThird }}>
          <HealthScoreCard data={data.HEALTH_SCORE} />
        </div>
        <div style={{ ...s.colTwoThirds, display: "flex", flexDirection: "column", gap: "16px", minWidth: 0 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "16px" }}>
            {data.KPIS && data.KPIS.map(kpi => <KpiMiniCard key={kpi.label} kpi={kpi} />)}
          </div>
          <div className="stretch-card-container" style={{ flexGrow: 1, minHeight: 0 }}><SyncActivityCard data={data.SYNC_ACTIVITY} timeZone={timeZone} /></div>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="pmp-grid-half" style={s.gridHalf}>
        <div className="stretch-card-container" style={{ minWidth: 0 }}>
          <BulkJobsCard data={data.BULK_JOBS} timeZone={timeZone} />
        </div>
        <div className="stretch-card-container" style={{ minWidth: 0 }}>
          <ExportCard navigate={navigate} />
        </div>
      </div>
    </div>

      <div style={s.footnote}>
        <Text as="p" color="subdued">
          All times are shown in your local timezone.
        </Text>
      </div>
    </Page>
  );
}

// ---------------------------------------------------------------------------
// Catalog Health Score
// ---------------------------------------------------------------------------

function HealthScoreCard({ data }) {
  const navigate = useNavigate();
  if (!data) return null;
  return (
    <Card>
      <div style={{ padding: "40px 20px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", flexGrow: 1, justifyContent: "center" }}>
        <HealthRing value={data.value} />
        <div style={{ marginTop: "24px" }}>
          <Text as="h2" variant="headingMd" color="warning">Needs attention</Text>
          <div style={{ marginTop: "4px" }}>
            <Text as="p" color="subdued" variant="bodySm">54 products below standard</Text>
          </div>
        </div>
        <div style={{ marginTop: "16px", marginBottom: "24px", maxWidth: "240px" }}>
          <Text as="p" color="subdued">Keep going — {data.value}% of your catalog meets quality and completeness standards.</Text>
        </div>
        <span onClick={() => navigate("/health")} style={{ color: "#008060", fontWeight: 500, cursor: "pointer", fontSize: "14px" }}>View health details &rarr;</span>
      </div>
    </Card>
  );
}

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
        <div style={{ fontSize: '14px', color: '#8a8f96', marginTop: '8px' }}>%</div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Catalog Health KPIs
// ---------------------------------------------------------------------------

function KpiMiniCard({ kpi }) {
  let badgeText = '';
  let badgeTone = 'success';
  let title = kpi.label;
  let dotColor = '#000';
  
  if (kpi.label.includes('Total') && !kpi.label.includes('Inventory')) { 
      badgeText = 'catalog size'; title = 'Total products'; dotColor = '#7A62FF';
  }
  else if (kpi.label.includes('Active')) { 
      badgeText = '98% of catalog'; title = 'Active products'; dotColor = '#00D1B2';
  }
  else if (kpi.label.includes('Draft')) { 
      badgeText = 'needs review'; badgeTone = 'critical'; title = 'Draft products'; dotColor = '#FF5C8D';
  }
  else if (kpi.label.includes('Inventory')) { 
      badgeText = 'units on hand'; badgeTone = 'warning'; title = 'Total inventory'; dotColor = '#FFC900';
  }

  return (
    <div className="stretch-card-container">
      <Card>
        <div style={{ padding: "16px", height: "100%", display: "flex", flexDirection: "column" }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text as="p" color="subdued" variant="bodyMd">{title}</Text>
            <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: dotColor }} />
          </div>
          <div style={{ marginTop: "4px", marginBottom: "8px", flexGrow: 1 }}>
            <Text as="p" variant="headingXl">{kpi.value}</Text>
          </div>
          <div>
            {badgeText && <Badge status={badgeTone}>{badgeText}</Badge>}
          </div>
        </div>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Recent Bulk Jobs
// ---------------------------------------------------------------------------

function BulkJobsCard({ data, timeZone }) {
  const navigate = useNavigate();
  if (!data) return null;
  return (
    <Card>
      <div style={s.pad}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Text as="h2" variant="headingMd">Recent bulk jobs</Text>
          <span style={{ color: "#008060", fontWeight: 500, cursor: "pointer", fontSize: "14px" }} onClick={() => navigate("/bulk-jobs")}>View all bulk jobs &rarr;</span>
        </div>
      </div>

      <div style={s.tableHead}>
        <span style={s.colJob}>
          <Text as="span" color="subdued">Job</Text>
        </span>
        <span style={s.colType}>
          <Text as="span" color="subdued">Type</Text>
        </span>
        <span style={s.colStatus}>
          <Text as="span" color="subdued">Status</Text>
        </span>
        <span style={s.colStarted}>
          <Text as="span" color="subdued">Started</Text>
        </span>
        <span style={s.colRecords}>
          <Text as="span" color="subdued">Records</Text>
        </span>
        <span style={s.colChevron} />
      </div>
      <Divider />

      {data.length === 0 ? (
        <div style={{ padding: "48px 20px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", flexGrow: 1 }}>
          <div style={{ width: 40, height: 40, borderRadius: "8px", backgroundColor: "#f4f6f8", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
            <span style={{ fontSize: 20, color: "#8a8f96" }}>+</span>
          </div>
          <Text as="p" fontWeight="bold">No recent bulk jobs</Text>
          <div style={{ marginTop: 4 }}>
            <Text as="p" color="subdued">Start one from the product grid</Text>
          </div>
        </div>
      ) : (
        data.map((job, i) => (
          <BulkJobRow key={job.id || i} job={job} isLast={i === data.length - 1} timeZone={timeZone} />
        ))
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Sync Activity
// ---------------------------------------------------------------------------

function SyncActivityRow({ job, isLast, timeZone }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div>
      <div style={{...s.tableRow, cursor: job.error_message ? "pointer" : "default"}} onClick={() => job.error_message && setExpanded(!expanded)}>
        <span style={s.colJob}>
          <Text as="span" fontWeight="medium">{job.type}</Text>
        </span>
        <span style={s.colType}>
          <Text as="span" color="subdued">{job.direction}</Text>
        </span>
        <span style={s.colStatus}>
          <Badge status={statusBadgeTone(job.status)}>
            {job.status} {job.status === 'Running' && job.progress > 0 ? `(${job.progress}%)` : ''}
          </Badge>
        </span>
        <span style={s.colStarted}>
            {job.started ? formatDateTime(job.started, timeZone) : '-'}
        </span>
        <span style={s.colRecords}>
          <Text as="span">{job.records}</Text>
        </span>
        <span style={{ ...s.colChevron, color: "#8a8f96" }}>
          {job.error_message ? (expanded ? "▼" : "▶") : ""}
        </span>
      </div>
      {expanded && job.error_message && (
        <div style={{ padding: "12px 20px", backgroundColor: "#fafbfb", borderTop: "1px solid #ebebeb", borderBottom: "1px solid #ebebeb" }}>
          <Text as="p" color="critical">Error: {job.error_message}</Text>
        </div>
      )}
      {!isLast && <Divider />}
    </div>
  );
}

function SyncActivityCard({ data, timeZone }) {
  const navigate = useNavigate();
  if (!data) return null;
  return (
    <Card>
      <div style={s.pad}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Text as="h2" variant="headingMd">Sync activity</Text>
          <span style={{ color: "#008060", fontWeight: 500, cursor: "pointer", fontSize: "14px" }} onClick={() => navigate("/sync-activity")}>View all activity &rarr;</span>
        </div>
      </div>

      <div style={s.tableHead}>
        <span style={s.colJob}>
          <Text as="span" color="subdued">Sync type</Text>
        </span>
        <span style={s.colType}>
          <Text as="span" color="subdued">Direction</Text>
        </span>
        <span style={s.colStatus}>
          <Text as="span" color="subdued">Status</Text>
        </span>
        <span style={s.colStarted}>
          <Text as="span" color="subdued">Started</Text>
        </span>
        <span style={s.colRecords}>
          <Text as="span" color="subdued">Records</Text>
        </span>
        <span style={s.colChevron} />
      </div>
      <Divider />

      {data.length === 0 ? (
        <div style={{ padding: "48px 20px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", flexGrow: 1 }}>
          <div style={{ width: 40, height: 40, borderRadius: "8px", backgroundColor: "#f4f6f8", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
            <span style={{ fontSize: 18, color: "#8a8f96" }}>↻</span>
          </div>
          <Text as="p" fontWeight="bold">No recent sync activity</Text>
          <div style={{ marginTop: 4 }}>
            <Text as="p" color="subdued">Connected channels will appear here once they sync</Text>
          </div>
        </div>
      ) : (
        data.map((job, i) => (
          <SyncActivityRow key={job.id || i} job={job} isLast={i === data.length - 1} timeZone={timeZone} />
        ))
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Import / Export Status
// ---------------------------------------------------------------------------

function ExportCard({ navigate }) {
  const fetch = useAuthenticatedFetch();
  const timeZone = useStoreTimezone();
  const padStyle = { ...s.pad, display: 'flex', flexDirection: 'column', flexGrow: 1 };
  const [data, setData] = useState([]);
  
  useEffect(() => {
    async function loadExports() {
      try {
        const response = await fetch('/api/exports');
        if (response.ok) {
          const json = await response.json();
          const mapped = json.slice(0, 3).map(job => ({
            label: job.job_name,
            date: formatDateTime(job.created_at, timeZone),
            status: job.status
          }));
          setData(mapped);
        }
      } catch (e) {
        console.error("Failed to load exports", e);
      }
    }
    loadExports();
  }, [timeZone]);

  return (
    <Card>
      <div style={padStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Text as="h2" variant="headingMd">Export status</Text>
          <span style={{ color: "#008060", fontWeight: 500, cursor: "pointer", fontSize: "14px" }} onClick={() => navigate("/export")}>Manage exports &rarr;</span>
        </div>

        <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', marginTop: 12 }}>
          {data.length === 0 ? (
            <div style={{ padding: "48px 0", display: "flex", flexDirection: "row", alignItems: "center" }}>
              <div style={{ width: 40, height: 40, borderRadius: "8px", backgroundColor: "#f4f6f8", display: "flex", alignItems: "center", justifyContent: "center", marginRight: 16, flexShrink: 0 }}>
                <span style={{ fontSize: 18, color: "#8a8f96" }}>↓</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <Text as="p" fontWeight="bold">No recent export activity</Text>
                <div style={{ marginTop: 4 }}>
                  <Text as="p" color="subdued">Your last export will show status and record count here</Text>
                </div>
              </div>
            </div>
          ) : (
            data.map((row, i) => {
              const Icon = IconDownload;
              const rowStyle =
                i === data.length - 1
                  ? s.ieRow
                  : { ...s.ieRow, borderBottom: "none" };
              return (
                <div key={i} style={rowStyle}>
                  <div style={s.ieIcon}>
                    <Icon size={20} />
                  </div>
                  <div style={{ flex: 1, marginLeft: 12 }}>
                    <Text as="p" fontWeight="bold">
                      {row.label}
                    </Text>
                    <Text as="p" color="subdued" variant="bodySm">
                      {row.date}
                    </Text>
                  </div>
                  {row.status === "Completed" ? (
                    <Badge status="success">Completed</Badge>
                  ) : (
                    <Badge status="warning">{row.status}</Badge>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Shared bits
// ---------------------------------------------------------------------------

function LinkButton({ label, onClick }) {
  return (
    <button type="button" onClick={onClick} style={s.linkButton}>
      <span style={s.linkText}>{label}</span>
      <span style={{ color: "#2c6ecb", display: "flex" }}>
        <IconArrowUpRight size={12} />
      </span>
    </button>
  );
}

const s = {
  header: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 16,
    marginBottom: 16,
    flexWrap: "wrap",
  },
  headerActions: {
    display: "flex",
    gap: 8,
    flexShrink: 0,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "1fr 2fr",
    gap: 16,
    marginBottom: 16,
  },
  gridReverse: {
    display: "grid",
    gridTemplateColumns: "2fr 1fr",
    gap: 16,
    marginBottom: 16,
  },
  gridHalf: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 16,
    marginBottom: 16,
  },
  colOneThird: { minWidth: 0 },
  colTwoThirds: { minWidth: 0 },
  pad: { padding: "16px 20px" },
  footnote: { marginTop: 4, marginBottom: 16 },

  healthRow: {
    display: "flex",
    alignItems: "center",
    gap: 24,
    marginTop: 20,
    flexWrap: "wrap",
  },
  ringLabel: {
    position: "absolute",
    inset: 0,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },

  kpiGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
    gap: 12,
    marginTop: 16,
  },
  kpiTile: {
    border: "1px solid #e1e3e5",
    borderRadius: 8,
    padding: "12px 14px",
  },
  trend: {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    color: "#008060",
    fontWeight: 600,
    fontSize: 13,
  },

  tableHead: {
    display: "grid",
    gridTemplateColumns: "2.2fr 1fr 1.4fr 1.4fr 0.9fr 24px",
    gap: 12,
    padding: "0 20px 12px",
    alignItems: "center",
  },
  tableRow: {
    display: "grid",
    gridTemplateColumns: "2.2fr 1fr 1.4fr 1.4fr 0.9fr 24px",
    gap: 12,
    padding: "14px 20px",
    alignItems: "center",
  },
  colJob: { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  colType: {},
  colStatus: {},
  colStarted: {},
  colRecords: { textAlign: "right" },
  colChevron: { display: "flex", justifyContent: "flex-end" },

  timelineRow: { display: "flex", gap: 12 },
  timelineMarker: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    width: 12,
    flexShrink: 0,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: "50%",
    marginTop: 4,
    flexShrink: 0,
  },
  timelineLine: {
    flex: 1,
    width: 2,
    background: "#e1e3e5",
    marginTop: 4,
  },

  ieRow: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    padding: "14px 0",
    borderBottom: "1px solid #e1e3e5",
  },
  ieIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    background: "#f1f2f4",
    color: "#2c6ecb",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  
  

  linkButton: {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    background: "none",
    border: "none",
    padding: 0,
    cursor: "pointer",
  },
  linkText: {
    color: "#2c6ecb",
    fontWeight: 600,
    fontSize: 13,
  },
};
