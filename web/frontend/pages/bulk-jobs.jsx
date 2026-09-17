import { useState, useCallback, useEffect } from "react";
import {
  Page,
  Card,
  IndexTable,
  useIndexResourceState,
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

export default function BulkJobs() {
  const fetch = useAuthenticatedFetch();
  const navigate = useNavigate();
  
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filtering
  const [queryValue, setQueryValue] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  
  const [activeJob, setActiveJob] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (queryValue) q.append("search", queryValue);
      if (typeFilter) q.append("type", typeFilter);
      if (statusFilter) q.append("status", statusFilter);
      
      const res = await fetch(`/api/bulk-jobs?${q.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setJobs(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [fetch, queryValue, typeFilter, statusFilter]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const handleQueryValueChange = useCallback((value) => setQueryValue(value), []);
  const handleQueryValueRemove = useCallback(() => setQueryValue(""), []);
  const handleClearAll = useCallback(() => {
    handleQueryValueRemove();
    setTypeFilter("");
    setStatusFilter("");
  }, [handleQueryValueRemove]);

  const handleRetry = async (id) => {
    await fetch(`/api/bulk-jobs/${id}/retry`, { method: "POST" });
    fetchJobs();
  };

  const handleCancel = async (id) => {
    await fetch(`/api/bulk-jobs/${id}/cancel`, { method: "POST" });
    fetchJobs();
  };

  const statusBadgeTone = (status) => {
    if (status === 'Queued') return 'new';
    if (status === 'Running') return 'info';
    if (status === 'Completed') return 'success';
    if (status === 'Failed') return 'critical';
    if (status === 'Cancelled') return 'warning';
    return "success";
  };

  const resourceName = {
    singular: "job",
    plural: "jobs",
  };

  const rowMarkup = jobs.map((job, index) => {
    const isRetryable = job.status === "Failed";
    const isCancellable = job.status === "Queued" || job.status === "Running";
    
    return (
      <IndexTable.Row id={job.id} key={job.id} position={index}>
        <IndexTable.Cell>
          <Text variant="bodyMd" fontWeight="bold" as="span">
            {job.job_name}
          </Text>
        </IndexTable.Cell>
        <IndexTable.Cell>{job.job_type}</IndexTable.Cell>
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
          {isRetryable && (
            <div style={{marginTop: 4}}>
              <Button plain destructive onClick={() => handleRetry(job.id)}>Retry</Button>
            </div>
          )}
          {isCancellable && (
            <div style={{marginTop: 4}}>
              <Button plain onClick={() => handleCancel(job.id)}>Cancel</Button>
            </div>
          )}
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
          options={["", "Queued", "Running", "Completed", "Failed", "Cancelled"]}
          value={statusFilter}
          onChange={setStatusFilter}
        />
      ),
      shortcut: true,
    },
    {
      key: "type",
      label: "Type",
      filter: (
        <TextField
          label="Type"
          labelHidden
          value={typeFilter}
          onChange={setTypeFilter}
          autoComplete="off"
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
  if (typeFilter) {
    appliedFilters.push({
      key: "type",
      label: `Type: ${typeFilter}`,
      onRemove: () => setTypeFilter(""),
    });
  }

  return (
    <Page title="Bulk Jobs" backAction={{ content: "Dashboard", onAction: () => navigate("/") }} fullWidth>
      <TitleBar title="Bulk Jobs" />
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
            { title: "Job Name" },
            { title: "Type" },
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
          title="Job details"
          primaryAction={{
            content: 'Close',
            onAction: () => setModalOpen(false),
          }}
        >
          <Modal.Section>
            <TextContainer>
              <p><strong>Name:</strong> {activeJob.job_name}</p>
              <p><strong>Type:</strong> {activeJob.job_type}</p>
              <p>
                <strong>Status:</strong>{" "}
                <Badge status={statusBadgeTone(activeJob.status)}>
                  {activeJob.status} {activeJob.status === "Running" && activeJob.progress > 0 ? `(${activeJob.progress}%)` : ""}
                </Badge>
              </p>
              <p><strong>Records processed:</strong> {activeJob.records_affected}</p>
              <p><strong>Started At:</strong> {activeJob.started_at ? new Date(activeJob.started_at).toLocaleString() : "-"}</p>
              <p><strong>Completed At:</strong> {activeJob.completed_at ? new Date(activeJob.completed_at).toLocaleString() : "-"}</p>
              {activeJob.status === "Failed" && activeJob.error_message && (
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
