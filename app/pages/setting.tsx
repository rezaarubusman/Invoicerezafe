import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { PageHeader } from "~/components/common/page-parts";
import { useAppStore } from "~/store/app-store";
import { useAuthStore } from "~/store/auth-store";
import { businessProfileSchema, changePasswordSchema, invoiceSettingsSchema, passwordChecks, profileSchema, validateLogoFile } from "~/lib/validation";
import { PAYMENT_TERMS, type PaymentTerm } from "~/data/types";

export function meta() {
  return [
    { title: "Settings — Fakturia" },
    {
      name: "description",
      content: "Manage your business profile, invoice defaults, account and security settings.",
    },
    {
      property: "og:title",
      content: "Settings — Fakturia",
    },
    {
      property: "og:description",
      content: "Business profile, invoice defaults and security.",
    },
  ];
}

function fieldErrors(
  issues: {
    path: (string | number | symbol)[];
    message: string;
  }[],
) {
  const next: Record<string, string> = {};

  for (const issue of issues) {
    const key = String(issue.path[0]);

    if (!next[key]) {
      next[key] = issue.message;
    }
  }

  return next;
}

export default function SettingsPage() {
  const {
    business,
    updateBusiness,
    invoiceSettings,
    updateInvoiceSettings,
    user,
    updateUser,
  } = useAppStore();

  const changePassword = useAuthStore(
    (state) => state.changePassword
  );

  const isAuthLoading = useAuthStore(
    (state) => state.isLoading
  );

  const fileRef = useRef<HTMLInputElement>(null);

  const [biz, setBiz] = useState({
    name: business.name,
    email: business.email,
    phone: business.phone,
    address: business.address,
    website: business.website,
    taxId: business.taxId,
  });

  const [bizErrors, setBizErrors] = useState<Record<string, string>>({});

  const [logo, setLogo] = useState<string | null>(
    business.logoDataUrl,
  );

  const [inv, setInv] = useState({
    ...invoiceSettings,
  });

  const [invErrors, setInvErrors] = useState<Record<string, string>>({});

  const [profile, setProfile] = useState({
    name: user.name,
    email: user.email,
  });

  const [profileErrors, setProfileErrors] = useState<
    Record<string, string>
  >({});

  const [pwd, setPwd] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [pwdErrors, setPwdErrors] = useState<
    Record<string, string>
  >({});

  const onLogoChange = (file: File | undefined) => {
    if (!file) return;

    const error = validateLogoFile(file);

    if (error) {
      toast.error(error);
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      const url = String(reader.result);

      setLogo(url);

      updateBusiness({
        logoDataUrl: url,
      });

      toast.success("Logo updated");
    };

    reader.readAsDataURL(file);
  };

  return (
    <>
      <PageHeader
        title="Settings"
        description="Business details, invoice defaults and security."
      />

      <Tabs defaultValue="business">
        <TabsList className="flex-wrap">
          <TabsTrigger value="business">
            Business profile
          </TabsTrigger>

          <TabsTrigger value="invoice">
            Invoice settings
          </TabsTrigger>

          <TabsTrigger value="profile">
            Profile
          </TabsTrigger>

          <TabsTrigger value="security">
            Security
          </TabsTrigger>
        </TabsList>

        <TabsContent value="business" className="mt-4">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">
                Business profile
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="flex flex-wrap items-center gap-4">
                <div className="grid size-20 place-items-center overflow-hidden rounded-xl border border-border bg-muted">
                  {logo ? (
                    <img
                      src={logo}
                      alt="Business logo preview"
                      className="size-full object-contain"
                    />
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      No logo
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/jpeg,image/png"
                    className="sr-only"
                    aria-label="Upload business logo"
                    onChange={(e) =>
                      onLogoChange(e.target.files?.[0])
                    }
                  />

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() =>
                        fileRef.current?.click()
                      }
                    >
                      <Upload
                        className="size-4"
                        aria-hidden
                      />

                      {logo ? "Replace" : "Upload"} logo
                    </Button>

                    {logo ? (
                      <Button
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => {
                          setLogo(null);

                          updateBusiness({
                            logoDataUrl: null,
                          });

                          toast.success("Logo removed");
                        }}
                      >
                        Remove
                      </Button>
                    ) : null}
                  </div>

                  <p className="text-xs text-muted-foreground">
                    JPG or PNG, up to 2 MB.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {(
                  [
                    ["name", "Business name"],
                    ["email", "Email"],
                    ["phone", "Phone"],
                    ["website", "Website"],
                    ["taxId", "Tax ID (NPWP)"],
                  ] as const
                ).map(([key, label]) => (
                  <div
                    key={key}
                    className="space-y-1.5"
                  >
                    <Label htmlFor={`b-${key}`}>
                      {label}
                    </Label>

                    <Input
                      id={`b-${key}`}
                      value={biz[key]}
                      onChange={(e) =>
                        setBiz((f) => ({
                          ...f,
                          [key]: e.target.value,
                        }))
                      }
                    />

                    {bizErrors[key] ? (
                      <p className="text-sm text-destructive">
                        {bizErrors[key]}
                      </p>
                    ) : null}
                  </div>
                ))}

                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="b-address">
                    Address
                  </Label>

                  <Textarea
                    id="b-address"
                    value={biz.address}
                    onChange={(e) =>
                      setBiz((f) => ({
                        ...f,
                        address: e.target.value,
                      }))
                    }
                  />

                  {bizErrors.address ? (
                    <p className="text-sm text-destructive">
                      {bizErrors.address}
                    </p>
                  ) : null}
                </div>
              </div>

              <Button
                onClick={() => {
                  const result =
                    businessProfileSchema.safeParse(biz);

                  if (!result.success) {
                    setBizErrors(
                      fieldErrors(result.error.issues),
                    );
                    return;
                  }

                  setBizErrors({});

                  updateBusiness({
                    ...result.data,
                    website: result.data.website ?? "",
                    taxId: result.data.taxId ?? "",
                  });

                  toast.success(
                    "Business profile saved",
                  );
                }}
              >
                Save changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoice" className="mt-4">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">
                Invoice settings
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="i-currency">
                    Currency
                  </Label>

                  <Input
                    id="i-currency"
                    value={inv.currency}
                    onChange={(e) =>
                      setInv((f) => ({
                        ...f,
                        currency: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="i-prefix">
                    Invoice number prefix
                  </Label>

                  <Input
                    id="i-prefix"
                    value={inv.numberPrefix}
                    onChange={(e) =>
                      setInv((f) => ({
                        ...f,
                        numberPrefix: e.target.value,
                      }))
                    }
                  />

                  {invErrors.numberPrefix ? (
                    <p className="text-sm text-destructive">
                      {invErrors.numberPrefix}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="i-terms">
                    Default payment terms
                  </Label>

                  <Select
                    value={inv.defaultPaymentTerms}
                    onValueChange={(value) =>
                      setInv((f) => ({
                        ...f,
                        defaultPaymentTerms:
                          value as PaymentTerm,
                      }))
                    }
                  >
                    <SelectTrigger id="i-terms">
                      <SelectValue />
                    </SelectTrigger>

                    <SelectContent>
                      {PAYMENT_TERMS.map((term) => (
                        <SelectItem
                          key={term.value}
                          value={term.value}
                        >
                          {term.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="i-notes">
                    Default notes
                  </Label>

                  <Textarea
                    id="i-notes"
                    value={inv.defaultNotes}
                    onChange={(e) =>
                      setInv((f) => ({
                        ...f,
                        defaultNotes: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="i-tnc">
                    Default terms
                  </Label>

                  <Textarea
                    id="i-tnc"
                    value={inv.defaultTerms}
                    onChange={(e) =>
                      setInv((f) => ({
                        ...f,
                        defaultTerms: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              <Button
                onClick={() => {
                  const result =
                    invoiceSettingsSchema.safeParse(inv);

                  if (!result.success) {
                    setInvErrors(
                      fieldErrors(result.error.issues),
                    );
                    return;
                  }

                  setInvErrors({});

                  updateInvoiceSettings({
                    ...result.data,
                    defaultNotes:
                      result.data.defaultNotes ?? "",
                    defaultTerms:
                      result.data.defaultTerms ?? "",
                  });

                  toast.success(
                    "Invoice settings saved",
                  );
                }}
              >
                Save changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profile" className="mt-4">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">
                Your profile
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="u-name">
                    Full name
                  </Label>

                  <Input
                    id="u-name"
                    value={profile.name}
                    onChange={(e) =>
                      setProfile((f) => ({
                        ...f,
                        name: e.target.value,
                      }))
                    }
                  />

                  {profileErrors.name ? (
                    <p className="text-sm text-destructive">
                      {profileErrors.name}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="u-email">
                    Email
                  </Label>

                  <Input
                    id="u-email"
                    value={profile.email}
                    onChange={(e) =>
                      setProfile((f) => ({
                        ...f,
                        email: e.target.value,
                      }))
                    }
                  />

                  {profileErrors.email ? (
                    <p className="text-sm text-destructive">
                      {profileErrors.email}
                    </p>
                  ) : null}
                </div>
              </div>

              <Button
                onClick={() => {
                  const result =
                    profileSchema.safeParse(profile);

                  if (!result.success) {
                    setProfileErrors(
                      fieldErrors(result.error.issues),
                    );
                    return;
                  }

                  setProfileErrors({});

                  updateUser(result.data);

                  toast.success("Profile updated");
                }}
              >
                Save changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="mt-4">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">
                Change password
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                {(
                  [
                    [
                      "currentPassword",
                      "Current password",
                    ],
                    [
                      "newPassword",
                      "New password",
                    ],
                    [
                      "confirmPassword",
                      "Confirm new password",
                    ],
                  ] as const
                ).map(([key, label]) => (
                  <div
                    key={key}
                    className="space-y-1.5"
                  >
                    <Label htmlFor={`s-${key}`}>
                      {label}
                    </Label>

                    <Input
                      id={`s-${key}`}
                      type="password"
                      value={pwd[key]}
                      onChange={(e) =>
                        setPwd((f) => ({
                          ...f,
                          [key]: e.target.value,
                        }))
                      }
                    />

                    {pwdErrors[key] ? (
                      <p className="text-sm text-destructive">
                        {pwdErrors[key]}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>

              <ul className="space-y-1 text-sm text-muted-foreground">
                {passwordChecks(pwd.newPassword).map(
                  (check) => (
                    <li
                      key={check.label}
                      className={
                        check.ok
                          ? "text-success"
                          : undefined
                      }
                    >
                      {check.ok ? "✓" : "•"}{" "}
                      {check.label}
                    </li>
                  ),
                )}
              </ul>

              <Button
                disabled={isAuthLoading}
                onClick={async () => {
                  const result =
                    changePasswordSchema.safeParse(pwd);

                  if (!result.success) {
                    setPwdErrors(
                      fieldErrors(result.error.issues),
                    );
                    return;
                  }

                  setPwdErrors({});

                  try {
                    const response =
                      await changePassword(
                        result.data
                      );

                    setPwd({
                      currentPassword: "",
                      newPassword: "",
                      confirmPassword: "",
                    });

                    toast.success(
                      response.message,
                    );
                  } catch (error: any) {
                    const message =
                      error?.response?.data?.message ||
                      "Failed to update password";

                    toast.error(message);
                  }
                }}
              >
                {isAuthLoading
                  ? "Updating password..."
                  : "Update password"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}
