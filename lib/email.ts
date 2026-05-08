import { Resend } from "resend";
import type { Status } from "@/types";

// Lazy — only instantiated when an email function is called, not at module load time
function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "team@nerdshouse.in";
const FROM = "Nerdshouse Portal <noreply@nerdshouse.in>";

const STATUS_LABELS: Record<Status, string> = {
  open:        "Open",
  in_progress: "In Progress",
  review:      "In Review",
  done:        "Done",
};

export async function sendTicketCreatedEmail(params: {
  ticketId: string;
  title: string;
  clientName: string;
  clientEmail: string;
  priority: string;
  type: string;
  module: string;
}) {
  const url = `${APP_URL}/tickets/${params.ticketId}`;

  await getResend().emails.send({
    from: FROM,
    to: ADMIN_EMAIL,
    subject: `[${params.priority}] New ${params.type}: ${params.title}`,
    html: `
      <div style="font-family: Inter, sans-serif; max-width: 560px; color: #1a1a1a;">
        <h2 style="margin-bottom: 4px;">New Request Submitted</h2>
        <p style="color: #6b7280; margin-top: 0;">From ${params.clientName} (${params.clientEmail})</p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13px;">
          <tr><td style="padding: 4px 0; color: #6b7280; width: 90px;">Title</td><td><strong>${params.title}</strong></td></tr>
          <tr><td style="padding: 4px 0; color: #6b7280;">Priority</td><td>${params.priority}</td></tr>
          <tr><td style="padding: 4px 0; color: #6b7280;">Type</td><td>${params.type}</td></tr>
          <tr><td style="padding: 4px 0; color: #6b7280;">Module</td><td>${params.module || "—"}</td></tr>
        </table>
        <a href="${url}" style="display: inline-block; background: #4a4fe0; color: white; padding: 8px 16px; border-radius: 8px; text-decoration: none; font-size: 13px; font-weight: 500;">
          View Ticket →
        </a>
      </div>
    `,
  });
}

export async function sendStatusChangedEmail(params: {
  ticketId: string;
  title: string;
  newStatus: Status;
  clientName: string;
  clientEmail: string;
}) {
  if (!params.clientEmail) return;
  const url = `${APP_URL}/tickets/${params.ticketId}`;
  const statusLabel = STATUS_LABELS[params.newStatus];

  await getResend().emails.send({
    from: FROM,
    to: params.clientEmail,
    subject: `Update on your request: ${params.title}`,
    html: `
      <div style="font-family: Inter, sans-serif; max-width: 560px; color: #1a1a1a;">
        <h2 style="margin-bottom: 4px;">Request Status Updated</h2>
        <p style="color: #6b7280; margin-top: 0;">Hi ${params.clientName},</p>
        <p style="font-size: 14px;">The status of your request <strong>"${params.title}"</strong> has been updated to:</p>
        <p style="font-size: 20px; font-weight: 600; color: #4a4fe0; margin: 12px 0;">${statusLabel}</p>
        <a href="${url}" style="display: inline-block; background: #4a4fe0; color: white; padding: 8px 16px; border-radius: 8px; text-decoration: none; font-size: 13px; font-weight: 500;">
          View Ticket →
        </a>
        <p style="font-size: 12px; color: #9ca3af; margin-top: 24px;">Nerdshouse Technologies LLP</p>
      </div>
    `,
  });
}

export async function sendTeamInviteEmail(params: {
  name: string;
  email: string;
  role: string;
}) {
  const loginUrl = `${APP_URL}/login`;

  await getResend().emails.send({
    from: FROM,
    to: params.email,
    subject: `You've been added to the Nerdshouse team as ${params.role}`,
    html: `
      <div style="font-family: Inter, sans-serif; max-width: 560px; color: #1a1a1a;">
        <h2 style="margin-bottom: 4px;">Welcome to Nerdshouse Portal</h2>
        <p style="color: #6b7280; margin-top: 0;">Hi ${params.name},</p>
        <p style="font-size: 14px;">You've been added to the Nerdshouse team as <strong>${params.role}</strong>. Sign in with your email to get started.</p>
        <a href="${loginUrl}" style="display: inline-block; background: #4a4fe0; color: white; padding: 8px 16px; border-radius: 8px; text-decoration: none; font-size: 13px; font-weight: 500;">
          Sign In →
        </a>
        <p style="font-size: 12px; color: #9ca3af; margin-top: 24px;">Nerdshouse Technologies LLP</p>
      </div>
    `,
  });
}
