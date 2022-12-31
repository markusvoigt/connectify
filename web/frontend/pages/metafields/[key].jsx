import { Card, Page, Layout, SkeletonBodyText } from "@shopify/polaris";
import { Loading, TitleBar } from "@shopify/app-bridge-react";
import { MetafieldForm } from "../../components";

export default function MetafieldEdit() {
  const breadcrumbs = [{ content: "Metafields", url: "/" }];

  /*
     These are mock values.
     Set isLoading to false to preview the page without loading markup.
  */
  const isLoading = true;
  const isRefetching = false;
  const Metafield = {
    key: "dob",
    namespace: "custom",
    description: "",
    type: {
        name: "date"
    }
  };

  /* Loading action and markup that uses App Bridge and Polaris components */
  if (isLoading || isRefetching) {
    return (
      <Page>
        <TitleBar
          title="Edit Metafield"
          breadcrumbs={breadcrumbs}
          primaryAction={null}
        />
        <Loading />
        <Layout>
          <Layout.Section>
            <Card sectioned title="Name">
              <SkeletonBodyText />
            </Card>
            <Card sectioned title="Namspace">
              <SkeletonBodyText />
            </Card>
            <Card sectioned title="Key">
              <SkeletonBodyText />
            </Card>
            <Card sectioned title="Description">
              <SkeletonBodyText />
            </Card>
            <Card sectioned title="Type">
              <SkeletonBodyText />
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    );
  }

  return (
    <Page>
      <TitleBar
        title="Edit Metafield"
        breadcrumbs={breadcrumbs}
        primaryAction={null}
      />
      <MetafieldForm Metafield={Metafield} />
    </Page>
  );
}
