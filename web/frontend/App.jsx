import { BrowserRouter } from "react-router-dom";
import { NavigationMenu } from "@shopify/app-bridge-react";
import Routes from "./Routes";
import { StoreTimezoneProvider } from "./utils/storeTimezone";

import {
  AppBridgeProvider,
  QueryProvider,
  PolarisProvider,
  NotificationProvider,
} from "./components";

export default function App() {
  // Any .tsx or .jsx files in /pages will become a route
  // See documentation for <Routes /> for more info
  const pages = import.meta.globEager("./pages/**/!(*.test.[jt]sx)*.([jt]sx)");

  return (
    <PolarisProvider>
      <BrowserRouter>
        <AppBridgeProvider>
          <StoreTimezoneProvider>
            <QueryProvider>
              <NotificationProvider>
            <NavigationMenu
              navigationLinks={[
                {
                  label: "Catalog & Inventory",
                  destination: "/catalog",
                },
                {
                  label: "Image manager",
                  destination: "/image-manager",
                },
                {
                  label: "SEO manager",
                  destination: "/seo-manager",
                },
                {
                  label: "Notifications",
                  destination: "/notifications",
                },
                {
                  label: "Settings",
                  destination: "/settings",
                },
              ]}
            />
            <Routes pages={pages} />
            </NotificationProvider>
            </QueryProvider>
          </StoreTimezoneProvider>
        </AppBridgeProvider>
      </BrowserRouter>
    </PolarisProvider>
  );
}
