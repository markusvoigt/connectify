// @ts-check
import { join } from "path";
import { readFileSync } from "fs";
import express from "express";
import cors from "cors";
import serveStatic from "serve-static";
import shopify from "./shopify.js";
import GDPRWebhookHandlers from "./gdpr.js";
import "@shopify/shopify-api/adapters/node";
import { ApiVersion } from "@shopify/shopify-api";
import axios from "axios";

const PORT = parseInt(process.env.BACKEND_PORT || process.env.PORT, 10);

const STATIC_PATH =
  process.env.NODE_ENV === "production"
    ? `${process.cwd()}/frontend/dist`
    : `${process.cwd()}/frontend/`;

const METAFIELDS_QUERY = `query{
      metafieldDefinitions(ownerType:CUSTOMER,first:10){
        edges{
          node{
            name,
            key,
            description,
            namespace,
            type{
              name
            }
          }
        }
      }
    }`;

const METAFIELD_CREATE_QUERY = `
    mutation metafieldDefinitionCreate($definition: MetafieldDefinitionInput!) {
      metafieldDefinitionCreate(definition: $definition) {
        createdDefinition {
          key
        }
        userErrors {
          field
          message
        }
      }
    }`;

const METAFIELD_UPDATE_QUERY = `
    mutation metafieldDefinitionUpdate($definition: MetafieldDefinitionUpdateInput!) {
      metafieldDefinitionUpdate(definition: $definition) {
        updatedDefinition {
          key
        }
        userErrors {
          field
          message
        }
      }
    }`;

const APP_INSTALLATION_QUERY = `
    {
      currentAppInstallation {
        id
      }
    }`;

const PRIVATE_METAFIELD_UPDATE_MUTATION = `
    mutation CreateAppOwnedMetafield($metafieldsSetInput: [MetafieldsSetInput!]!) {
      metafieldsSet(metafields: $metafieldsSetInput) {
        metafields {
          id
          namespace
          key
        }
        userErrors {
          field
          message
        }
      }
    }`;

const CUSTOMER_METAFIELDS_QUERY = `query($customerID:ID!){
      customer(id: $customerID){
        email,
        metafields(first:10){
          edges{
            node{
              id,
              namespace,
              key,
              value,
              definition{
                id
              }
            }
          }
        }
      }
    }`;

const CUSTOMER_METAFIELDS_UPSERT_MUTATION = `mutation customerUpdate($input: CustomerInput!) {
      customerUpdate(input: $input) {
        customer {
         id,
         metafields(first:1){
          edges{
            node{
              id,
              key,
              value
            }
          }
        }
        }
        userErrors {
          field
          message
        }
      }
    }`;

const METAFIELD_DELETE_MUTATION = `mutation metafieldDelete($input: MetafieldDeleteInput!) {
      metafieldDelete(input: $input) {
        deletedId
        userErrors {
          field
          message
        }
      }
    }`;

const METAFIELD_DEFINITION_DELETE_MUTATION = `
mutation metafieldDefinitionDelete($id: ID!) {
  metafieldDefinitionDelete(id: $id, deleteAllAssociatedMetafields: true) {
    deletedDefinitionId
    userErrors {
      field
      message
    }
  }
}`;

const STOREFRONT_ACCESS_TOKEN_CREATE_MUTATION = `
mutation storefrontAccessTokenCreate($input: StorefrontAccessTokenInput!) {
  storefrontAccessTokenCreate(input: $input) {
    storefrontAccessToken {
      accessToken
    }
    userErrors {
      field
      message
    }
  }
}`;

const app = express();

app.use((req, res, next) => {
  const shop = req.query.shop;
  if (shop) {
    res.setHeader(
      "Content-Security-Policy",
      `frame-ancestors https://${shop} https://admin.shopify.com;`
    );
  }
  next();
});

// Set up Shopify authentication and webhook handling
app.get(shopify.config.auth.path, shopify.auth.begin());
app.get(
  shopify.config.auth.callbackPath,
  shopify.auth.callback(),
  shopify.redirectToShopifyOrAppRoot()
);
app.post(
  shopify.config.webhooks.path,
  shopify.processWebhooks({ webhookHandlers: GDPRWebhookHandlers })
);

// All endpoints after this point will require an active session
app.use("/api/*", shopify.validateAuthenticatedSession());
app.use(express.json());

app.get("/api/products/count", async (_req, res) => {
  const countData = await shopify.api.rest.Product.count({
    session: res.locals.shopify.session,
  });

  res.status(200).send(countData);
});

