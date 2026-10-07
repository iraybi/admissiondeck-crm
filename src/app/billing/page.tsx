import { Shell, PageHead } from "@/components/layout/Shell";
import { Button } from "@/components/ui/Button";
import { StatusRow } from "@/components/ui/Status";
import { Table, Row, Cell } from "@/components/ui/Table";
import { SeatUsage } from "@/components/domain/SeatUsage";
import { agencies, firm } from "@/lib/demo-data";
import { adminNav, currentUser, firmOrg } from "@/lib/portal";
import { formatMoney } from "@/lib/utils";

const SEAT_PRICE = 2500;

export default function BillingPage() {
  const used = agencies.reduce((t, a) => t + a.seatsUsed, 0);
  const billed = agencies.reduce((t, a) => t + a.seatsBilled, 0);

  return (
    <Shell
      portal="admin"
      orgName={firmOrg.name}
      orgPath={firmOrg.path}
      user={{ name: currentUser.name, role: "Firm manager" }}
      nav={adminNav}
    >
      <PageHead
        title="Seats and billing"
        subtitle="Enterprise firm license · seat-based subscription"
        actions={<Button variant="secondary">Open billing portal</Button>}
      />

      <div className="grid-2">
        <div className="stack">
          <section className="card">
            <div className="card-head">
              <h2>Subscription</h2>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "var(--space-3)",
                marginBottom: "var(--space-5)",
              }}
            >
              <div className="status-row is-brand">
                <div>
                  <div className="kicker">Plan</div>
                  <div className="font-semibold">Enterprise firm</div>
                </div>
              </div>
              <div className="status-row is-brand">
                <div>
                  <div className="kicker">Seat price</div>
                  <div className="font-semibold tabular">
                    {formatMoney(SEAT_PRICE, "BDT")}
                  </div>
                </div>
              </div>
              <div className="status-row is-brand">
                <div>
                  <div className="kicker">Minimum</div>
                  <div className="font-semibold tabular">10 seats</div>
                </div>
              </div>
            </div>
            <SeatUsage used={used} billed={billed} unitPrice={SEAT_PRICE} />
          </section>

          <section className="card">
            <div className="card-head">
              <h2>Agency seat breakdown</h2>
            </div>
            <Table
              columns={[
                { key: "agency", label: "Agency" },
                { key: "used", label: "Used", align: "right" },
                { key: "billed", label: "Billed", align: "right" },
                { key: "monthly", label: "Monthly", align: "right" },
              ]}
            >
              {agencies.map((a) => (
                <Row key={a.id}>
                  <Cell>{a.name}</Cell>
                  <Cell align="right">
                    <span className="tabular">{a.seatsUsed}</span>
                  </Cell>
                  <Cell align="right">
                    <span className="tabular">{a.seatsBilled}</span>
                  </Cell>
                  <Cell align="right">
                    <span className="tabular">
                      {formatMoney(a.seatsBilled * SEAT_PRICE, "BDT")}
                    </span>
                  </Cell>
                </Row>
              ))}
              <Row>
                <Cell>
                  <span className="font-semibold">Total</span>
                </Cell>
                <Cell align="right">
                  <span className="tabular font-semibold">{used}</span>
                </Cell>
                <Cell align="right">
                  <span className="tabular font-semibold">{billed}</span>
                </Cell>
                <Cell align="right">
                  <span className="tabular font-semibold">
                    {formatMoney(billed * SEAT_PRICE, "BDT")}
                  </span>
                </Cell>
              </Row>
            </Table>
          </section>
        </div>

        <div className="stack">
          <section className="card">
            <div className="card-head">
              <h2>How seat billing works</h2>
            </div>
            <div className="stack-sm">
              <StatusRow
                tone="brand"
                title="1. Invite a counsellor or agent"
                detail="Agency manager opens the team invite flow"
              />
              <StatusRow
                tone="brand"
                title="2. Check active users against seats"
                detail="Server action compares headcount to provisioned seats"
              />
              <StatusRow
                tone="brand"
                title="3. Increment subscription quantity"
                detail="Stripe quantity increases by 1 when at the limit"
              />
              <StatusRow
                tone="brand"
                title="4. Proration on the next invoice"
                detail="Mid-cycle additions are prorated automatically"
              />
              <StatusRow
                tone="brand"
                title="5. Send the invite"
                detail="Dispatched only after Stripe confirms the update"
              />
            </div>
          </section>

          <section className="card">
            <div className="card-head">
              <h2>Webhook status</h2>
            </div>
            <div className="stack-sm">
              <StatusRow
                tone="ok"
                title="invoice.payment_succeeded"
                detail="Last received 1 day ago"
              />
              <StatusRow
                tone="ok"
                title="customer.subscription.updated"
                detail="Last received 3 days ago"
              />
              <StatusRow
                tone="info"
                title="invoice.payment_failed"
                detail="No events this cycle"
              />
            </div>
            <p className="text-sm muted" style={{ marginTop: "var(--space-4)" }}>
              Events are queued and retried until the local database converges
              with Stripe.
            </p>
          </section>
        </div>
      </div>
    </Shell>
  );
}
