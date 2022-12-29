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
  res.status(200).send(JSON.stringify(metaFieldDefinitions));
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
            key,
            description,
            type{
              name
            }
          }
        }
      }
    }`,
  });
  const metaFieldDefinitions = [];
  console.log(JSON.stringify(response.body.data.metafieldDefinitions));
  for (const definition in response.body.data.metafieldDefinitions.edges) {
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
