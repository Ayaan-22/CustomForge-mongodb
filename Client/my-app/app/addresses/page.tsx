"use client";

import "@/app/forge-addresses.css";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { UserService } from "@/services/user-service";
import { safeRedirect } from "@/lib/safe-redirect";
import { requireSuccess } from "@/lib/query-result";
import {
  ADDRESS_FORM_FIELDS,
  addressToForm,
  addressFormPayload,
  emptyAddressForm,
  validateAddressForm,
  type AddressForm,
  type AddressFormErrors,
  type AddressFormField,
} from "@/lib/address-form";
import type { Address } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import {
  MapPin,
  Plus,
  Trash2,
  Check,
  CheckCircle2,
  Pencil,
  ArrowLeft,
  ShieldCheck,
  RefreshCw,
  AlertCircle,
  Phone,
  Save,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";

const fields: {
  field: AddressFormField;
  label: string;
  autoComplete: string;
  required?: boolean;
  maxLength: number;
  wide?: boolean;
  type?: string;
  help?: string;
}[] = [
  {
    field: "fullName",
    label: "Recipient name",
    autoComplete: "shipping name",
    required: true,
    maxLength: 120,
  },
  {
    field: "phoneNumber",
    label: "Phone number",
    autoComplete: "shipping tel",
    required: true,
    maxLength: 32,
    type: "tel",
    help: "Include the country code if needed. Use 7–32 characters.",
  },
  {
    field: "line1",
    label: "Street address",
    autoComplete: "shipping street-address",
    required: true,
    maxLength: 255,
    wide: true,
    help: "Include the full street address, building and apartment details.",
  },
  {
    field: "line2",
    label: "Additional address details",
    autoComplete: "off",
    maxLength: 255,
    wide: true,
    help: "Optional. Add a landmark or extra detail only if it is not already above.",
  },
  {
    field: "city",
    label: "City",
    autoComplete: "shipping address-level2",
    required: true,
    maxLength: 120,
  },
  {
    field: "state",
    label: "State / province",
    autoComplete: "shipping address-level1",
    required: true,
    maxLength: 120,
  },
  {
    field: "postalCode",
    label: "Postal code",
    autoComplete: "shipping postal-code",
    required: true,
    maxLength: 32,
  },
  {
    field: "country",
    label: "Country",
    autoComplete: "shipping country-name",
    required: true,
    maxLength: 120,
  },
];
type Feedback = { state: "success" | "error"; message: string };

export default function AddressesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect")
    ? safeRedirect(searchParams.get("redirect"), "/checkout")
    : null;
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(searchParams.get("new") === "true");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<AddressForm>(emptyAddressForm);
  const [baseline, setBaseline] = useState<AddressForm>(emptyAddressForm);
  const [fieldErrors, setFieldErrors] = useState<AddressFormErrors>({});
  const [touched, setTouched] = useState<
    Partial<Record<AddressFormField, boolean>>
  >({});
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Address | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const formHeading = useRef<HTMLHeadingElement>(null);
  const addButton = useRef<HTMLButtonElement>(null);
  const deleteButton = useRef<HTMLButtonElement | null>(null);
  const focusEditor = useRef(false);
  const focusAdd = useRef(false);
  const inFlight = useRef(false);
  const openedRequest = useRef<string | null>(null);
  const requestedEdit = searchParams.get("edit");
  const requestedNew = searchParams.get("new") === "true";
  const query = useQuery({
    queryKey: ["addresses"],
    queryFn: () => UserService.getAddresses().then(requireSuccess),
  });
  const addresses = query.data?.data ?? [];
  const dirty = ADDRESS_FORM_FIELDS.some(
    (field) => formData[field] !== baseline[field],
  );

  function clearValidation() {
    setFieldErrors({});
    setTouched({});
    setSubmitted(false);
    setFormError(null);
  }
  function startEditor(address?: Address) {
    const values = address ? addressToForm(address) : emptyAddressForm();
    setFormData(values);
    setBaseline(values);
    setEditingId(address?.id ?? null);
    setIsAdding(true);
    clearValidation();
    setFeedback(null);
    setLookupError(null);
    if (isAdding && editingId === (address?.id ?? null)) {
      formHeading.current?.focus({ preventScroll: true });
      formHeading.current?.scrollIntoView({ block: "start" });
    } else focusEditor.current = true;
  }
  function resetForm() {
    setFormData(emptyAddressForm());
    setBaseline(emptyAddressForm());
    setEditingId(null);
    setIsAdding(false);
    clearValidation();
    focusAdd.current = true;
  }
  useEffect(() => {
    if (focusEditor.current && isAdding) {
      focusEditor.current = false;
      formHeading.current?.focus({ preventScroll: true });
      formHeading.current?.scrollIntoView({ block: "start" });
    } else if (focusAdd.current && !isAdding) {
      focusAdd.current = false;
      addButton.current?.focus({ preventScroll: true });
    }
  }, [isAdding, editingId]);
  useEffect(() => {
    const request = requestedEdit
      ? `edit:${requestedEdit}`
      : requestedNew
        ? "new"
        : null;
    if (!request) {
      openedRequest.current = null;
      return;
    }
    if (openedRequest.current === request) return;
    if (requestedEdit && !query.data?.data) return;
    openedRequest.current = request;
    if (requestedEdit) {
      const address = query.data?.data?.find(
        (item) => item.id === requestedEdit,
      );
      if (address) {
        const values = addressToForm(address);
        setFormData(values);
        setBaseline(values);
        setEditingId(address.id);
        setIsAdding(true);
        setFieldErrors({});
        setTouched({});
        setSubmitted(false);
        setFormError(null);
        setLookupError(null);
        focusEditor.current = true;
      } else
        setLookupError(
          "That saved address was not found. Choose an address below or add a new one.",
        );
    } else {
      setFormData(emptyAddressForm());
      setBaseline(emptyAddressForm());
      setEditingId(null);
      setIsAdding(true);
      setFieldErrors({});
      setTouched({});
      setSubmitted(false);
      setFormError(null);
      setLookupError(null);
    }
    // A refetch with the same edit request never overwrites an active draft.
  }, [requestedEdit, requestedNew, query.data]);

  async function refreshAddresses() {
    await queryClient.invalidateQueries({ queryKey: ["addresses"] });
  }
  const addAddressMutation = useMutation({
    mutationFn: (data: ReturnType<typeof addressFormPayload>) =>
      UserService.addAddress(data).then(requireSuccess),
    onSuccess: async () => {
      await refreshAddresses();
      setFeedback({ state: "success", message: "Your new address is saved." });
      resetForm();
      toast.success("Address added successfully");
    },
  });
  const updateAddressMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: ReturnType<typeof addressFormPayload>;
    }) => UserService.updateAddress(id, data).then(requireSuccess),
    onSuccess: async () => {
      await refreshAddresses();
      setFeedback({
        state: "success",
        message: "Your address changes are saved.",
      });
      resetForm();
      toast.success("Address updated successfully");
    },
  });
  const deleteAddressMutation = useMutation({
    mutationFn: (id: string) =>
      UserService.deleteAddress(id).then(requireSuccess),
    onSuccess: async (_response, id) => {
      await refreshAddresses();
      if (editingId === id) resetForm();
      setDeleteTarget(null);
      setDeleteError(null);
      setFeedback({
        state: "success",
        message:
          "The saved address was removed. Existing orders keep their original shipping details.",
      });
      toast.success("Address deleted successfully");
    },
  });
  const setDefaultMutation = useMutation({
    mutationFn: (id: string) =>
      UserService.setDefaultAddress(id).then(requireSuccess),
    onSuccess: async () => {
      await refreshAddresses();
      setFeedback({
        state: "success",
        message: "Your default address was updated.",
      });
      toast.success("Default address updated");
    },
  });
  const saving =
    addAddressMutation.isPending || updateAddressMutation.isPending;
  const busy =
    saving || deleteAddressMutation.isPending || setDefaultMutation.isPending;

  function editField(field: AddressFormField, value: string) {
    const next = { ...formData, [field]: value };
    setFormData(next);
    setFormError(null);
    if (submitted || touched[field]) setFieldErrors(validateAddressForm(next));
  }
  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (inFlight.current || busy) return;
    const errors = validateAddressForm(formData);
    setFieldErrors(errors);
    setSubmitted(true);
    setFormError(null);
    const first = ADDRESS_FORM_FIELDS.find((field) => errors[field]);
    if (first) {
      formRef.current?.querySelector<HTMLElement>(`#address-${first}`)?.focus();
      return;
    }
    inFlight.current = true;
    try {
      const data = addressFormPayload(formData);
      if (editingId)
        await updateAddressMutation.mutateAsync({ id: editingId, data });
      else await addAddressMutation.mutateAsync(data);
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "Your address could not be saved. Please try again.",
      );
    } finally {
      inFlight.current = false;
    }
  }
  async function handleSetDefault(id: string) {
    if (inFlight.current || busy) return;
    inFlight.current = true;
    setFeedback(null);
    try {
      await setDefaultMutation.mutateAsync(id);
    } catch (error) {
      setFeedback({
        state: "error",
        message:
          error instanceof Error
            ? error.message
            : "The default address could not be changed. Please try again.",
      });
    } finally {
      inFlight.current = false;
    }
  }
  async function handleDelete() {
    if (inFlight.current || busy || !deleteTarget) return;
    const current =
      addresses.find((address) => address.id === deleteTarget.id) ??
      deleteTarget;
    if (current.isDefault) {
      setDeleteError(
        "Choose another default address before removing this one.",
      );
      return;
    }
    inFlight.current = true;
    setDeleteError(null);
    try {
      await deleteAddressMutation.mutateAsync(deleteTarget.id);
    } catch (error) {
      setDeleteError(
        error instanceof Error
          ? error.message
          : "This address could not be removed. Please try again.",
      );
    } finally {
      inFlight.current = false;
    }
  }
  const currentDeleteTarget =
    addresses.find((address) => address.id === deleteTarget?.id) ??
    deleteTarget;
  return (
    <div className="forge-address-management">
      <header className="forge-account-page-heading forge-address-heading">
        <div>
          <p className="forge-eyebrow">WHERE YOUR UPGRADES LAND.</p>
          <h1>Your shipping addresses.</h1>
          <p>
            Keep delivery details complete, choose a default and make the next
            checkout easier.
          </p>
        </div>
        {redirectTo && (
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => router.push(redirectTo)}
          >
            <ArrowLeft size={16} /> Back to checkout
          </Button>
        )}
      </header>
      <div className="forge-address-toolbar">
        <div>
          <MapPin size={18} />
          <span>
            {query.isLoading
              ? "Loading saved addresses…"
              : query.isError && !query.data
                ? "Saved addresses unavailable"
                : `${addresses.length} saved ${addresses.length === 1 ? "address" : "addresses"}`}
          </span>
          {query.isFetching && !query.isLoading && (
            <small role="status">Refreshing…</small>
          )}
        </div>
        <Button
          ref={addButton}
          disabled={busy || isAdding}
          onClick={() => startEditor()}
        >
          <Plus size={17} /> Add address
        </Button>
      </div>
      {feedback && (
        <p
          className={`forge-address-feedback is-${feedback.state}`}
          role={feedback.state === "error" ? "alert" : "status"}
        >
          {feedback.state === "success" ? (
            <CheckCircle2 size={17} />
          ) : (
            <AlertCircle size={17} />
          )}
          {feedback.message}
        </p>
      )}
      {lookupError && (
        <p className="forge-address-feedback is-error" role="alert">
          <AlertCircle size={17} />
          {lookupError}
        </p>
      )}
      {isAdding && (
        <section
          className="forge-address-editor"
          aria-labelledby="address-editor-title"
        >
          <div className="forge-address-editor-heading">
            <span>
              <Pencil size={20} />
            </span>
            <div>
              <p className="forge-eyebrow">
                {editingId
                  ? "REFINE YOUR DELIVERY DETAILS"
                  : "SAVE YOUR NEXT DELIVERY POINT"}
              </p>
              <h2 id="address-editor-title" ref={formHeading} tabIndex={-1}>
                {editingId ? "Edit saved address." : "Add a shipping address."}
              </h2>
              <p>
                Required fields are marked. Include all the details needed to
                find your delivery point.
              </p>
            </div>
          </div>
          <form ref={formRef} noValidate onSubmit={handleSubmit}>
            <div className="forge-address-field-grid">
              {fields.map(
                ({
                  field,
                  label,
                  autoComplete,
                  required,
                  maxLength,
                  wide,
                  type,
                  help,
                }) => {
                  const error =
                    submitted || touched[field]
                      ? fieldErrors[field]
                      : undefined;
                  const describedBy =
                    [
                      help ? `address-${field}-help` : null,
                      error ? `address-${field}-error` : null,
                    ]
                      .filter(Boolean)
                      .join(" ") || undefined;
                  const props = {
                    id: `address-${field}`,
                    name: field,
                    value: formData[field],
                    autoComplete,
                    required,
                    maxLength,
                    disabled: busy,
                    "aria-invalid": !!error,
                    "aria-describedby": describedBy,
                    onChange: (
                      event: React.ChangeEvent<
                        HTMLInputElement | HTMLTextAreaElement
                      >,
                    ) => editField(field, event.target.value),
                    onBlur: () => {
                      setTouched((current) => ({ ...current, [field]: true }));
                      setFieldErrors(validateAddressForm(formData));
                    },
                  };
                  return (
                    <div
                      className={`forge-address-field${wide ? " is-wide" : ""}`}
                      key={field}
                    >
                      <Label htmlFor={`address-${field}`}>
                        {label}
                        {required ? (
                          <span aria-hidden="true">*</span>
                        ) : (
                          <small>Optional</small>
                        )}
                      </Label>
                      {field === "line1" ? (
                        <Textarea {...props} rows={3} />
                      ) : (
                        <Input {...props} type={type || "text"} />
                      )}{" "}
                      {help && (
                        <p
                          id={`address-${field}-help`}
                          className="forge-address-field-help"
                        >
                          {help}
                        </p>
                      )}
                      {error && (
                        <p
                          id={`address-${field}-error`}
                          className="forge-address-field-error"
                        >
                          {error}
                        </p>
                      )}
                    </div>
                  );
                },
              )}
            </div>
            {formError && (
              <p className="forge-address-feedback is-error" role="alert">
                <AlertCircle size={17} />
                {formError}
              </p>
            )}
            <div className="forge-address-form-footer">
              <p role="status">
                {saving
                  ? "Saving and refreshing your address list…"
                  : dirty
                    ? "You have unsaved address changes."
                    : editingId
                      ? "Your existing details are ready to edit."
                      : "Complete the required delivery details."}
              </p>
              <div>
                {dirty && (
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={busy}
                    onClick={() => {
                      setFormData({ ...baseline });
                      clearValidation();
                    }}
                  >
                    <RotateCcw size={15} /> Reset
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={resetForm}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={busy || (editingId !== null && !dirty)}
                >
                  <Save size={16} />
                  {saving ? (
                    <span className="forge-processing">
                      <i /> Saving…
                    </span>
                  ) : editingId ? (
                    "Save changes"
                  ) : (
                    "Save address"
                  )}
                </Button>
              </div>
            </div>
          </form>
        </section>
      )}
      {query.isError && (
        <div className="forge-address-load-error" role="alert">
          <AlertCircle size={25} />
          <div>
            <h2>Your saved addresses could not be refreshed.</h2>
            <p>{query.error.message}</p>
            {query.data && (
              <p>
                Previously loaded details remain below. Retry to confirm the
                latest account data.
              </p>
            )}
          </div>
          <Button
            variant="outline"
            disabled={query.isFetching || busy}
            onClick={() => query.refetch()}
          >
            <RefreshCw size={16} /> Retry addresses
          </Button>
        </div>
      )}
      {query.isLoading ? (
        <div
          className="forge-address-list"
          aria-busy="true"
          aria-label="Loading saved shipping addresses"
        >
          {[0, 1].map((index) => (
            <Skeleton key={index} className="h-60 rounded-xl" />
          ))}
        </div>
      ) : !query.isError && !addresses.length ? (
        <div className="forge-address-empty">
          <MapPin size={38} />
          <p className="forge-eyebrow">SET YOUR DELIVERY POINT</p>
          <h2>No saved addresses yet.</h2>
          <p>
            Add a complete delivery address above. You can choose the default
            after it is saved.
          </p>
          {!isAdding && (
            <Button onClick={() => startEditor()} disabled={busy}>
              <Plus size={17} /> Add your first address
            </Button>
          )}
        </div>
      ) : (
        addresses.length > 0 && (
          <section aria-labelledby="address-list-title">
            <div className="forge-address-list-heading">
              <h2 id="address-list-title">Saved delivery points.</h2>
              <p>
                Defaults are confirmed by your account. Editing an address keeps
                its default status.
              </p>
            </div>
            <div className="forge-address-list">
              {addresses.map((address) => {
                const issues = validateAddressForm(addressToForm(address));
                const needsReview = Object.keys(issues).length > 0;
                const defaultPending =
                  setDefaultMutation.isPending &&
                  setDefaultMutation.variables === address.id;
                return (
                  <article
                    key={address.id}
                    className={`forge-address-card${address.isDefault ? " is-default" : ""}`}
                  >
                    <div className="forge-address-card-heading">
                      <span>
                        <MapPin size={21} />
                      </span>
                      <div>
                        <p className="forge-eyebrow">
                          {address.label || "SAVED ADDRESS"}
                        </p>
                        <h3>{address.fullName || "Recipient name missing"}</h3>
                      </div>
                      {address.isDefault && (
                        <span className="forge-address-default">
                          <Check size={13} /> Default
                        </span>
                      )}
                    </div>
                    <address>
                      <p className="forge-address-street">
                        {address.address ||
                          [address.line1, address.line2]
                            .filter(Boolean)
                            .join(", ") ||
                          "Street address missing"}
                      </p>
                      <p>
                        {[address.city, address.state, address.postalCode]
                          .filter(Boolean)
                          .join(", ")}
                      </p>
                      <p>{address.country || "Country missing"}</p>
                      <span>
                        <Phone size={13} />
                        {address.phoneNumber || "Phone number missing"}
                      </span>
                    </address>
                    {needsReview && (
                      <p className="forge-address-repair">
                        <AlertCircle size={14} />
                        Some delivery details need review. Edit this address
                        before using it at checkout.
                      </p>
                    )}
                    <div className="forge-address-card-actions">
                      {!address.isDefault && (
                        <Button
                          variant="outline"
                          disabled={busy || needsReview}
                          onClick={() => handleSetDefault(address.id)}
                        >
                          <Check size={15} />
                          {defaultPending ? "Updating…" : "Set as default"}
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        disabled={busy}
                        onClick={() => startEditor(address)}
                        aria-label={`Edit address for ${address.fullName || "recipient"}`}
                      >
                        <Pencil size={15} /> Edit
                      </Button>
                      <Button
                        variant="ghost"
                        className="forge-address-delete"
                        disabled={busy || address.isDefault}
                        aria-label={`Remove address for ${address.fullName || "recipient"}`}
                        onClick={(event) => {
                          deleteButton.current = event.currentTarget;
                          setDeleteTarget(address);
                          setDeleteError(null);
                        }}
                      >
                        <Trash2 size={15} /> Remove
                      </Button>
                    </div>
                    {address.isDefault && (
                      <p className="forge-address-card-note">
                        <ShieldCheck size={13} />
                        Choose another default before removing this address.
                      </p>
                    )}
                  </article>
                );
              })}
            </div>
          </section>
        )
      )}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open && !deleteAddressMutation.isPending) {
            setDeleteTarget(null);
            setDeleteError(null);
          }
        }}
      >
        <AlertDialogContent
          className="forge-address-delete-dialog"
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            if (deleteButton.current?.isConnected)
              deleteButton.current.focus({ preventScroll: true });
            else addButton.current?.focus({ preventScroll: true });
          }}
        >
          <AlertDialogHeader>
            <span className="forge-address-dialog-icon">
              <Trash2 size={24} />
            </span>
            <AlertDialogTitle>Remove this saved address?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes it from your account. Existing orders keep the
              shipping address used when they were placed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteTarget && (
            <div className="forge-address-dialog-preview">
              <strong>{deleteTarget.fullName}</strong>
              <p>
                {deleteTarget.address ||
                  [deleteTarget.line1, deleteTarget.line2]
                    .filter(Boolean)
                    .join(", ")}
              </p>
              <p>
                {[
                  deleteTarget.city,
                  deleteTarget.state,
                  deleteTarget.postalCode,
                  deleteTarget.country,
                ]
                  .filter(Boolean)
                  .join(", ")}
              </p>
            </div>
          )}
          {currentDeleteTarget?.isDefault && (
            <p className="forge-address-feedback is-error" role="alert">
              This is now your default address. Choose another default before
              removing it.
            </p>
          )}
          {deleteError && (
            <p className="forge-address-feedback is-error" role="alert">
              {deleteError}
            </p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteAddressMutation.isPending}>
              Keep address
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={busy || currentDeleteTarget?.isDefault}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(event) => {
                event.preventDefault();
                void handleDelete();
              }}
            >
              {deleteAddressMutation.isPending ? (
                <span className="forge-processing" role="status">
                  <i /> Removing…
                </span>
              ) : (
                "Remove address"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
