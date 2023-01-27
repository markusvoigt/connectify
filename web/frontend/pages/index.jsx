import { useNavigate, TitleBar, Loading } from "@shopify/app-bridge-react";
import {
  Card,
  EmptyState,
  Layout,
  Page,
  SkeletonBodyText,
} from "@shopify/polaris";
import { MetafieldIndex } from "../components";
import { useAppQuery } from "../hooks";



export default function HomePage() {
  const navigate = useNavigate();


  const {
    data: Metafields,
    isLoading,
    isRefetching,
  } = useAppQuery({
    url: "/api/metafields",
  });

  const metafieldMarkup = Metafields?.length ? (
    <MetafieldIndex Metafields={Metafields} loading={isRefetching}/>
  ) : null;


  const loadingMarkup = isLoading ? (
    <Card sectioned>
      <Loading />
      <SkeletonBodyText />
    </Card>
  ) : null;

  const emptyStateMarkup =
    !isLoading && !Metafields?.length ? (
      <Card sectioned>
        <EmptyState
          heading="Create unique advanced customer settings"
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

  return (
    <Page fullWidth={!!metafieldMarkup}>
      <TitleBar
        title="Public Customer Metafields"
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
