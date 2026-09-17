import { useNavigate } from "react-router-dom";
import { EmptyState } from "@shopify/polaris";

export default function NotFound() {
  const navigate = useNavigate();
  return <EmptyState heading="Page not found" action={{ content: "Return to dashboard", url: "/" }} />;
}
