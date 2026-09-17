import { useState, useCallback, useEffect } from "react";
import {
  Page,
  Card,
  IndexTable,
  Text,
  Badge,
  Button,
  Modal,
  TextContainer,
  TextField,
  Select,
  Filters,
} from "@shopify/polaris";
import { TitleBar, useAuthenticatedFetch } from "@shopify/app-bridge-react";
import { useNavigate } from "react-router-dom";

export default function SyncActivity() {
  const fetch = useAuthenticatedFetch();
  const navigate = useNavigate();
  
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filtering
  const [queryValue, setQueryValue] = useState("");
  const [directionFilter, setDirectionFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  
  const [activeJob, setActiveJob] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (queryValue) q.append("type", queryValue);
      if (directionFilter) q.append("direction", directionFilter);
      if (statusFilter) q.append("status", statusFilter);
      
      const res = await fetch(`/api/sync-activity?${q.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setJobs(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [fetch, queryValue, directionFilter, statusFilter]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const handleQueryValueChange = useCallback((value) => setQueryValue(value), []);
  const handleQueryValueRemove = useCallback(() => setQueryValue(""), []);
  const handleClearAll = useCallback(() => {
    handleQueryValueRemove();
    setDirectionFilter("");
    setStatusFilter("");
  }, [handleQueryValueRemove]);

  const statusBadgeTone = (status) => {
    if (status === 'Running') return 'info';
    if (status === 'Completed') return 'success';
    if (status === 'Partially Completed') return 'attention';
    if (status === 'Failed') return 'critical';
    if (status === 'Cancelled') return 'warning';
    return "success";
  };

  const resourceName = {
    singular: "activity",
    plural: "activities",
  };

  const rowMarkup = jobs.map((job, index) => {
    return (
      <IndexTable.Row id={job.id} key={job.id} position={index}>
        <IndexTable.Cell>
          <Text variant="bodyMd" fontWeight="bold" as="span">
            {job.job_type}
          </Text>
        </IndexTable.Cell>
        <IndexTable.Cell>{job.direction}</IndexTable.Cell>
        <IndexTable.Cell>
          <Badge status={statusBadgeTone(job.status)}>
            {job.status} {job.status === "Running" && job.progress > 0 ? `(${job.progress}%)` : ""}
          </Badge>
        </IndexTable.Cell>
        <IndexTable.Cell>{job.started_at ? new Date(job.started_at).toLocaleString() : "-"}</IndexTable.Cell>
        <IndexTable.Cell>{job.completed_at ? new Date(job.completed_at).toLocaleString() : "-"}</IndexTable.Cell>
        <IndexTable.Cell>{job.records_affected}</IndexTable.Cell>
        <IndexTable.Cell>
          <Button plain onClick={() => { setActiveJob(job); setModalOpen(true); }}>
            View details
          </Button>
        </IndexTable.Cell>
      </IndexTable.Row>
    );
  });

  const filters = [
    {
      key: "status",
      label: "Status",
      filter: (
        <Select
          label="Status"
          labelHidden
          options={["", "Running", "Completed", "Partially Completed", "Failed", "Cancelled"]}
          value={statusFilter}
          onChange={setStatusFilter}
        />
      ),
      shortcut: true,
    },
    {
      key: "direction",
      label: "Direction",
      filter: (
        <Select
          label="Direction"
          labelHidden
          options={["", "Shopify → App", "App → Shopify"]}
          value={directionFilter}
          onChange={setDirectionFilter}
        />
      ),
    },
  ];

  const appliedFilters = [];
  if (statusFilter) {
    appliedFilters.push({
      key: "status",
      label: `Status: ${statusFilter}`,
      onRemove: () => setStatusFilter(""),
    });
  }
  if (directionFilter) {
    appliedFilters.push({
      key: "direction",
      label: `Direction: ${directionFilter}`,
      onRemove: () => setDirectionFilter(""),
    });
  }

  return (
    <Page title="Sync Activity" backAction={{ content: "Dashboard", onAction: () => navigate("/") }} fullWidth>
      <TitleBar title="Sync Activity" />
      <Card>
        <div style={{ padding: "16px" }}>
          <Filters
            queryValue={queryValue}
            filters={filters}
            appliedFilters={appliedFilters}
            onQueryChange={handleQueryValueChange}
            onQueryClear={handleQueryValueRemove}
            onClearAll={handleClearAll}
          />
        </div>
        <IndexTable
          resourceName={resourceName}
          itemCount={jobs.length}
          selectable={false}
          loading={loading}
          headings={[
            { title: "Sync Type" },
            { title: "Direction" },
            { title: "Status" },
            { title: "Started At" },
            { title: "Completed At" },
            { title: "Records" },
            { title: "Actions" },
          ]}
        >
          {rowMarkup}
        </IndexTable>
      </Card>
      
      {activeJob && (
        <Modal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          title="Sync details"
          primaryAction={{
            content: 'Close',
            onAction: () => setModalOpen(false),
          }}
        >
          <Modal.Section>
            <TextContainer>
              <p><strong>Type:</strong> {activeJob.job_type}</p>
              <p><strong>Direction:</strong> {activeJob.direction}</p>
              <p>
                <strong>Status:</strong>{" "}
                <Badge status={statusBadgeTone(activeJob.status)}>
                  {activeJob.status} {activeJob.status === "Running" && activeJob.progress > 0 ? `(${activeJob.progress}%)` : ""}
                </Badge>
              </p>
              <p><strong>Records processed:</strong> {activeJob.records_affected}</p>
              <p><strong>Started At:</strong> {activeJob.started_at ? new Date(activeJob.started_at).toLocaleString() : "-"}</p>
              <p><strong>Completed At:</strong> {activeJob.completed_at ? new Date(activeJob.completed_at).toLocaleString() : "-"}</p>
              {activeJob.error_message && (
                <div style={{ marginTop: 12, padding: 12, backgroundColor: "#fff4f4", border: "1px solid #d82c0d", borderRadius: 4 }}>
                  <p style={{ color: "#d82c0d", margin: 0 }}><strong>Error:</strong> {activeJob.error_message}</p>
                </div>
              )}
            </TextContainer>
          </Modal.Section>
        </Modal>
      )}
    </Page>
  );
}
