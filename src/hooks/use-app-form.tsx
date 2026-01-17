// https://tanstack.com/form/latest/docs/framework/react/quick-start
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createFormHook, createFormHookContexts } from "@tanstack/react-form-nextjs";

const { fieldContext, formContext } = createFormHookContexts();

// Allow us to bind components to the form to keep type safety but reduce production boilerplate
// Define this once to have a generator of consistent form instances throughout your app
export const { useAppForm } = createFormHook({
  fieldComponents: {
    Input,
  },
  formComponents: {
    Button,
  },
  fieldContext,
  formContext,
});
