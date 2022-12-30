import { useState, useCallback } from "react";
import {
  Banner,
  Card,
  Form,
  FormLayout,
  TextField,
  Button,
  ChoiceList,
  Select,
  Thumbnail,
  Icon,
  Stack,
  TextStyle,
  Layout,
  EmptyState,
} from "@shopify/polaris";
import {
  ContextualSaveBar,
  ResourcePicker,
  useAppBridge,
  useNavigate,
} from "@shopify/app-bridge-react";
import { ImageMajor, AlertMinor } from "@shopify/polaris-icons";

/* Import the useAuthenticatedFetch hook included in the Node app template */
import { useAuthenticatedFetch, useAppQuery } from "../hooks";

/* Import custom hooks for forms */
import { useForm, useField, notEmptyString } from "@shopify/react-form";



export function MetafieldForm({ Metafield: InitialMetafield }) {
  const [Metafield, setMetafield] = useState(InitialMetafield);
  const [showResourcePicker, setShowResourcePicker] = useState(false);
  const navigate = useNavigate();
  const appBridge = useAppBridge();
  const fetch = useAuthenticatedFetch();

  /*
    This is a placeholder function that is triggered when the user hits the "Save" button.

    It will be replaced by a different function when the frontend is connected to the backend.
  */
  const onSubmit = (body) => console.log("submit", body);

  /*
    Sets up the form state with the useForm hook.

    Accepts a "fields" object that sets up each individual field with a default value and validation rules.

    Returns a "fields" object that is destructured to access each of the fields individually, so they can be used in other parts of the component.

    Returns helpers to manage form state, as well as component state that is based on form state.
  */
  const {
    fields: {
      name,
      namespaceAndKey,
      description,
      contentType
    },
    dirty,
    reset,
    submitting,
    submit,
    makeClean,
  } = useForm({
    fields: {
      name: useField({
        value: Metafield?.name || "",
        validates: [notEmptyString("Please provide a name.")],
      }),
      namespaceAndKey: useField({
        value: Metafield?.namespaceAndKey || "",
        validates: [notEmptyString("Please provide the namespace and key.")],
      }),
      description: useField({
        value: Metafield?.description || ""
      }),
      contentType: useField({
        value: Metafield?.conte || ""
      }),
    },
    onSubmit,
  });




  /* The form layout, created using Polaris and App Bridge components. */
  return (
      <Layout>
        <Layout.Section>
          <Form>
            <ContextualSaveBar
              saveAction={{
                label: "Save",
                onAction: submit,
                loading: submitting,
                disabled: submitting,
              }}
              discardAction={{
                label: "Discard",
                onAction: reset,
                loading: submitting,
                disabled: submitting,
              }}
              visible={dirty}
              fullWidth
            />
            <FormLayout>
              <Card sectioned title="name">
                <TextField
                  {...name}
                  label="Name"
                  labelHidden
                  helpText="Name of the metafield"
                />
              </Card>

              <Card sectioned title="namespaceAndKey">
                <TextField
                  {...namespaceAndKey}
                  label="Namespace and Key"
                  labelHidden
                  helpText="Used to reference this metafield"
                />
              </Card>
              <Card sectioned title="description">
                <TextField
                  {...description}
                  label="Description"
                  labelHidden
                  helpText="Used to for internal reference"
                />
              </Card>

            </FormLayout>
          </Form>
        </Layout.Section>
      </Layout>
  );
}

/* Builds a URL to the selected product */
function productViewURL({ host, productHandle, discountCode }) {
  const url = new URL(host);
  const productPath = `/products/${productHandle}`;

  /*
    If a discount is selected, then build a URL to the selected discount that redirects to the selected product: /discount/{code}?redirect=/products/{product}
  */
  if (discountCode) {
    url.pathname = `/discount/${discountCode}`;
    url.searchParams.append("redirect", productPath);
  } else {
    url.pathname = productPath;
  }

  return url.toString();
}

/* Builds a URL to a checkout that contains the selected product */
function productCheckoutURL({ host, variantId, quantity = 1, discountCode }) {
  const url = new URL(host);
  const id = variantId.replace(
    /gid:\/\/shopify\/ProductVariant\/([0-9]+)/,
    "$1"
  );

  url.pathname = `/cart/${id}:${quantity}`;

  /* Builds a URL to a checkout that contains the selected product with a discount code applied */
  if (discountCode) {
    url.searchParams.append("discount", discountCode);
  }

  return url.toString();
}
