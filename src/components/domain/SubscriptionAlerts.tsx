import { Button } from "@/components/ui/Button";
import type { SubscriptionAlert } from "@/lib/billing/subscription-alerts";

export function SubscriptionAlerts({
  alerts,
}: {
  alerts: SubscriptionAlert[];
}) {
  if (alerts.length === 0) return null;

  return (
    <div className="stack-sm" style={{ marginBottom: "var(--space-5)" }}>
      {alerts.map((alert, i) => (
        <div
          key={i}
          className={`status-row is-${alert.level === "critical" ? "bad" : alert.level === "warning" ? "warn" : "info"}`}
        >
          <div style={{ flex: 1 }}>
            <div className="font-medium text-sm">{alert.title}</div>
            <div className="text-sm muted">{alert.message}</div>
          </div>
          {alert.action ? (
            <Button variant="secondary" size="sm">
              {alert.action}
            </Button>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export function SubscriptionBanner({
  status,
  plan,
  daysRemaining,
  currentPeriodEnd,
}: {
  status: string;
  plan: string;
  daysRemaining: number | null;
  currentPeriodEnd: Date | null;
}) {
  const isExpiring = daysRemaining !== null && daysRemaining <= 14;
  const isCritical = daysRemaining !== null && daysRemaining <= 7;

  return (
    <div
      className={`status-row is-${isCritical ? "bad" : isExpiring ? "warn" : "brand"}`}
      style={{ marginBottom: "var(--space-5)" }}
    >
      <div style={{ flex: 1 }}>
        <div className="font-medium text-sm">
          {plan} · {status}
          {daysRemaining !== null ? ` · ${daysRemaining} days remaining` : ""}
        </div>
        <div className="text-sm muted">
          {currentPeriodEnd
            ? `Current period ends ${new Date(currentPeriodEnd).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`
            : "No renewal date set"}
        </div>
      </div>
      {isExpiring ? (
        <Button variant="secondary" size="sm">
          Contact us
        </Button>
      ) : null}
    </div>
  );
}
