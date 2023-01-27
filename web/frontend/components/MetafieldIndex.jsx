import { useNavigate } from "@shopify/app-bridge-react";
import {
  Card,
  IndexTable,
  Stack,
  TextStyle,
  UnstyledLink,
} from "@shopify/polaris";

import { useMedia } from "@shopify/react-hooks";

function SmallScreenCard({
  name,
  key,
  namespace,
  description,
  type,
  navigate,
}) {
  return (
    <UnstyledLink onClick={() => navigate(`/metafields/${key}`)}>
      <div
        style={{ padding: "0.75rem 1rem", borderBottom: "1px solid #E1E3E5" }}
      >
        <Stack>
          <Stack.Item fill>
            <Stack vertical={true}>
              <Stack.Item>
                <p>
                  <TextStyle variation="strong">{truncate(name, 35)}</TextStyle>
                </p>
                <p>{truncate(description, 35)}</p>
              </Stack.Item>
              <div style={{ display: "flex" }}>
                <div style={{ flex: "3" }}>
                  <TextStyle variation="subdued">Namespace and key</TextStyle>
                  <p>{namespace + "." + key}</p>
                </div>
                <div style={{ flex: "2" }}>
                  <TextStyle variation="subdued">Content Type:</TextStyle>
                  <p>{type.name}</p>
                </div>
              </div>
            </Stack>
          </Stack.Item>
        </Stack>
      </div>
    </UnstyledLink>
  );
}

export function MetafieldIndex({ Metafields, loading }) {
  const navigate = useNavigate();

  const isSmallScreen = useMedia("(max-width: 640px)");

  const smallScreenMarkup = Metafields.map((Metafield) => (
    <SmallScreenCard key={Metafield.key} navigate={navigate} {...Metafield} />
  ));

  const resourceName = {
    singular: "Metafield",
    plural: "Metafields",
  };

  const rowMarkup = Metafields.map(
    ({ key, name, namespace, description, type }, index) => {
      return (
        <IndexTable.Row
          id={key}
          key={key}
          position={index}
          onClick={() => {
            navigate(`/metafields/${key}`);
          }}
        >
          <IndexTable.Cell>
            <UnstyledLink data-primary-link url={`/metafields/${key}`}>
              {truncate(name, 25)}
            </UnstyledLink>
          </IndexTable.Cell>
          <IndexTable.Cell>{namespace + "." + key}</IndexTable.Cell>
          <IndexTable.Cell>{description}</IndexTable.Cell>
          <IndexTable.Cell>{type.name}</IndexTable.Cell>
        </IndexTable.Row>
      );
    }
  );

  return (
    <Card>
      {isSmallScreen ? (
        smallScreenMarkup
      ) : (
        <IndexTable
          resourceName={resourceName}
          itemCount={Metafields.length}
          headings={[
            { title: "Name" },
            { title: "Namespace and key" },
            { title: "Description" },
            { title: "Content Type" },
          ]}
          selectable={false}
          loading={loading}
        >
          {rowMarkup}
        </IndexTable>
      )}
    </Card>
  );
}


function truncate(str, n) {
  return str.length > n ? str.substr(0, n - 1) + "…" : str;
}
