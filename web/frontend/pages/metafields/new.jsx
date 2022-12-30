import { Page } from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { MetafieldForm } from "../../components";

export default function ManageCode() {
  const breadcrumbs = [{ content: "Metafields", url: "/" }];

  return (
    <Page>
      <TitleBar
        title="Create new customer metafield"
        breadcrumbs={breadcrumbs}
        primaryAction={null}
      />
      <MetafieldForm />
    </Page>
  );
}