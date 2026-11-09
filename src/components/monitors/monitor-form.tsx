import { useState } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle2, Loader2, Plug, Plus, Trash2, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Panel } from "@/components/layout/page";
import { useEndpointCheck } from "@/hooks/use-run-check";
import { HTTP_METHODS, type AuthConfig, type EndpointCheckResponse, type Monitor, type MonitorInput } from "@/lib/types";
import { formatInterval } from "@/lib/format";
import { cn } from "@/lib/utils";

export const INTERVAL_OPTIONS = [30, 60, 120, 300, 600, 900, 1800, 3600];

const schema = z
  .object({
    name: z.string().trim().min(1, "Give this monitor a name").max(80, "Keep it under 80 characters"),
    url: z
      .string()
      .trim()
      .url("Enter a full URL, e.g. https://api.example.com/health")
      .refine((u) => /^https?:\/\//i.test(u), "URL must start with http:// or https://"),
    method: z.enum(HTTP_METHODS),
    intervalSeconds: z.coerce.number().int().min(30),
    timeoutMs: z.coerce.number().int().min(1000, "Minimum 1000 ms").max(30000, "Maximum 30000 ms"),
    expectedStatus: z.coerce.number().int().min(100, "Must be 100–599").max(599, "Must be 100–599"),
    headers: z.array(z.object({ key: z.string().trim().max(256), value: z.string().max(4096) })),
    authType: z.enum(["none", "bearer", "basic", "apiKey"]),
    token: z.string().optional(),
    username: z.string().optional(),
    password: z.string().optional(),
    apiKeyHeader: z.string().optional(),
    apiKeyValue: z.string().optional(),
  })
  .superRefine((v, ctx) => {
    if (v.authType === "bearer" && !v.token?.trim()) ctx.addIssue({ code: "custom", path: ["token"], message: "Token is required" });
    if (v.authType === "basic" && !v.username?.trim()) ctx.addIssue({ code: "custom", path: ["username"], message: "Username is required" });
    if (v.authType === "apiKey") {
      if (!v.apiKeyHeader?.trim()) ctx.addIssue({ code: "custom", path: ["apiKeyHeader"], message: "Header name is required" });
      if (!v.apiKeyValue?.trim()) ctx.addIssue({ code: "custom", path: ["apiKeyValue"], message: "Key value is required" });
    }
  });

type FormValues = z.infer<typeof schema>;

function toAuth(v: FormValues): AuthConfig {
  switch (v.authType) {
    case "bearer":
      return { type: "bearer", token: v.token?.trim() ?? "" };
    case "basic":
      return { type: "basic", username: v.username?.trim() ?? "", password: v.password ?? "" };
    case "apiKey":
      return { type: "apiKey", headerName: v.apiKeyHeader?.trim() ?? "", value: v.apiKeyValue ?? "" };
    default:
      return { type: "none" };
  }
}

export function toMonitorInput(v: FormValues): MonitorInput {
  return {
    name: v.name.trim(),
    url: v.url.trim(),
    method: v.method,
    intervalSeconds: v.intervalSeconds,
    timeoutMs: v.timeoutMs,
    expectedStatus: v.expectedStatus,
    headers: v.headers.filter((h) => h.key.trim()),
    auth: toAuth(v),
  };
}

function toDefaults(monitor: Monitor | undefined, defaults: { intervalSeconds: number; timeoutMs: number }): FormValues {
  const auth = monitor?.auth ?? { type: "none" };
  return {
    name: monitor?.name ?? "",
    url: monitor?.url ?? "",
    method: monitor?.method ?? "GET",
    intervalSeconds: monitor?.intervalSeconds ?? defaults.intervalSeconds,
    timeoutMs: monitor?.timeoutMs ?? defaults.timeoutMs,
    expectedStatus: monitor?.expectedStatus ?? 200,
    headers: monitor?.headers ?? [],
    authType: auth.type,
    token: auth.type === "bearer" ? auth.token : "",
    username: auth.type === "basic" ? auth.username : "",
    password: auth.type === "basic" ? auth.password : "",
    apiKeyHeader: auth.type === "apiKey" ? auth.headerName : "X-API-Key",
    apiKeyValue: auth.type === "apiKey" ? auth.value : "",
  };
}

function FieldError({ message, id }: { message?: string; id: string }) {
  if (!message) return null;
  return (
    <p id={id} className="text-xs text-destructive">
      {message}
    </p>
  );
}

function Field({
  id,
  label,
  hint,
  error,
  children,
  className,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? <FieldError id={`${id}-error`} message={error} /> : hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function MonitorForm({
  monitor,
  defaults,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  monitor?: Monitor;
  defaults: { intervalSeconds: number; timeoutMs: number };
  submitLabel: string;
  onSubmit: (input: MonitorInput) => void;
  onCancel: () => void;
}) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: toDefaults(monitor, defaults),
    mode: "onTouched",
  });
  const { register, control, handleSubmit, watch, formState, trigger, getValues } = form;
  const headers = useFieldArray({ control, name: "headers" });
  const authType = watch("authType");
  const errors = formState.errors;

  const check = useEndpointCheck();
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<EndpointCheckResponse | null>(null);

  const testConnection = async () => {
    const valid = await trigger();
    if (!valid) return;
    setTesting(true);
    setTestResult(null);
    try {
      const input = toMonitorInput(getValues());
      const result = await check({
        url: input.url,
        method: input.method,
        timeoutMs: input.timeoutMs,
        expectedStatus: input.expectedStatus,
        headers: input.headers,
        auth: input.auth,
      });
      setTestResult(result);
    } catch (err) {
      console.error(err);
      setTestResult({ ok: false, statusCode: null, responseMs: null, error: "Couldn't run the test. Please try again.", checkedAt: Date.now() });
    } finally {
      setTesting(false);
    }
  };

  const describedBy = (name: keyof FormValues) => (errors[name] ? `${name}-error` : undefined);

  return (
    <form onSubmit={handleSubmit((v) => onSubmit(toMonitorInput(v)))} noValidate className="space-y-4">
      <Panel title="Endpoint" description="What to monitor and how to call it.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="name" label="Monitor name" error={errors.name?.message} className="sm:col-span-2">
            <Input id="name" placeholder="Payments API – health" aria-invalid={!!errors.name} aria-describedby={describedBy("name")} {...register("name")} />
          </Field>
          <Field id="url" label="Endpoint URL" error={errors.url?.message} className="sm:col-span-2">
            <div className="flex gap-2">
              <Controller
                control={control}
                name="method"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-28 shrink-0 font-mono" aria-label="HTTP method">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {HTTP_METHODS.map((m) => (
                        <SelectItem key={m} value={m} className="font-mono">
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <Input
                id="url"
                inputMode="url"
                placeholder="https://api.example.com/health"
                className="min-w-0 font-mono"
                aria-invalid={!!errors.url}
                aria-describedby={describedBy("url")}
                {...register("url")}
              />
            </div>
          </Field>
        </div>
      </Panel>

      <Panel title="Check settings" description="How often to check and what counts as healthy.">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field id="intervalSeconds" label="Monitoring interval">
            <Controller
              control={control}
              name="intervalSeconds"
              render={({ field }) => (
                <Select value={String(field.value)} onValueChange={(v) => field.onChange(Number(v))}>
                  <SelectTrigger id="intervalSeconds">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INTERVAL_OPTIONS.map((s) => (
                      <SelectItem key={s} value={String(s)}>
                        Every {formatInterval(s)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
          <Field id="timeoutMs" label="Request timeout (ms)" hint="1000–30000" error={errors.timeoutMs?.message}>
            <Input id="timeoutMs" type="number" inputMode="numeric" min={1000} max={30000} step={500} aria-invalid={!!errors.timeoutMs} aria-describedby={describedBy("timeoutMs")} {...register("timeoutMs")} />
          </Field>
          <Field id="expectedStatus" label="Expected status code" error={errors.expectedStatus?.message}>
            <Input id="expectedStatus" type="number" inputMode="numeric" min={100} max={599} aria-invalid={!!errors.expectedStatus} aria-describedby={describedBy("expectedStatus")} {...register("expectedStatus")} />
          </Field>
        </div>
      </Panel>

      <Panel
        title="Request headers"
        description="Optional headers sent with every check."
        actions={
          <Button type="button" variant="outline" size="sm" onClick={() => headers.append({ key: "", value: "" })}>
            <Plus /> Add header
          </Button>
        }
      >
        {headers.fields.length === 0 ? (
          <p className="text-sm text-muted-foreground">No custom headers.</p>
        ) : (
          <div className="space-y-2">
            {headers.fields.map((f, i) => (
              <div key={f.id} className="flex gap-2">
                <Input aria-label={`Header ${i + 1} name`} placeholder="Header" className="min-w-0 flex-1 font-mono" {...register(`headers.${i}.key`)} />
                <Input aria-label={`Header ${i + 1} value`} placeholder="Value" className="min-w-0 flex-[1.5] font-mono" {...register(`headers.${i}.value`)} />
                <Button type="button" variant="ghost" size="icon" aria-label={`Remove header ${i + 1}`} onClick={() => headers.remove(i)}>
                  <Trash2 />
                </Button>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <Panel title="Authentication" description="Optional credentials for protected endpoints.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="authType" label="Type" className="sm:col-span-2 sm:max-w-xs">
            <Controller
              control={control}
              name="authType"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="authType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No authentication</SelectItem>
                    <SelectItem value="bearer">Bearer token</SelectItem>
                    <SelectItem value="basic">Basic auth</SelectItem>
                    <SelectItem value="apiKey">API key header</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
          {authType === "bearer" ? (
            <Field id="token" label="Token" error={errors.token?.message} className="sm:col-span-2">
              <Input id="token" type="password" autoComplete="off" className="font-mono" aria-invalid={!!errors.token} {...register("token")} />
            </Field>
          ) : null}
          {authType === "basic" ? (
            <>
              <Field id="username" label="Username" error={errors.username?.message}>
                <Input id="username" autoComplete="off" aria-invalid={!!errors.username} {...register("username")} />
              </Field>
              <Field id="password" label="Password">
                <Input id="password" type="password" autoComplete="new-password" {...register("password")} />
              </Field>
            </>
          ) : null}
          {authType === "apiKey" ? (
            <>
              <Field id="apiKeyHeader" label="Header name" error={errors.apiKeyHeader?.message}>
                <Input id="apiKeyHeader" className="font-mono" aria-invalid={!!errors.apiKeyHeader} {...register("apiKeyHeader")} />
              </Field>
              <Field id="apiKeyValue" label="Key value" error={errors.apiKeyValue?.message}>
                <Input id="apiKeyValue" type="password" autoComplete="off" className="font-mono" aria-invalid={!!errors.apiKeyValue} {...register("apiKeyValue")} />
              </Field>
            </>
          ) : null}
        </div>
      </Panel>

      {testResult ? (
        <div
          role="status"
          className={cn(
            "flex items-start gap-3 rounded-xl border p-4",
            testResult.ok ? "border-success/30 bg-success/5" : "border-destructive/30 bg-destructive/5",
          )}
        >
          {testResult.ok ? <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" /> : <XCircle className="mt-0.5 size-5 shrink-0 text-destructive" />}
          <div className="min-w-0 text-sm">
            <p className="font-medium">{testResult.ok ? "Connection successful" : "Connection failed"}</p>
            <p className="mt-0.5 text-muted-foreground">
              {testResult.statusCode !== null ? `HTTP ${testResult.statusCode}` : "No response"}
              {testResult.responseMs !== null ? ` · ${testResult.responseMs} ms` : ""}
              {testResult.error ? ` · ${testResult.error}` : ""}
            </p>
          </div>
        </div>
      ) : null}

      <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="button" variant="outline" onClick={testConnection} disabled={testing}>
          {testing ? <Loader2 className="animate-spin" /> : <Plug />} Test connection
        </Button>
        <Button type="submit" disabled={formState.isSubmitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