app.get("/api/metafields/:key", async (_req, res) => {
  const client = new shopify.api.clients.Graphql({
    session: res.locals.shopify.session,
  });
  const response = await client.query({
    data: METAFIELDS_QUERY,
  });
  const metaFieldDefinitions = [];
  for (let definition of response.body.data.metafieldDefinitions.edges) {
    metaFieldDefinitions.push(definition.node);
  }
  const filterd = metaFieldDefinitions.filter(
    (definition) => definition.key === _req.params.key
  );
  res.status(200).send(filterd[0]);
});

app.get("/api/metafields", async (_req, res) => {
  const client = new shopify.api.clients.Graphql({
    session: res.locals.shopify.session,
  });
  const response = await client.query({
    data: METAFIELDS_QUERY,
  });

  const metaFieldDefinitions = [];
  for (let definition of response.body.data.metafieldDefinitions.edges) {
    metaFieldDefinitions.push(definition.node);
  }
  await writeMetaFieldsForShop(
    res.locals.shopify.shopDomain,
    metaFieldDefinitions
  );
  res.status(200).send(metaFieldDefinitions);
});

app.post("/api/metafieldCreate", async (_req, res) => {
  const client = new shopify.api.clients.Graphql({
    session: res.locals.shopify.session,
  });
  try {
    await client.query({
      data: {
        query: METAFIELD_CREATE_QUERY,
        variables: {
          definition: {
            description: _req.body.description,
            key: _req.body.key,
            name: _req.body.name,
            namespace: _req.body.namespace,
            ownerType: "CUSTOMER",
            pin: false,
            type: _req.body.contentType,
            visibleToStorefrontApi: true,
          },
        },
      },
    });
  } catch (e) {
    console.log(e);
    res.status(500).send(e.message);
  }
  res.status(200).send(`Metafield with key ${_req.body.key} created`);
});

app.post("/api/metafieldUpdate", async (_req, res) => {
  const client = new shopify.api.clients.Graphql({
    session: res.locals.shopify.session,
  });
  try {
    await client.query({
      data: {
        query: METAFIELD_UPDATE_QUERY,
        variables: {
          definition: {
            description: _req.body.description,
            key: _req.body.key,
            name: _req.body.name,
            namespace: _req.body.namespace,
            ownerType: "CUSTOMER",
            pin: false,
            type: _req.body.contentType,
            visibleToStorefrontApi: true,
          },
        },
      },
    });
  } catch (e) {
    res.status(500).send(e.message);
  }
  res.status(200).send(`Metafield with key ${_req.body.key} updated`);
});

app.post("/api/metafieldDelete", async (_req, res) => {
  const client = new shopify.api.clients.Graphql({
    session: res.locals.shopify.session,
  });

  const metafieldDefinitions = await getMetafieldDefinitionsForShop();

  try {
    await client.query({
      data: {
        query: METAFIELD_DEFINITION_DELETE_MUTATION,
        variables: {
          id: metafieldDefinitions.find((m) => m.key == _req.body.key).id,
        },
      },
    });
  } catch (e) {
    console.log(JSON.stringify(e));
    res.status(500).send(e.message);
    return;
  }
  res.status(200).send(`Metafield with key ${_req.body.key} deleted`);
});

app.post("/submit", async (_req, res) => {
  // Auth by Shopify App Proxy
  const user = _req.query.logged_in_customer_id;
  if (!user) {
    res.status(401).send("Not authtenticated");
  }
  const headers = _req.headers;
  const shopDomain = "" + headers["x-shop-domain"];
  const session = await getSessionForShop(shopDomain);
  const updates = _req.body.updates;

  const currentMetafields = await getMetafieldsForCustomer(user, session);
  for (let metafield of currentMetafields) {
    const value = updates.find((m) => m.key == metafield.key).value || "";
    if (value == "") deleteMetafield(session, metafield.id);
    else
      await upsertMetafield(
        session,
        user,
        metafield.key,
        updates.find((m) => m.key == metafield.key).value,
        metafield.type,
        metafield.id
      );
  }
  for (let update of updates) {
    // if not already in metafields
    // upsert without ID aka insert
    if (!currentMetafields.find((m) => m.key == update.key)) {
      await upsertMetafield(
        session,
        user,
        update.key,
        update.value,
        update.type,
        null
      );
    }
  }
  res.status(200).send("Metafields updated");
});

async function deleteMetafield(session, id) {
  const client = new shopify.api.clients.Graphql({
    session,
  });
  const response = await client.query({
    data: {
      query: METAFIELD_DELETE_MUTATION,
      variables: {
        input: {
          id,
        },
      },
    },
  });
}

