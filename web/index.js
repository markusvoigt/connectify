// @ts-check
import { join } from "path";
import { readFileSync } from "fs";
import express from "express";
import serveStatic from "serve-static";
import shopify from "./shopify.js";
import productCreator from "./product-creator.js";
import GDPRWebhookHandlers from "./gdpr.js";
import "@shopify/shopify-api/adapters/node";
import { Session } from "@shopify/shopify-api";

const PORT = parseInt(process.env.BACKEND_PORT || process.env.PORT, 10);

const STATIC_PATH =
  process.env.NODE_ENV === "production"
    ? `${process.cwd()}/frontend/dist`
    : `${process.cwd()}/frontend/`;

const app = express();

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

const CUSTOMER_UPDATE_MUTATION = `
mutation customerUpdate($input: CustomerInput!) {
  customerUpdate(input: $input) {
    customer {
      id
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

app.get("/submit", async (_req, res) => {
  // Auth by Shopify App Proxy
  const user = _req.query.logged_in_customer_id;
  if (!user) {
    res.status(401).send("Not authtenticated");
  }
  const headers = _req.headers;
  const shopDomain = "" + headers["x-shop-domain"];
  const sessions = await shopify.config.sessionStorage.findSessionsByShop(
    shopDomain
  );
  const currentMetafields = getMetafieldsForCustomer(user, shopDomain);
  res.send(JSON.stringify(currentMetafields));
  // get current metafields
  // update for updates
  // create new ones for new values
  // send response
});

app.get("/test", async (_req, res) => {
  const headers = _req.headers;
  const shopDomain = "" + headers["x-shop-domain"];
  const sessions = await shopify.config.sessionStorage.findSessionsByShop(
    shopDomain
  );
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
  }
}

async function getMetafieldsForCustomer(
  customerID,
  shop = "markusvoigt.myshopify.com"
) {
  const session = await getSessionForShop(shop);

  const client = new shopify.api.clients.Graphql({
    session,
  });
  // gid://shopify/Customer/
  try {
    const response = await client.query({
      data: {
        query: CUSTOMER_METAFIELDS_QUERY,
        variables: {
          customerID: "gid://shopify/Customer/" + customerID,
        },
      },
    });
    console.log(JSON.stringify(response));
  } catch (e) {
    console.log(e);
    return [];
  }
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

app.get("/api/products/create", async (_req, res) => {
  let status = 200;
  let error = null;

  try {
    await productCreator(res.locals.shopify.session);
  } catch (e) {
    console.log(`Failed to process products/create: ${e.message}`);
    status = 500;
    error = e.message;
  }
  res.status(status).send({ success: status === 200, error });
});

app.use(serveStatic(STATIC_PATH, { index: false }));

app.use("/*", shopify.ensureInstalledOnShop(), async (_req, res, _next) => {
  return res
    .status(200)
    .set("Content-Type", "text/html")
    .send(readFileSync(join(STATIC_PATH, "index.html")));
});

app.listen(PORT);
