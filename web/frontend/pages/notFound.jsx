import { EmptyState } from "@shopify/polaris";

export default function NotFound() {
  return <EmptyState heading="Page not found" action={{ content: "Return to dashboard", url: "/" }} />;
}
