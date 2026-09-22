import { useState, useCallback, useEffect } from "react";
import {
  Card,
  Text,
  Badge,
  Button,
  Modal,
  TextContainer,
  Spinner
} from "@shopify/polaris";
import { ArrowLeftMinor } from "@shopify/polaris-icons";
import { TitleBar, useAuthenticatedFetch } from "@shopify/app-bridge-react";
import { useNavigate } from "react-router-dom";
import { useStoreTimezone, formatInStoreTimezone } from "../utils/storeTimezone";

export default function BulkJobs() {
  const fetch = useAuthenticatedFetch();
  const navigate = useNavigate();
  
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const timeZone = useStoreTimezone();
  
  const [activeJob, setActiveJob] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  // timezone derived from StoreTimezoneProvider via useStoreTimezone hook

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/bulk-jobs`);
      if (res.ok) {
        const data = await res.json();
        setJobs(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [fetch]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

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

  return (
    <div style={{ minHeight: "100vh" }}>
      <TitleBar title="Bulk Jobs" />
      {/* Custom Top Bar */}
      <div style={{ backgroundColor: "#ffffff", padding: "16px 24px", borderBottom: "1px solid #dfe3e8", display: "flex", alignItems: "center", gap: "16px" }}>
        <Button icon={ArrowLeftMinor} outline onClick={() => navigate("/")} />
        <Text variant="headingLg" as="h1" fontWeight="bold">Bulk Jobs</Text>
      </div>

      {/* Main Content Area */}
      <div style={{ padding: "40px 24px", maxWidth: "1200px", margin: "0 auto" }}>
        <Card>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "14px" }}>
              <thead>
                <tr>
                  <th style={{ padding: "16px", color: "#8a8f96", fontSize: "12px", fontWeight: "bold", textTransform: "uppercase", borderBottom: "1px solid #dfe3e8", whiteSpace: "nowrap" }}>Job Name</th>
                  <th style={{ padding: "16px", color: "#8a8f96", fontSize: "12px", fontWeight: "bold", textTransform: "uppercase", borderBottom: "1px solid #dfe3e8", whiteSpace: "nowrap" }}>Type</th>
                  <th style={{ padding: "16px", color: "#8a8f96", fontSize: "12px", fontWeight: "bold", textTransform: "uppercase", borderBottom: "1px solid #dfe3e8", whiteSpace: "nowrap" }}>Status</th>
                  <th style={{ padding: "16px", color: "#8a8f96", fontSize: "12px", fontWeight: "bold", textTransform: "uppercase", borderBottom: "1px solid #dfe3e8", whiteSpace: "nowrap" }}>Started</th>
                  <th style={{ padding: "16px", color: "#8a8f96", fontSize: "12px", fontWeight: "bold", textTransform: "uppercase", borderBottom: "1px solid #dfe3e8", whiteSpace: "nowrap" }}>Completed</th>
                  <th style={{ padding: "16px", color: "#8a8f96", fontSize: "12px", fontWeight: "bold", textTransform: "uppercase", borderBottom: "1px solid #dfe3e8", whiteSpace: "nowrap" }}>Records</th>
                </tr>
              </thead>
              <tbody>
                {loading && jobs.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ padding: "40px", textAlign: "center" }}>
                      <Spinner size="large" />
                    </td>
                  </tr>
                ) : (
                  jobs.map((job, i) => {
                    const isLast = i === jobs.length - 1;
                    return (
                      <tr key={job.id} style={{ borderBottom: isLast ? "none" : "1px solid #dfe3e8", cursor: "pointer" }} onClick={() => { setActiveJob(job); setModalOpen(true); }}>
                        <td style={{ padding: "16px", whiteSpace: "nowrap" }}><Text fontWeight="bold" as="span">{job.job_name}</Text></td>
                        <td style={{ padding: "16px", whiteSpace: "nowrap", color: "#6d7175" }}>{job.job_type}</td>
                        <td style={{ padding: "16px", whiteSpace: "nowrap" }}>
                          <Badge status={statusBadgeTone(job.status)}>
                            {job.status} {job.status === "Running" && job.progress > 0 ? `(${job.progress}%)` : ""}
                          </Badge>
                        </td>
                        <td style={{ padding: "16px", whiteSpace: "nowrap", color: "#6d7175" }}>{job.started_at ? formatInStoreTimezone(job.started_at, timeZone) : "-"}</td>
                        <td style={{ padding: "16px", whiteSpace: "nowrap", color: "#6d7175" }}>{job.completed_at ? formatInStoreTimezone(job.completed_at, timeZone) : "-"}</td>
                        <td style={{ padding: "16px", whiteSpace: "nowrap" }}><Text fontWeight="bold" as="span">{job.records_affected}</Text></td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
      
      {activeJob && (
        <Modal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          title="Job details"
          primaryAction={{
            content: 'Close',
            onAction: () => setModalOpen(false),
          }}
          secondaryActions={[
            ...(activeJob.status === "Failed" ? [{ content: "Retry", onAction: () => { handleRetry(activeJob.id); setModalOpen(false); } }] : []),
            ...((activeJob.status === "Queued" || activeJob.status === "Running") ? [{ content: "Cancel", onAction: () => { handleCancel(activeJob.id); setModalOpen(false); } }] : []),
          ]}
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
              <p><strong>Started At:</strong> {activeJob.started_at ? formatInStoreTimezone(activeJob.started_at, timeZone) : "-"}</p>
              <p><strong>Completed At:</strong> {activeJob.completed_at ? formatInStoreTimezone(activeJob.completed_at, timeZone) : "-"}</p>
              {activeJob.status === "Failed" && activeJob.error_message && (
                <div style={{ marginTop: 12, padding: 12, backgroundColor: "#fff4f4", border: "1px solid #d82c0d", borderRadius: 4 }}>
                  <p style={{ color: "#d82c0d", margin: 0 }}><strong>Error:</strong> {activeJob.error_message}</p>
                </div>
              )}
            </TextContainer>
          </Modal.Section>
        </Modal>
      )}
    </div>
  );
}
