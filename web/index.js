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
  res.status(200).send(metaFieldDefinitions);
});

app.post("/api/metafieldCreate", async (_req, res) => {
  const client = new shopify.api.clients.Graphql({
    session: res.locals.shopify.session,
  });
  try {
    const response = await client.query({
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
            type: JSON.stringify(generateType(_req.body.contentType)),
            visibleToStorefrontApi: true,
          },
        },
      },
    });
    console.log(JSON.stringify(response));
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
    client.query({
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
            type: JSON.stringify(generateType(_req.body.contentType)),
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

app.get("/test", async (_req, res) => {
  const headers = _req.headers;
  const shopDomain = "" + headers["x-shop-domain"];
  const sessions = await shopify.config.sessionStorage.findSessionsByShop(
    shopDomain
  );
  /*
  if (sessions.length > 0) {
    const countData = await shopify.api.rest.Product.count({
      session: sessions[0],
    });
    res.status(200).send(countData);
  } else {
    res.status(200).send("No session found");
  }
  */
  const metaFieldDefinitions = await getMetafieldDefinitionsForShop();
  res.status(200).send(metaFieldDefinitions);
});

async function getSessionForShop(shop = "markusvoigt.myshopify.com") {
  const sessions = await shopify.config.sessionStorage.findSessionsByShop(shop);
  if (sessions.length > 0) {
    return sessions[0];
  }
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

function generateType(type) {
  switch (type) {
    case "date":
      return {
        name: "date",
        category: "DATE_TIME",
        supportsDefinitionMigration: true,
      };
    case "number_integer":
      return {
        name: "number_integer",
        category: "NUMBER",
        supportsDefinitionMigration: true,
      };
    case "single_line_text_field":
      return {
        name: "single_line_text_field",
        category: "STRING",
        supportsDefinitionMigration: true,
      };
    case "single_line_text_field":
      return {
        name: "multi_line_text_field",
        category: "STRING",
        supportsDefinitionMigration: true,
      };
    case "json":
      return {
        name: "json",
        category: "STRING",
        supportsDefinitionMigration: true,
      };
  }
}
