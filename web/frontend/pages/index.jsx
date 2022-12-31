import { useNavigate, TitleBar, Loading } from "@shopify/app-bridge-react";
import {
  Card,
  EmptyState,
  Layout,
  Page,
  SkeletonBodyText,
} from "@shopify/polaris";
import { MetafieldIndex } from "../components";

export default function HomePage() {
  /*
    Add an App Bridge useNavigate hook to set up the navigate function.
    This function modifies the top-level browser URL so that you can
    navigate within the embedded app and keep the browser in sync on reload.
  */
  const navigate = useNavigate();

  /*
    These are mock values. Setting these values lets you preview the loading markup and the empty state.
  */
  const isLoading = false;
  const isRefetching = false;
  const Metafields = [
    {
      name: "Date of birth",
      key: "dob",
      namespace: "custom",
      description: "Bla bla bla",
      contentType: "date"
    }
  ];

  const metafieldMarkup = Metafields?.length ? (
    <MetafieldIndex metafields={Metafields} loading={isRefetching}/>
  ) : null;

  /* loadingMarkup uses the loading component from AppBridge and components from Polaris  */
  const loadingMarkup = isLoading ? (
    <Card sectioned>
      <Loading />
      <SkeletonBodyText />
    </Card>
  ) : null;

  /* Use Polaris Card and EmptyState components to define the contents of the empty state */
  const emptyStateMarkup =
    !isLoading && !Metafields?.length ? (
      <Card sectioned>
        <EmptyState
          heading="Create unique advanced customer settings"
          /* This button will take the user to a Create a QR code page */
          action={{
            content: "Create new metafield",
            onAction: () => navigate("/metafields/new"),
          }}
          image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
        >
          <p>
            Allow customers to enter additional information in the customer account page and store them as metafields.
          </p>
        </EmptyState>
      </Card>
    ) : null;

  /*
    Use Polaris Page and TitleBar components to create the page layout,
    and include the empty state contents set above.
  */
  return (
    <Page fullWidth={!!metafieldMarkup}>
      <TitleBar
        title="Metafields"
        primaryAction={{
          content: "Create new metafield",
          onAction: () => navigate("/metafields/new"),
        }}
      />
      <Layout>
        <Layout.Section>
          {loadingMarkup}
          {metafieldMarkup}
          {emptyStateMarkup}
        </Layout.Section>
      </Layout>
    </Page>
  );
}