async function upsertMetafield(
  session,
  customerID,
  key,
  value,
  type,
  metafieldID
) {
  const client = new shopify.api.clients.Graphql({
    session,
  });

  const gqlID =
    customerID[0] != "g" ? "gid://shopify/Customer/" + customerID : customerID;
  const response = await client.query({
    data: {
      query: CUSTOMER_METAFIELDS_UPSERT_MUTATION,
      variables: {
        input: {
          id: gqlID,
          metafields: [
            {
              id: metafieldID,
              key,
              namespace: "custom",
              type,
              value,
            },
          ],
        },
      },
    },
  });
}

app.get("/test", async (_req, res) => {
  const headers = _req.headers;
  const shopDomain = "" + headers["x-shop-domain"];
  const user = _req.query.logged_in_customer_id
    ? _req.query.logged_in_customer_id
    : "unknown";
  res
    .status(200)
    .send(`You are calling me from ${shopDomain} and you are ${user}`);
});

async function getSessionForShop(shop = "markusvoigt.myshopify.com") {
  const sessions = await shopify.config.sessionStorage.findSessionsByShop(shop);
  if (sessions.length > 0) {
    return sessions[0];
  } else {
    shopify.config.auth.callbackPath,
      shopify.auth.callback(),
      shopify.redirectToShopifyOrAppRoot();
  }
}

async function getMetafieldsForCustomer(customerID, session) {
  const client = new shopify.api.clients.Graphql({
    session,
  });
  const gqlID =
    customerID[0] != "g" ? "gid://shopify/Customer/" + customerID : customerID;

  const response = await client.query({
    data: {
      query: CUSTOMER_METAFIELDS_QUERY,
      variables: {
        customerID: gqlID,
      },
    },
  });

  const currentMetafields = [];
  for (let metafield of response.body.data.customer.metafields.edges) {
    currentMetafields.push(metafield.node);
  }
  return currentMetafields;
}

async function getMetafieldDefinitionsForShop(
  shop = "markusvoigt.myshopify.com"
) {
  const session = await getSessionForShop(shop);
  const client = new shopify.api.clients.Graphql({
    session,
  });
  const response = await client.query({
    data: `query{
      metafieldDefinitions(ownerType:CUSTOMER,first:10){
        edges{
          node{
            id,
            name,
            key,
            description,
            namespace,
            type{
              name
            }
          }
        }
      }
    }`,
  });
  const metaFieldDefinitions = [];
  for (let definition of response.body.data.metafieldDefinitions.edges) {
    metaFieldDefinitions.push(definition.node);
  }
  return metaFieldDefinitions;
}

async function getAppInstallationIdForShop(shop = "markusvoigt.myshopify.com") {
  const session = await getSessionForShop(shop);
  const client = new shopify.api.clients.Graphql({
    session,
  });
  const response = await client.query({
    data: APP_INSTALLATION_QUERY,
  });
  return response.body.data.currentAppInstallation.id;
}

async function writeMetaFieldsForShop(
  shop = "markusvoigt.myshopify.com",
  metaFieldDefinitions
) {
  const session = await getSessionForShop(shop);
  const client = new shopify.api.clients.Graphql({
    session,
  });
  const appInstallationID = await getAppInstallationIdForShop(shop);
  try {
    const response = await client.query({
      data: {
        query: PRIVATE_METAFIELD_UPDATE_MUTATION,
        variables: {
          metafieldsSetInput: [
            {
              namespace: "connectify",
              key: "metafields",
              type: "json",
              value: JSON.stringify(metaFieldDefinitions),
              ownerId: appInstallationID,
            },
          ],
        },
      },
    });
  } catch (e) {
    console.log(e);
  }
}

// headless

app.options("/metafields", (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-Requested-With, content-type"
  );
  res.sendStatus(200);
});

app.post("/metafields", async (_req, res) => {
  const customerAccessToken = _req.body.customerAccessToken;
  const storefrontAccessToken = _req.body.storefrontAccessToken;
  const shop = _req.body.shop;
  if (!customerAccessToken || !storefrontAccessToken || !shop) {
    res.status(401).send("Missing data");
    return;
  }

  const customerID = await validateCustomer(
    customerAccessToken,
    storefrontAccessToken,
    shop
  );
  if (!customerID) {
    res.status(401).send("Invalid authentication");
    return;
  }
  const session = await getSessionForShop(shop);
  const allMetafields = await getMetafieldDefinitionsForShop(shop);
  const customerMetafields = await getMetafieldsForCustomer(
    customerID,
    session
  );

  for (let customerMetafield of customerMetafields) {
    const definition = allMetafields.find(
      (m) => m.key == customerMetafield.key
    );
    definition.value = customerMetafield.value;
    definition.customerMetafieldID = customerMetafield.id;
  }
  res
    .header("Access-Control-Allow-Origin", "*")
    .status(200)
    .send(allMetafields);
});

