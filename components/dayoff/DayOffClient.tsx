"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { totalApprovedLeaveDays } from "@/lib/domain/capacity";
import { fmt, fromISO, today, dayDiff, type WorkingCalendar } from "@/lib/domain/dates";
import { Avatar, Card } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/Toast";
import { decideDayOff, markDayOffSeen } from "@/app/(portal)/dayoff/actions";
import { DayOffRequestModal } from "./DayOffRequestModal";
import type { DayOff, Person } from "@/lib/types";

const STATUS_LABEL: Record<string, string> = { pending: "Pending", approved: "Approved", rejected: "Rejected" };
const STATUS_CLASS: Record<string, string> = { pending: "almost-full", approved: "available", rejected: "overloaded" };

function DayOffRow({ d, person, showPerson }: { d: DayOff; person: Person | null; showPerson?: boolean }) {
  return (
    <div className="dayoff-row">
      <div className="dayoff-main">
        {showPerson && <Avatar person={person} size="sm" />}
        <div>
          <div className="dayoff-top">
            {showPerson && <>{person?.name} — </>}
            {d.type} <span className={`cap-status-pill ${STATUS_CLASS[d.status]}`} style={{ marginLeft: 8 }}>{STATUS_LABEL[d.status]}</span>
          </div>
          <div className="dayoff-sub">
            {fmt(fromISO(d.start_date))} – {fmt(fromISO(d.end_date))}
            {d.note ? ` · ${d.note}` : ""}
            {d.status !== "pending" && d.comment ? ` · "${d.comment}"` : ""}
          </div>
        </div>
      </div>
    </div>
  );
}

export function DayOffClient({
  currentPerson,
  people,
  dayOff,
  canApprove,
  calendar,
}: {
  currentPerson: Person;
  people: Person[];
  dayOff: DayOff[];
  canApprove: boolean;
  calendar: WorkingCalendar;
}) {
  const router = useRouter();
  const toast = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [decidingId, setDecidingId] = useState<string | null>(null);
  const [comment, setComment] = useState("");

  const personById = (id: string) => people.find((p) => p.id === id) ?? null;

  const myRequests = dayOff.filter((d) => d.person_id === currentPerson.id).sort((a, b) => (a.start_date < b.start_date ? 1 : -1));
  const usedDays = totalApprovedLeaveDays(currentPerson.id, dayOff, calendar);
  const remaining = Math.max(0, currentPerson.leave_balance_days - usedDays);

  const pending = dayOff.filter((d) => d.status === "pending").sort((a, b) => (a.submitted_date < b.submitted_date ? -1 : 1));
  const upcomingApproved = dayOff
    .filter((d) => d.status === "approved" && dayDiff(today(), fromISO(d.end_date)) >= 0)
    .sort((a, b) => (a.start_date < b.start_date ? -1 : 1));

  async function handleDecide(id: string, status: "approved" | "rejected") {
    await decideDayOff(id, status, comment.trim());
    toast(status === "approved" ? "Request approved" : "Request rejected");
    setDecidingId(null);
    setComment("");
    router.refresh();
  }

  async function handleAcknowledge(id: string) {
    await markDayOffSeen(id);
    router.refresh();
  }

  const unseenDecisions = myRequests.filter((d) => d.status !== "pending" && !d.employee_seen);

  return (
    <>
      <div className="panel-head-row">
        <h2>Request Day Off</h2>
        <button className="btn btn-primary btn-sm" onClick={() => setModalOpen(true)}>
          {canApprove ? "+ Log time off" : "+ Request time off"}
        </button>
      </div>

      <div className="balance-hero">
        <div>
          <div className="balance-num">{remaining}</div>
          <div className="balance-label">days remaining, out of {currentPerson.leave_balance_days}</div>
        </div>
      </div>

      {unseenDecisions.length > 0 && (
        <div className="section-block">
          {unseenDecisions.map((d) => (
            <div key={d.id} className={`hint-banner`} style={d.status === "rejected" ? { background: "var(--pri-high-bg)", color: "var(--health-blocked)" } : undefined}>
              Your {d.type} request ({fmt(fromISO(d.start_date))} – {fmt(fromISO(d.end_date))}) was {d.status}
              {d.comment ? ` — "${d.comment}"` : ""}.
              <button className="linklike" style={{ marginLeft: "auto" }} onClick={() => handleAcknowledge(d.id)}>
                Dismiss
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="two-col">
        <div className="stack-gap">
          {canApprove && (
            <Card>
              <div className="section-title">Pending approvals {pending.length > 0 && `(${pending.length})`}</div>
              {pending.length ? (
                pending.map((d) => (
                  <div key={d.id} style={{ borderBottom: "1px solid var(--border-soft)", paddingBottom: 12, marginBottom: 12 }}>
                    <DayOffRow d={d} person={personById(d.person_id)} showPerson />
                    {decidingId === d.id ? (
                      <div style={{ marginTop: 8 }}>
                        <input
                          type="text"
                          placeholder="Optional comment"
                          value={comment}
                          onChange={(e) => setComment(e.target.value)}
                          style={{ width: "100%", border: "1px solid var(--border)", borderRadius: 10, padding: "8px 11px", fontSize: 12.5, marginBottom: 8 }}
                        />
                        <div style={{ display: "flex", gap: 8 }}>
                          <button className="btn btn-primary btn-sm" onClick={() => handleDecide(d.id, "approved")}>Approve</button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleDecide(d.id, "rejected")}>Reject</button>
                          <button className="btn btn-ghost btn-sm" onClick={() => { setDecidingId(null); setComment(""); }}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <button className="linklike" style={{ marginTop: 6, fontWeight: 700 }} onClick={() => setDecidingId(d.id)}>
                        Review →
                      </button>
                    )}
                  </div>
                ))
              ) : (
                <div className="empty-state">Nothing waiting on approval.</div>
              )}
            </Card>
          )}

          <Card>
            <div className="section-title">My requests</div>
            {myRequests.length ? (
              myRequests.map((d) => <DayOffRow d={d} person={currentPerson} key={d.id} />)
            ) : (
              <div className="empty-state">No time off requested yet.</div>
            )}
          </Card>
        </div>

        <Card>
          <div className="section-title">Team calendar — upcoming absences</div>
          {upcomingApproved.length ? (
            upcomingApproved.map((d) => <DayOffRow d={d} person={personById(d.person_id)} showPerson key={d.id} />)
          ) : (
            <div className="empty-state">No approved absences coming up.</div>
          )}
        </Card>
      </div>

      {modalOpen && (
        <DayOffRequestModal
          onClose={() => setModalOpen(false)}
          currentPerson={currentPerson}
          people={people}
          canApprove={canApprove}
        />
      )}
    </>
  );
}
