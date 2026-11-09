import { createFileRoute } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { Controller, useForm, type Control, type FieldValues, type Path } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import { PageContainer, PageHeader, Panel, WorkspaceGate } from "@/components/layout/page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { INTERVAL_OPTIONS } from "@/components/monitors/monitor-form";
import { useSentinel } from "@/lib/store/sentinel-store";
import { formatInterval } from "@/lib/format";
import type { AppData, Settings } from "@/lib/types";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — API Sentinel" },
      { name: "description", content: "Account, notification, alert threshold and monitoring preferences." },
      { property: "og:title", content: "Settings — API Sentinel" },
      { property: "og:description", content: "Account, notification, alert threshold and monitoring preferences." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  return <WorkspaceGate>{(data) => <SettingsView data={data} />}</WorkspaceGate>;
}

const TIMEZONES = ["UTC", "Europe/London", "Europe/Berlin", "America/New_York", "America/Los_Angeles", "Asia/Kolkata", "Asia/Singapore", "Australia/Sydney"];
const REGIONS = [
  { value: "eu-west", label: "EU West (Ireland)" },
  { value: "us-east", label: "US East (Virginia)" },
  { value: "us-west", label: "US West (Oregon)" },
  { value: "ap-south", label: "Asia Pacific (Mumbai)" },
];

function SettingsView({ data }: { data: AppData }) {
  const [tab, setTab] = useState("account");
  return (
    <PageContainer className="max-w-4xl">
      <PageHeader title="Settings" description="Manage your account and how API Sentinel monitors and alerts." />
      <Tabs value={tab} onValueChange={setTab}>
        <div className="-mx-4 mb-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <TabsList>
            <TabsTrigger value="account">Account</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="thresholds">Alert thresholds</TabsTrigger>
            <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
            <TabsTrigger value="data">Data</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="account">
          <AccountForm settings={data.settings} />
        </TabsContent>
        <TabsContent value="notifications">
          <NotificationsForm settings={data.settings} />
        </TabsContent>
        <TabsContent value="thresholds">
          <ThresholdsForm settings={data.settings} />
        </TabsContent>
        <TabsContent value="monitoring">
          <MonitoringForm settings={data.settings} />
        </TabsContent>
        <TabsContent value="data">
          <DataPanel isSample={data.isSampleData} />
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}

function Row({ id, label, hint, error, children }: { id: string; label: string; hint?: string | undefined; error?: string | undefined; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-xs text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

function SwitchRow<T extends FieldValues>({
  control,
  name,
  label,
  description,
}: {
  control: Control<T>;
  name: Path<T>;
  label: string;
  description?: string;
}) {
  const id = `switch-${name}`;
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div className="min-w-0">
        <Label htmlFor={id} className="text-sm font-medium">
          {label}
        </Label>
        {description ? <p className="mt-0.5 text-xs text-muted-foreground">{description}</p> : null}
      </div>
      <Controller
        control={control}
        name={name}
        render={({ field }) => <Switch id={id} checked={!!field.value} onCheckedChange={field.onChange} />}
      />
    </div>
  );
}

function FormFooter({ dirty, onReset }: { dirty: boolean; onReset: () => void }) {
  return (
    <div className="mt-5 flex justify-end gap-2 border-t pt-4">
      <Button type="button" variant="ghost" disabled={!dirty} onClick={onReset}>
        Discard
      </Button>
      <Button type="submit" disabled={!dirty}>
        Save changes
      </Button>
    </div>
  );
}

function useSaveSection<K extends keyof Settings>(settings: Settings, key: K) {
  const { actions } = useSentinel();
  return (values: Settings[K]) => {
    actions.updateSettings({ ...settings, [key]: values });
    toast.success("Settings saved");
  };
}

const accountSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  email: z.string().trim().email("Enter a valid email address"),
  company: z.string().trim().max(120),
  timezone: z.string().min(1),
});