async function validateCustomer(
  customerAccessToken,
  storefrontAccessToken,
  shop
) {
  axios({
    headers: {
      "Content-Type": "application/json",
      "Shopify-Storefront-Private-Token": storefrontAccessToken,
    },
    method: "POST",
    data: {
      query: `{
        customer(customerAccessToken: "${customerAccessToken}") {
          id,
          email
        }
      }`,
      variables: {},
    },
    url: `https://${shop}/api/2023-01/graphql.json`,
  })
    .then((result) => {
      console.log(result.data.data.customer);
      if (!result.data.data.customer) return null;
      return result.data.data.customer.id;
    })
    .catch((error) => {
      console.log(error);
      return null;
    });
}

async function validateCustomerID(
  customerAccessToken,
  storefrontAccessToken,
  shop
) {
  const storefrontClient = new shopify.api.clients.Storefront({
    domain: shop,
    storefrontAccessToken: storefrontAccessToken,
    apiVersion: ApiVersion.October22,
  });
  try {
    let response = await storefrontClient.query({
      data: `{
    customer(customerAccessToken: "${customerAccessToken}") {
      id,
      email
    }
  }`,
    });
    if (!response.body.data.customer) return null;
    return response.body.data.customer.id;
  } catch (e) {
    console.log(e);
    return null;
  }
}

app.options("/submitChanges", (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-Requested-With, content-type"
  );
  res.sendStatus(200);
});

app.post("/submitChanges", async (_req, res) => {
  // Auth by customer access token
  const customerAccessToken = _req.body.customerAccessToken;
  const storefrontAccessToken = _req.body.storefrontAccessToken;
  const shop = _req.body.shop;
  if (!customerAccessToken || !storefrontAccessToken || !shop) {
    res.status(401).send("Missing data");
    return;
  }

  const customerID = await validateCustomerID(
    customerAccessToken,
    storefrontAccessToken,
    shop
  );
  const session = await getSessionForShop(shop);

  const updates = _req.body.updates;

  const currentMetafields = await getMetafieldsForCustomer(customerID, session);
  for (let metafield of currentMetafields) {
    const value = updates.find((m) => m.key == metafield.key).value || "";
    if (value == "") deleteMetafield(session, metafield.id);
    else
      await upsertMetafield(
        session,
        customerID,
        metafield.key,
        updates.find((m) => m.key == metafield.key).value,
        metafield.type,
        metafield.id
      );
  }
  for (let update of updates) {
    // if not already in metafields
    // upsert without ID aka insert
    if (!currentMetafields.find((m) => m.key == update.key)) {
      await upsertMetafield(
        session,
        customerID,
        update.key,
        update.value,
        update.type,
        null
      );
    }
  }
  res
    .header("Access-Control-Allow-Origin", "*")
    .status(200)
    .send("Metafields updated");
});

app.get("/headlessdata/:customerAccesstoken", async (_req, res) => {
  const storefrontClient = await getStorefrontClientForShop();
  const customerAccessToken = _req.params["customerAccesstoken"];
  let response = await storefrontClient.query({
    data: `{
    customer(customerAccessToken: "${customerAccessToken}") {
      id,
      email
    }
  }`,
  });
  if (!response.body.data.customer.id) {
    res.status(403).send("Invalid customer access token");
    return;
  }
  const session = await getSessionForShop();
  const allMetafields = await getMetafieldDefinitionsForShop();
  const customerMetafields = await getMetafieldsForCustomer(
    response.body.data.customer.id,
    session
  );

  for (let customerMetafield of customerMetafields) {
    const definition = allMetafields.find(
      (m) => m.key == customerMetafield.key
    );
    definition.value = customerMetafield.value;
    definition.customerMetafieldID = customerMetafield.id;
  }

  res.status(200).send(allMetafields);
});

async function getStorefrontClientForShop(shop = "markusvoigt.myshopify.com") {
  const storefrontClient = new shopify.api.clients.Storefront({
    domain: shop,
    storefrontAccessToken: "d6fb8490870882a71ebb8914b72d7dcd",
    apiVersion: ApiVersion.October22,
  });
  return storefrontClient;
}

app.use(serveStatic(STATIC_PATH, { index: false }));

app.use("/*", shopify.ensureInstalledOnShop(), async (_req, res, _next) => {
  return res
    .status(200)
    .set("Content-Type", "text/html")
    .send(readFileSync(join(STATIC_PATH, "index.html")));
});

app.listen(PORT);
