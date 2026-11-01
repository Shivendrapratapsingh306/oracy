"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, ButtonLink } from "@/components/Button";
import { Badge, Card, EmptyState, PageHeader, SelectField } from "@/components/dashboard/ui";
import { ScorePill } from "@/features/dashboard/parts";
import { InterviewReportModal } from "@/features/dashboard/InterviewReportModal";
import { getInterviewHistory, type PersistedInterviewSession } from "@/services/api";
import { useTranslation } from "@/features/i18n/LanguageContext";

const filterOptions = [
  { value: "all", label: "All Sessions" },
  { value: "completed", label: "Completed" },
  { value: "in_progress", label: "In Progress / Interrupted" },
];

export function HistoryPage() {
  const { t, formatDate } = useTranslation();
  const [statusFilter, setStatusFilter] = useState("all");
  const [savedSessions, setSavedSessions] = useState<Array<Omit<PersistedInterviewSession, "questions">>>([]);
  const [historyError, setHistoryError] = useState("");
  const [historyLoading, setHistoryLoading] = useState(true);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  useEffect(() => {
    getInterviewHistory()
      .then(setSavedSessions)
      .catch((error) => {
        setHistoryError(error instanceof Error ? error.message : "Could not load saved sessions.");
      })
      .finally(() => setHistoryLoading(false));
  }, []);

  const filteredSessions = useMemo(() => {
    return savedSessions.filter((s) => {
      if (statusFilter === "completed") return s.status === "completed";
      if (statusFilter === "in_progress") return s.status !== "completed";
      return true;
    });
  }, [savedSessions, statusFilter]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("dashboard.history.title")}
        description="Review your authentic completed interviews, communication metrics, and reopen past performance reports."
        actions={<ButtonLink href="/interview">Start Mock Interview</ButtonLink>}
      />

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl text-ink">Your Saved Practice Sessions</h2>
            <p className="mt-1 text-sm text-sub">
              Loaded directly from the database for your authenticated account.
            </p>
          </div>
          <div className="w-52">
            <SelectField
              label="Filter by Status"
              value={statusFilter}
              options={filterOptions}
              onChange={(e) => setStatusFilter(e.target.value)}
            />
          </div>
        </div>

        {historyLoading ? (
          <div className="py-12 text-center">
            <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-cobalt/20 border-t-cobalt" />
            <p className="mt-3 text-sm text-sub">Retrieving your practice records…</p>
          </div>
        ) : historyError ? (
          <p role="alert" className="mt-4 text-sm text-amber-800">
            Could not load saved sessions: {historyError}
          </p>
        ) : filteredSessions.length === 0 ? (
          <div className="mt-6">
            <EmptyState
              icon="history"
              title={statusFilter === "all" ? "No interview sessions yet" : "No matching sessions"}
              text={
                statusFilter === "all"
                  ? "Start a practice interview session. Your questions, speech metrics, and evaluations will be recorded here."
                  : "No sessions found for this status filter."
              }
              action={<ButtonLink href="/interview">Start your first interview</ButtonLink>}
            />
          </div>
        ) : (
          <ul className="mt-6 divide-y divide-line">
            {filteredSessions.map((session) => (
              <li key={session.id} className="flex flex-wrap items-center justify-between gap-4 py-4.5">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-ink text-base">{session.target_role}</p>
                    <Badge tone={session.status === "completed" ? "ok" : "warn"}>
                      {session.status === "completed" ? "Completed" : "In Progress"}
                    </Badge>
                    <span className="text-xs text-mute capitalize">
                      {session.experience_level} · {session.interview_type}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-sub">
                    {new Date(session.created_at).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}{" "}
                    · <strong className="text-ink">{session.answered_count}</strong> of{" "}
                    {session.question_count} questions answered
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  {session.average_score !== null ? (
                    <ScorePill score={session.average_score} />
                  ) : (
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600 font-medium">
                      Unscored
                    </span>
                  )}
                  <Button
                    variant="outline"
                    className="text-xs py-1.5 px-3 border-cobalt/30 text-cobalt hover:bg-cobalt/5"
                    onClick={() => setSelectedSessionId(session.id)}
                  >
                    View Report →
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Reopen Complete Report Modal */}
      {selectedSessionId && (
        <InterviewReportModal
          sessionId={selectedSessionId}
          onClose={() => setSelectedSessionId(null)}
        />
      )}
    </div>
  );
}
