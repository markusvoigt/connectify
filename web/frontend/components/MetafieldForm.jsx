import { useState, useCallback } from "react";
import {
  Banner,
  Card,
  Form,
  FormLayout,
  TextField,
  Button,
  Select,
  Thumbnail,
  Icon,
  Stack,
  TextStyle,
  Layout,
  EmptyState,
  ChoiceList,
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
import { useForm, useField, notEmptyString, useList } from "@shopify/react-form";


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
  /*
    This is a placeholder function that is triggered when the user hits the "Save" button.

    It will be replaced by a different function when the frontend is connected to the backend.
  */
  const onSubmit = useCallback(
    (body) => {
     // (async () => {
        const parsedBody = body;
        if (!Metafield){
          // create new definition
        }else{
          // update existing definition
        }
        console.log(`Metafield: ${JSON.stringify(Metafield)}`);
        console.log(`parsedBody: ${JSON.stringify(parsedBody)}`);
     // })
    });

  /*
    Sets up the form state with the useForm hook.

    Accepts a "fields" object that sets up each individual field with a default value and validation rules.

    Returns a "fields" object that is destructured to access each of the fields individually, so they can be used in other parts of the component.

    Returns helpers to manage form state, as well as component state that is based on form state.
  */
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

  const handleContentTypeChange = useCallback((type) => {
    contentType.onChange(type);
  }, []);


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
                <Select
                    label="Content Type"
                    options={options}
                    onchange={handleContentTypeChange}
                    value={contentType.value}
                    labelHidden
                    />
              </Card>

            </FormLayout>
          </Form>
        </Layout.Section>
      </Layout>
  );
}


