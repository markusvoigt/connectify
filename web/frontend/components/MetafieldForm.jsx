import { useState, useCallback } from "react";
import {
  Card,
  Form,
  FormLayout,
  TextField,
  Button,
  Layout,
  ChoiceList,
} from "@shopify/polaris";
import {
  ContextualSaveBar,
  useAppBridge,
  useNavigate,
} from "@shopify/app-bridge-react";

/* Import the useAuthenticatedFetch hook included in the Node app template */
import { useAuthenticatedFetch, useAppQuery } from "../hooks";

/* Import custom hooks for forms */
import { useForm, useField, notEmptyString } from "@shopify/react-form";


const options = [
    {label: 'Date', value: "date"},
    {label: 'Number Integer', value: 'number_integer'},
    {label: 'String', value: 'single_line_text_field'},
    {label: 'Multi line text', value: 'multi_line_text_field'},
    {label: "JSON", value:"json"},
  ];

export function MetafieldForm({ Metafield: InitialMetafield }) {
  const [Metafield, setMetafield] = useState(InitialMetafield);
  const navigate = useNavigate();
  const appBridge = useAppBridge();
  const fetch = useAuthenticatedFetch();

  const onSubmit = (body) => {
      (async () => {
        const parsedBody = body;
        if (Array.isArray(parsedBody.contentType)) parsedBody.contentType = parsedBody.contentType[0];

        const url = Metafield ? "/api/metafieldUpdate" : "/api/metafieldCreate"

        const response = await fetch(url, {
          method:"POST",
          body: JSON.stringify(parsedBody),
          headers: { "Content-Type": "application/json" },
        });
        makeClean();
        navigate(`/`);
      
    })(Metafield);
  };

    const deleteMetafield = () => {
      (async () => {
        const response = await fetch("/api/metafieldDelete", {
          method:"POST",
          body: JSON.stringify({key: Metafield.key}),
          headers: { "Content-Type": "application/json" },
        });
        navigate(`/`);
      })(Metafield);
    }


  const {
    fields: {
      name,
      namespace,
      key,
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
      namespace: useField({
        value: Metafield?.namespace || "custom",
        validates: [notEmptyString("Please provide the namespace.")],
      }),
      key: useField({
        value: Metafield?.key || "",
        validates: [notEmptyString("Please provide the key.")],
      }),
      description: useField(Metafield?.description || ""
      ),
      contentType: useField(Metafield?.type.name || "single_line_text_field")
    },
    onSubmit,
  });



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
              <Card sectioned title="Name">
                <TextField
                  {...name}
                  label="Name"
                  labelHidden
                  helpText="Name of the metafield"
                />
              </Card>

              <Card sectioned title="Namespace (e.g. custom)">
                <TextField
                  {...namespace}
                  label="Namespace"
                  labelHidden
                  helpText="Used to reference this metafield"
                />
              </Card>
              <Card sectioned title="Key">
                <TextField
                  {...key}
                  disabled={Metafield?.key}
                  label="Key"
                  labelHidden
                  helpText="Used to reference this metafield"
                />
              </Card>
              <Card sectioned title="Description">
                <TextField
                  {...description}
                  label="Description"
                  labelHidden
                  helpText="Used to for internal reference"
                />
              </Card>
              <Card sectioned title="Content type for the metafield">
                    <ChoiceList
                    title="Scan destination"
                    titleHidden
                    choices={options}
                    selected={contentType.value}
                    onChange={contentType.onChange}
                  />
              </Card>
            </FormLayout>
          </Form>
        </Layout.Section>
        <Layout.Section>
          {Metafield?.key && (
            <Button
              outline
              destructive
              onClick={deleteMetafield}
            >
              Delete metafield
            </Button>
          )}
          </Layout.Section>
      </Layout>
  );
          }
