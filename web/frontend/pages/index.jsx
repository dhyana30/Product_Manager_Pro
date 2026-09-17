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
import { TitleBar } from "@shopify/app-bridge-react";
import { useNavigate } from "react-router-dom";
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

function BulkJobRow({ job, isLast }) {
  const [expanded, setExpanded] = useState(false);
  
  return (
    <div>
      <div style={{...s.tableRow, cursor: "pointer"}} onClick={() => setExpanded(!expanded)}>
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
          <Text as="span" color="subdued">{job.started ? new Date(job.started).toLocaleString() : '-'}</Text>
        </span>
        <span style={s.colRecords}>
          <Text as="span">{job.records}</Text>
        </span>
        <span style={{ ...s.colChevron, color: "#8a8f96" }}>
          {expanded ? "▼" : "▶"}
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
    .pmp-grid, .pmp-grid-reverse {
      grid-template-columns: 1fr !important;
    }
  }
`;

// ---------------------------------------------------------------------------

export default function HomePage() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const authenticatedFetch = useAuthenticatedFetch();

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
  }, [authenticatedFetch]);

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
        primaryAction={{ content: "Sync now", onAction: () => {} }}
        secondaryActions={[
          { content: "🔔", onAction: () => navigate("/notifications") },
          { content: "Open Product Grid", onAction: () => navigate("/catalog") },
        ]}
      />

      <div style={s.header}>
        <div>
          <div style={{ marginTop: 4 }}>
            <Text as="p" color="subdued">
              Overview of your catalog health, activity, and AI usage.
            </Text>
          </div>
        </div>
      </div>

      <div className="pmp-grid" style={s.grid}>
        <div style={s.colOneThird}>
          <HealthScoreCard data={data.HEALTH_SCORE} />
        </div>
        <div style={s.colTwoThirds}>
          <KpiCard data={data.KPIS} />
        </div>
      </div>

      <div className="pmp-grid-reverse" style={s.gridReverse}>
        <div style={s.colTwoThirds}>
          <BulkJobsCard data={data.BULK_JOBS} />
        </div>
        <div style={s.colOneThird}>
          <SyncActivityCard data={data.SYNC_ACTIVITY} />
        </div>
      </div>

      <div className="pmp-grid" style={s.grid}>
        <div style={s.colOneThird}>
          <ExportCard navigate={navigate} />
        </div>
        <div style={s.colTwoThirds}>
          <AiUsageCard navigate={navigate} data={data.AI_USAGE} />
        </div>
      </div>

      <div style={s.footnote}>
        <Text as="p" color="subdued">
          All times are in your local timezone.
        </Text>
      </div>
    </Page>
  );
}

// ---------------------------------------------------------------------------
// Catalog Health Score
// ---------------------------------------------------------------------------

function HealthScoreCard({ data }) {
  if (!data) return null;
  return (
    <Card>
      <div style={s.pad}>
        <Stack alignment="center" distribution="equalSpacing">
          <Text as="h2" variant="headingMd">
            Catalog Health Score
          </Text>
          <Tooltip content="Calculated from completeness, data quality, images, SEO, and variant health.">
            <span style={{ color: "#8a8f96" }}>
              <IconInfo />
            </span>
          </Tooltip>
        </Stack>

        <div style={s.healthRow}>
          <HealthRing value={data.value} label={data.label} />
          <div>
            <Text as="p" fontWeight="semibold">
              {data.summary}
            </Text>
            <div style={{ marginTop: 4, marginBottom: 12 }}>
              <Text as="p" color="subdued">
                {data.detail}
              </Text>
            </div>
            <LinkButton label="View health details" />
          </div>
        </div>
      </div>
    </Card>
  );
}

function HealthRing({ value, label, size = 120, stroke = 10 }) {
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
          stroke="#008060"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div style={s.ringLabel}>
        <Text as="span" variant="heading2xl">
          {value}
        </Text>
        <Text as="span" color="success" fontWeight="semibold">
          {label}
        </Text>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Catalog Health KPIs
// ---------------------------------------------------------------------------

function KpiCard({ data }) {
  if (!data) return null;
  return (
    <Card>
      <div style={s.pad}>
        <Stack alignment="center" distribution="equalSpacing">
          <Text as="h2" variant="headingMd">
            Catalog Health KPIs
          </Text>
          <Text as="span" color="subdued">
            Last updated: 10:15 AM
          </Text>
        </Stack>

        <div style={s.kpiGrid}>
          {data.map((kpi) => (
            <div key={kpi.label} style={s.kpiTile}>
              <Text as="p" color="subdued">
                {kpi.label}
              </Text>
              <div style={{ margin: "6px 0 2px" }}>
                <Text as="p" variant="headingLg">
                  {kpi.value}
                </Text>
              </div>
              {kpi.change && (
                <>
                  <span style={s.trend}>
                    <IconTrendUp />
                    {kpi.change}
                  </span>
                  <div style={{ marginTop: 2 }}>
                    <Text as="p" color="subdued">
                      vs last 7 days
                    </Text>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Recent Bulk Jobs
// ---------------------------------------------------------------------------

function BulkJobsCard({ data }) {
  const navigate = useNavigate();
  if (!data) return null;
  return (
    <Card>
      <div style={s.pad}>
        <Stack alignment="center" distribution="equalSpacing">
          <Text as="h2" variant="headingMd">
            Recent Bulk Jobs
          </Text>
          <Button plain onClick={() => navigate("/bulk-jobs")}>View all bulk jobs</Button>
        </Stack>
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
        <div style={{ padding: "32px 20px", textAlign: "center" }}>
          <Text as="p" color="subdued">No recent bulk jobs</Text>
        </div>
      ) : (
        data.map((job, i) => (
          <BulkJobRow key={job.id || i} job={job} isLast={i === data.length - 1} />
        ))
      )}

      </Card>
  );
}

// ---------------------------------------------------------------------------
// Sync Activity
// ---------------------------------------------------------------------------

function SyncActivityRow({ job, isLast }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div>
      <div style={{...s.tableRow, cursor: "pointer"}} onClick={() => setExpanded(!expanded)}>
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
          <Text as="span" color="subdued">{job.started ? new Date(job.started).toLocaleString() : '-'}</Text>
        </span>
        <span style={s.colRecords}>
          <Text as="span">{job.records}</Text>
        </span>
        <span style={{ ...s.colChevron, color: "#8a8f96" }}>
          {expanded ? "▼" : "▶"}
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

function SyncActivityCard({ data }) {
  const navigate = useNavigate();
  if (!data) return null;
  return (
    <Card>
      <div style={s.pad}>
        <Stack alignment="center" distribution="equalSpacing">
          <Text as="h2" variant="headingMd">
            Sync Activity
          </Text>
          <Button plain onClick={() => navigate("/sync-activity")}>View all activity</Button>
        </Stack>
      </div>

      <div style={s.tableHead}>
        <span style={s.colJob}>
          <Text as="span" color="subdued">Sync Type</Text>
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
        <div style={{ padding: "32px 20px", textAlign: "center" }}>
          <Text as="p" color="subdued">No recent sync activity</Text>
        </div>
      ) : (
        data.map((job, i) => (
          <SyncActivityRow key={job.id || i} job={job} isLast={i === data.length - 1} />
        ))
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Import / Export Status
// ---------------------------------------------------------------------------

function ExportCard({ navigate }) {
  const [data, setData] = useState([]);
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('recent_exports') || '[]');
      const mapped = stored.slice(0, 3).map(job => ({
        label: job.name,
        date: job.date,
        status: "Completed"
      }));
      setData(mapped);
    } catch {}
  }, []);

  return (
    <Card>
      <div style={s.pad}>
        <Stack alignment="center" distribution="equalSpacing">
          <Text as="h2" variant="headingMd">
            Export Status
          </Text>
          <LinkButton label="Manage exports" onClick={() => navigate('/export')} />
        </Stack>

        <div style={{ marginTop: 12 }}>
          {data.length === 0 ? (
            <div style={{ padding: "16px 0", textAlign: "center" }}>
              <Text as="p" color="subdued">No recent export activity</Text>
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
// AI Usage
// ---------------------------------------------------------------------------

function AiUsageCard({ navigate, data }) {
  if (!data) return null;
  return (
    <Card>
      <div style={s.pad}>
        <Stack alignment="center" distribution="equalSpacing">
          <Text as="h2" variant="headingMd">
            AI Usage
          </Text>
          <LinkButton label="Open AI Assistant" onClick={() => navigate("/ai-assistant")} />
        </Stack>

        <div style={s.aiGrid}>
          <div>
            <Text as="p" color="subdued">{data.rangeLabel}</Text>
            <div style={{ margin: "6px 0" }}>
              <Text as="p" variant="heading2xl">{data.percent}%</Text>
            </div>
            <Text as="p" color="subdued">
              ({data.used} / {data.total} credits used)
            </Text>
            <div style={{ marginTop: 12, maxWidth: 320 }}>
              <ProgressBar progress={data.percent} size="small" />
            </div>
            <div style={{ marginTop: 8 }}>
              <Text as="p" color="subdued">{data.resetLabel}</Text>
            </div>
          </div>

          <div>
            <Text as="p" fontWeight="semibold">Top AI features by usage</Text>
            <div style={{ marginTop: 10 }}>
              {data.features.length === 0 ? (
                <div style={{ padding: "8px 0" }}>
                  <Text as="span" color="subdued">No features used yet</Text>
                </div>
              ) : (
                data.features.map((f) => (
                  <div key={f.label} style={s.featureRow}>
                    <Text as="span" color="subdued">{f.label}</Text>
                    <Text as="span" fontWeight="medium">{f.share}</Text>
                  </div>
                ))
              )}
            </div>
          </div>
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

  aiGrid: {
    display: "grid",
    gridTemplateColumns: "1.3fr 1fr",
    gap: 32,
    marginTop: 16,
  },
  featureRow: {
    display: "flex",
    justifyContent: "space-between",
    padding: "8px 0",
    borderBottom: "1px solid #f1f2f4",
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