function AccountForm({ settings }: { settings: Settings }) {
  const save = useSaveSection(settings, "account");
  const form = useForm<Settings["account"]>({ resolver: zodResolver(accountSchema), values: settings.account });
  const { register, handleSubmit, formState, control, reset } = form;
  return (
    <form onSubmit={handleSubmit(save)} noValidate>
      <Panel title="Account" description="Your profile details shown across the workspace.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Row id="acc-name" label="Full name" error={formState.errors.name?.message}>
            <Input id="acc-name" aria-invalid={!!formState.errors.name} {...register("name")} />
          </Row>
          <Row id="acc-email" label="Email" error={formState.errors.email?.message}>
            <Input id="acc-email" type="email" aria-invalid={!!formState.errors.email} {...register("email")} />
          </Row>
          <Row id="acc-company" label="Team or company">
            <Input id="acc-company" {...register("company")} />
          </Row>
          <Row id="acc-tz" label="Timezone">
            <Controller
              control={control}
              name="timezone"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="acc-tz">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEZONES.map((tz) => (
                      <SelectItem key={tz} value={tz}>
                        {tz}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Row>
        </div>
        <FormFooter dirty={formState.isDirty} onReset={() => reset(settings.account)} />
      </Panel>
    </form>
  );
}

const notificationsSchema = z
  .object({
    email: z.boolean(),
    slack: z.boolean(),
    slackWebhook: z.string().trim(),
    sms: z.boolean(),
    phone: z.string().trim(),
    onIncidentOpened: z.boolean(),
    onIncidentResolved: z.boolean(),
    onDegraded: z.boolean(),
    weeklyReport: z.boolean(),
  })
  .superRefine((v, ctx) => {
    if (v.slack && !/^https:\/\/hooks\.slack\.com\//.test(v.slackWebhook)) {
      ctx.addIssue({ code: "custom", path: ["slackWebhook"], message: "Enter a Slack webhook URL (https://hooks.slack.com/…)" });
    }
    if (v.sms && !/^\+?[0-9 ()-]{7,20}$/.test(v.phone)) {
      ctx.addIssue({ code: "custom", path: ["phone"], message: "Enter a valid phone number" });
    }
  });

function NotificationsForm({ settings }: { settings: Settings }) {
  const save = useSaveSection(settings, "notifications");
  const form = useForm<Settings["notifications"]>({ resolver: zodResolver(notificationsSchema), values: settings.notifications });
  const { register, handleSubmit, formState, control, reset, watch } = form;
  const slack = watch("slack");
  const sms = watch("sms");
  return (
    <form onSubmit={handleSubmit(save)} noValidate className="space-y-4">
      <Panel title="Channels" description="Where alerts are delivered.">
        <div className="divide-y">
          <SwitchRow control={control} name="email" label="Email" description={`Sent to ${settings.account.email}`} />
          <div>
            <SwitchRow control={control} name="slack" label="Slack" description="Post alerts to a Slack channel via webhook." />
            {slack ? (
              <div className="pb-3">
                <Row id="slack-webhook" label="Webhook URL" error={formState.errors.slackWebhook?.message}>
                  <Input id="slack-webhook" className="font-mono" placeholder="https://hooks.slack.com/services/…" aria-invalid={!!formState.errors.slackWebhook} {...register("slackWebhook")} />
                </Row>
              </div>
            ) : null}
          </div>
          <div>
            <SwitchRow control={control} name="sms" label="SMS" description="Text messages for critical incidents." />
            {sms ? (
              <div className="pb-3">
                <Row id="sms-phone" label="Phone number" error={formState.errors.phone?.message}>
                  <Input id="sms-phone" type="tel" placeholder="+1 555 010 0100" aria-invalid={!!formState.errors.phone} {...register("phone")} />
                </Row>
              </div>
            ) : null}
          </div>
        </div>
      </Panel>
      <Panel title="Events" description="Which events generate notifications.">
        <div className="divide-y">
          <SwitchRow control={control} name="onIncidentOpened" label="Incident opened" description="An endpoint fails its checks." />
          <SwitchRow control={control} name="onIncidentResolved" label="Incident resolved" description="An endpoint recovers or an incident is closed." />
          <SwitchRow control={control} name="onDegraded" label="Degraded performance" description="Response time exceeds the warning threshold." />
          <SwitchRow control={control} name="weeklyReport" label="Weekly uptime report" description="Summary every Monday." />
        </div>
        <FormFooter dirty={formState.isDirty} onReset={() => reset(settings.notifications)} />
      </Panel>
    </form>
  );
}

const thresholdsSchema = z
  .object({
    latencyWarningMs: z.coerce.number().int().min(50, "Minimum 50 ms").max(30000),
    latencyCriticalMs: z.coerce.number().int().min(100, "Minimum 100 ms").max(60000),
    consecutiveFailures: z.coerce.number().int().min(1, "At least 1").max(10, "At most 10"),
    uptimeTarget: z.coerce.number().min(90, "Minimum 90%").max(100, "Maximum 100%"),
  })
  .refine((v) => v.latencyCriticalMs > v.latencyWarningMs, {
    path: ["latencyCriticalMs"],
    message: "Must be higher than the warning threshold",
  });

function ThresholdsForm({ settings }: { settings: Settings }) {
  const save = useSaveSection(settings, "thresholds");
  const form = useForm<Settings["thresholds"]>({ resolver: zodResolver(thresholdsSchema), values: settings.thresholds });
  const { register, handleSubmit, formState, reset } = form;
  const e = formState.errors;
  return (
    <form onSubmit={handleSubmit(save)} noValidate>
      <Panel title="Alert thresholds" description="When an endpoint counts as degraded or down.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Row id="th-warn" label="Degraded above (ms)" hint="Marks a monitor as degraded" error={e.latencyWarningMs?.message}>
            <Input id="th-warn" type="number" inputMode="numeric" aria-invalid={!!e.latencyWarningMs} {...register("latencyWarningMs")} />
          </Row>
          <Row id="th-crit" label="Critical above (ms)" hint="Escalates latency alerts" error={e.latencyCriticalMs?.message}>
            <Input id="th-crit" type="number" inputMode="numeric" aria-invalid={!!e.latencyCriticalMs} {...register("latencyCriticalMs")} />
          </Row>
          <Row id="th-fail" label="Consecutive failures before incident" error={e.consecutiveFailures?.message}>
            <Input id="th-fail" type="number" inputMode="numeric" aria-invalid={!!e.consecutiveFailures} {...register("consecutiveFailures")} />
          </Row>
          <Row id="th-uptime" label="Uptime target (%)" hint="Used for SLO indicators" error={e.uptimeTarget?.message}>
            <Input id="th-uptime" type="number" step="0.01" inputMode="decimal" aria-invalid={!!e.uptimeTarget} {...register("uptimeTarget")} />
          </Row>
        </div>
        <FormFooter dirty={formState.isDirty} onReset={() => reset(settings.thresholds)} />
      </Panel>
    </form>
  );
}

const monitoringSchema = z.object({
  defaultIntervalSeconds: z.coerce.number().int().min(30),
  defaultTimeoutMs: z.coerce.number().int().min(1000, "Minimum 1000 ms").max(30000, "Maximum 30000 ms"),
  followRedirects: z.boolean(),
  region: z.string().min(1),
});

function MonitoringForm({ settings }: { settings: Settings }) {
  const save = useSaveSection(settings, "monitoring");
  const form = useForm<Settings["monitoring"]>({ resolver: zodResolver(monitoringSchema), values: settings.monitoring });
  const { register, handleSubmit, formState, control, reset } = form;
  return (
    <form onSubmit={handleSubmit(save)} noValidate>
      <Panel title="Monitoring preferences" description="Defaults applied to new monitors.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Row id="mon-interval" label="Default interval">
            <Controller
              control={control}
              name="defaultIntervalSeconds"
              render={({ field }) => (
                <Select value={String(field.value)} onValueChange={(v) => field.onChange(Number(v))}>
                  <SelectTrigger id="mon-interval">
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
          </Row>
          <Row id="mon-timeout" label="Default timeout (ms)" error={formState.errors.defaultTimeoutMs?.message}>
            <Input id="mon-timeout" type="number" inputMode="numeric" aria-invalid={!!formState.errors.defaultTimeoutMs} {...register("defaultTimeoutMs")} />
          </Row>
          <Row id="mon-region" label="Primary check region">
            <Controller
              control={control}
              name="region"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="mon-region">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REGIONS.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Row>
        </div>
        <div className="mt-2 border-t">
          <SwitchRow control={control} name="followRedirects" label="Follow redirects" description="Treat 3xx responses by following them to the final URL." />
        </div>
        <FormFooter dirty={formState.isDirty} onReset={() => reset(settings.monitoring)} />
      </Panel>
    </form>
  );
}

function DataPanel({ isSample }: { isSample: boolean }) {
  const { actions } = useSentinel();
  return (
    <Panel title="Workspace data" description="Data is stored in this browser.">
      <div className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium">Reset to sample data</p>
            <p className="text-xs text-muted-foreground">Replace everything with a fresh set of sample monitors and history.</p>
          </div>
          <ConfirmButton
            label="Reset sample data"
            title="Reset to sample data?"
            description="All monitors, incidents and notifications will be replaced with sample data."
            onConfirm={() => {
              actions.resetSampleData();
              toast.success("Sample data restored");
            }}
          />
        </div>
        <div className="flex flex-col gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium">Start from scratch</p>
            <p className="text-xs text-muted-foreground">
              {isSample ? "Remove the sample data and keep your settings." : "Delete all monitors, history, incidents and notifications."}
            </p>
          </div>
          <ConfirmButton
            destructive
            label="Clear all data"
            title="Clear all workspace data?"
            description="Monitors, check history, incidents and notifications will be deleted. Settings are kept."
            onConfirm={() => {
              actions.clearAllData();
              toast.success("Workspace cleared");
            }}
          />
        </div>
      </div>
    </Panel>
  );
}

function ConfirmButton({
  label,
  title,
  description,
  onConfirm,
  destructive,
}: {
  label: string;
  title: string;
  description: string;
  onConfirm: () => void;
  destructive?: boolean;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant={destructive ? "destructive" : "outline"} className="shrink-0">
          {label}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className={destructive ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : undefined}
            onClick={onConfirm}
          >
            {label}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
