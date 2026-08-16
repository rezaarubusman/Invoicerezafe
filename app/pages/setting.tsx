import { useEffect, useRef, useState } from "react";
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
import { axiosInstance } from "~/lib/axios";
import { businessProfileSchema, changePasswordSchema, invoiceSettingsSchema, passwordChecks, profileSchema, validateLogoFile } from "~/lib/validation";
import { PAYMENT_TERMS, type PaymentTerm } from "~/data/types";

export function meta() {
  return [
    { title: "Settings — Fakturia" },
    { name: "description", content: "Manage your business profile, invoice defaults, account and security settings." },
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
  const { updateUser, updateBusiness } = useAppStore();
  const [isPwdLoading, setIsPwdLoading] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [biz, setBiz] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    website: "",
    taxId: "",
  });
  const [bizErrors, setBizErrors] = useState<Record<string, string>>({});
  const [logo, setLogo] = useState<string | null>(null);

  const [inv, setInv] = useState({
    currency: "IDR",
    defaultPaymentTerms: "due_on_receipt" as PaymentTerm,
    defaultNotes: "",
    defaultTerms: "",
    numberPrefix: "INV",
  });
  const [invErrors, setInvErrors] = useState<Record<string, string>>({});

  const [profile, setProfile] = useState({
    name: "",
    email: "",
  });
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({});

  const [pwd, setPwd] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [pwdErrors, setPwdErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await axiosInstance.get("/user/settings");
        const userData = response.data.data; 
        
        setProfile({ 
          name: userData.name || "", 
          email: userData.email || "" 
        });
        
        if (userData.businessProfile) {
          setBiz({
            name: userData.businessProfile.name || "",
            email: userData.businessProfile.email || "",
            phone: userData.businessProfile.phone || "",
            address: userData.businessProfile.address || "",
            website: userData.businessProfile.website || "",
            taxId: userData.businessProfile.taxId || "",
          });
          setLogo(userData.businessProfile.logoUrl || null);

          updateBusiness({
            name: userData.businessProfile.name || "",
            email: userData.businessProfile.email || "",
            phone: userData.businessProfile.phone || "",
            address: userData.businessProfile.address || "",
            website: userData.businessProfile.website || "",
            taxId: userData.businessProfile.taxId || "",
            logoDataUrl: userData.businessProfile.logoUrl || null,
          });
        }

        if (userData.invoiceSetting) {
          setInv({
            currency: userData.invoiceSetting.currency || "IDR",
            defaultPaymentTerms: (userData.invoiceSetting.defaultPaymentTerms as PaymentTerm) || "due_on_receipt",
            defaultNotes: userData.invoiceSetting.defaultNotes || "",
            defaultTerms: userData.invoiceSetting.defaultTerms || "",
            numberPrefix: userData.invoiceSetting.numberPrefix || "INV",
          });
        }
      } catch (error) {
        toast.error("Failed to load settings");
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const onLogoChange = (file: File | undefined) => {
    if (!file) return;

    const error = validateLogoFile(file);

    if (error) {
      toast.error(error);
      return;
    }

    setSelectedFile(file);

    const reader = new FileReader();
    reader.onload = () => {
      const url = String(reader.result);
      setLogo(url); 
    };
    reader.readAsDataURL(file);
  };

  const handleSaveBusiness = async () => {
    const result = businessProfileSchema.safeParse(biz);

    if (!result.success) {
      setBizErrors(fieldErrors(result.error.issues));
      return;
    }

    setBizErrors({});

    try {
      const formData = new FormData();
      Object.entries(result.data).forEach(([key, value]) => {
        formData.append(key, value || "");
      });

      if (selectedFile) {
        formData.append("logo", selectedFile);
      }

      await axiosInstance.patch("/user/business", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      
      toast.success("Business profile saved successfully");
      setSelectedFile(null); 
      updateBusiness({
        ...result.data,
        logoDataUrl: logo
      });
    } catch (error) {
      toast.error("Failed to save business profile");
    }
  };

  const handleSaveInvoiceSettings = async () => {
    const result = invoiceSettingsSchema.safeParse(inv);

    if (!result.success) {
      setInvErrors(fieldErrors(result.error.issues));
      return;
    }

    setInvErrors({});

    try {
      await axiosInstance.patch("/user/invoice-settings", result.data);
      toast.success("Invoice settings saved successfully");
    } catch (error) {
      toast.error("Failed to save invoice settings");
    }
  };

  const handleSaveProfile = async () => {
    const result = profileSchema.safeParse(profile);

    if (!result.success) {
      setProfileErrors(fieldErrors(result.error.issues));
      return;
    }

    setProfileErrors({});

    try {
      await axiosInstance.patch("/user/profile", result.data);
      updateUser(result.data); 
      toast.success("Profile updated successfully");
    } catch (error) {
      toast.error("Failed to update profile");
    }
  };

  const handleSavePassword = async () => {
    const result = changePasswordSchema.safeParse(pwd);

    if (!result.success) {
      setPwdErrors(fieldErrors(result.error.issues));
      return;
    }

    setPwdErrors({});
    setIsPwdLoading(true); 

    try {
      const { confirmPassword, ...payload } = result.data;
      const response = await axiosInstance.patch("/auth/change-password", payload);
      
      setPwd({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      
      toast.success(response.data.message || "Password updated successfully");
    } catch (error: any) {
      const message = error?.response?.data?.message || "Failed to update password";
      toast.error(message);
    } finally {
      setIsPwdLoading(false); 
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-muted-foreground animate-pulse">Loading settings...</p>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Settings"
        description="Business details, invoice defaults and security."
      />

      <Tabs defaultValue="business">
        <TabsList className="flex-wrap">
          <TabsTrigger value="business">Business profile</TabsTrigger>
          <TabsTrigger value="invoice">Invoice settings</TabsTrigger>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        <TabsContent value="business" className="mt-4">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Business profile</CardTitle>
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
                    <span className="text-xs text-muted-foreground">No logo</span>
                  )}
                </div>

                <div className="space-y-2">
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/jpeg,image/png"
                    className="sr-only"
                    aria-label="Upload business logo"
                    onChange={(e) => onLogoChange(e.target.files?.[0])}
                  />

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => fileRef.current?.click()}
                    >
                      <Upload className="mr-2 size-4" aria-hidden />
                      {logo ? "Replace logo" : "Upload logo"}
                    </Button>

                    {logo && (
                      <Button
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => {
                          setLogo(null);
                          setSelectedFile(null);
                        }}
                      >
                        Remove
                      </Button>
                    )}
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
                  <div key={key} className="space-y-1.5">
                    <Label htmlFor={`b-${key}`}>{label}</Label>
                    <Input
                      id={`b-${key}`}
                      value={biz[key as keyof typeof biz]}
                      onChange={(e) =>
                        setBiz((f) => ({
                          ...f,
                          [key]: e.target.value,
                        }))
                      }
                    />
                    {bizErrors[key] && (
                      <p className="text-sm text-destructive">{bizErrors[key]}</p>
                    )}
                  </div>
                ))}

                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="b-address">Address</Label>
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
                  {bizErrors.address && (
                    <p className="text-sm text-destructive">{bizErrors.address}</p>
                  )}
                </div>
              </div>

              <Button onClick={handleSaveBusiness}>
                Save changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoice" className="mt-4">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Invoice settings</CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="i-currency">Currency</Label>
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
                  {invErrors.currency && (
                    <p className="text-sm text-destructive">{invErrors.currency}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="i-prefix">Invoice number prefix</Label>
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
                  {invErrors.numberPrefix && (
                    <p className="text-sm text-destructive">{invErrors.numberPrefix}</p>
                  )}
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="i-terms">Default payment terms</Label>
                  <Select
                    value={inv.defaultPaymentTerms}
                    onValueChange={(value) =>
                      setInv((f) => ({
                        ...f,
                        defaultPaymentTerms: value as PaymentTerm,
                      }))
                    }
                  >
                    <SelectTrigger id="i-terms">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_TERMS.map((term) => (
                        <SelectItem key={term.value} value={term.value}>
                          {term.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="i-notes">Default notes</Label>
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
                  <Label htmlFor="i-tnc">Default terms</Label>
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

              <Button onClick={handleSaveInvoiceSettings}>
                Save changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profile" className="mt-4">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Your profile</CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="u-name">Full name</Label>
                  <Input
                    id="u-name"
                    value={profile.name}
                    onChange={(e) =>
                      setProfile((f) => ({ ...f, name: e.target.value }))
                    }
                  />
                  {profileErrors.name && (
                    <p className="text-sm text-destructive">{profileErrors.name}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="u-email">Email</Label>
                  <Input
                    id="u-email"
                    value={profile.email}
                    disabled 
                    className="bg-muted cursor-not-allowed"
                  />
                </div>
              </div>

              <Button onClick={handleSaveProfile}>
                Save changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="mt-4">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Change password</CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                {(
                  [
                    ["currentPassword", "Current password"],
                    ["newPassword", "New password"],
                    ["confirmPassword", "Confirm new password"],
                  ] as const
                ).map(([key, label]) => (
                  <div key={key} className="space-y-1.5">
                    <Label htmlFor={`s-${key}`}>{label}</Label>
                    <Input
                      id={`s-${key}`}
                      type="password"
                      value={pwd[key as keyof typeof pwd]}
                      onChange={(e) =>
                        setPwd((f) => ({
                          ...f,
                          [key]: e.target.value,
                        }))
                      }
                    />
                    {pwdErrors[key] && (
                      <p className="text-sm text-destructive">{pwdErrors[key]}</p>
                    )}
                  </div>
                ))}
              </div>

              <ul className="space-y-1 text-sm text-muted-foreground">
                {passwordChecks(pwd.newPassword).map((check) => (
                  <li
                    key={check.label}
                    className={check.ok ? "text-success" : undefined}
                  >
                    {check.ok ? "✓" : "•"} {check.label}
                  </li>
                ))}
              </ul>

              <Button disabled={isPwdLoading} onClick={handleSavePassword}>
                {isPwdLoading ? "Updating password..." : "Update password"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}