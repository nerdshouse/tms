import { Resend } from "resend";

function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const FROM = "Nerdshouse Portal <noreply@nerdshouse.in>";

/** Notify a team member that a ticket has been assigned to them. */
export async function notifyTicketAssigned(params: {
  ticketId: string;
  title: string;
  assigneeName: string;
  assigneeEmail: string;
  clientName: string;
  priority: string;
  type: string;
}) {
  if (!params.assigneeEmail) return;
  const url = `${APP_URL}/tickets/${params.ticketId}`;

  await getResend().emails.send({
    from: FROM,
    to: params.assigneeEmail,
    subject: `[${params.priority}] Assigned to you: ${params.title}`,
    html: `
      <div style="font-family: Inter, sans-serif; max-width: 560px; color: #1a1a1a;">
        <h2 style="margin-bottom: 4px;">Ticket Assigned to You</h2>
        <p style="color: #6b7280; margin-top: 0;">Hi ${params.assigneeName},</p>
        <p style="font-size: 14px;">A ticket has been assigned to you from <strong>${params.clientName}</strong>:</p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13px;">
          <tr><td style="padding: 4px 0; color: #6b7280; width: 90px;">Title</td><td><strong>${params.title}</strong></td></tr>
          <tr><td style="padding: 4px 0; color: #6b7280;">Priority</td><td>${params.priority}</td></tr>
          <tr><td style="padding: 4px 0; color: #6b7280;">Type</td><td>${params.type}</td></tr>
        </table>
        <a href="${url}" style="display: inline-block; background: #4a4fe0; color: white; padding: 8px 16px; border-radius: 8px; text-decoration: none; font-size: 13px; font-weight: 500;">
          View Ticket →
        </a>
        <p style="font-size: 12px; color: #9ca3af; margin-top: 24px;">Nerdshouse Technologies LLP</p>
      </div>
    `,
  });
}

/** Notify an assigned team member that the client has replied on a ticket. */
export async function notifyClientReply(params: {
  ticketId: string;
  title: string;
  assigneeName: string;
  assigneeEmail: string;
  clientName: string;
  message: string;
}) {
  if (!params.assigneeEmail) return;
  const url = `${APP_URL}/tickets/${params.ticketId}`;

  await getResend().emails.send({
    from: FROM,
    to: params.assigneeEmail,
    subject: `Client replied on: ${params.title}`,
    html: `
      <div style="font-family: Inter, sans-serif; max-width: 560px; color: #1a1a1a;">
        <h2 style="margin-bottom: 4px;">Client Replied on a Ticket</h2>
        <p style="color: #6b7280; margin-top: 0;">Hi ${params.assigneeName},</p>
        <p style="font-size: 14px;"><strong>${params.clientName}</strong> has replied on a ticket assigned to you: <strong>"${params.title}"</strong></p>
        <blockquote style="border-left: 3px solid #3b82f6; margin: 16px 0; padding: 10px 16px; background: #eff6ff; border-radius: 0 8px 8px 0; font-size: 13px; color: #374151; white-space: pre-wrap;">
          ${params.message.replace(/</g, "&lt;").replace(/>/g, "&gt;")}
        </blockquote>
        <a href="${url}" style="display: inline-block; background: #4a4fe0; color: white; padding: 8px 16px; border-radius: 8px; text-decoration: none; font-size: 13px; font-weight: 500;">
          View &amp; Reply →
        </a>
        <p style="font-size: 12px; color: #9ca3af; margin-top: 24px;">Nerdshouse Technologies LLP</p>
      </div>
    `,
  });
}

/** Notify a client that the Nerdshouse team has posted a new comment on their ticket. */
export async function notifyNewComment(params: {
  ticketId: string;
  title: string;
  clientName: string;
  clientEmail: string;
  authorName: string;
  message: string;
}) {
  if (!params.clientEmail) return;
  const url = `${APP_URL}/tickets/${params.ticketId}`;

  await getResend().emails.send({
    from: FROM,
    to: params.clientEmail,
    subject: `New reply on your request: ${params.title}`,
    html: `
      <div style="font-family: Inter, sans-serif; max-width: 560px; color: #1a1a1a;">
        <h2 style="margin-bottom: 4px;">New Reply on Your Request</h2>
        <p style="color: #6b7280; margin-top: 0;">Hi ${params.clientName},</p>
        <p style="font-size: 14px;"><strong>${params.authorName}</strong> from the Nerdshouse team has replied to your request <strong>"${params.title}"</strong>:</p>
        <blockquote style="border-left: 3px solid #4a4fe0; margin: 16px 0; padding: 10px 16px; background: #f5f5ff; border-radius: 0 8px 8px 0; font-size: 13px; color: #374151; white-space: pre-wrap;">
          ${params.message.replace(/</g, "&lt;").replace(/>/g, "&gt;")}
        </blockquote>
        <a href="${url}" style="display: inline-block; background: #4a4fe0; color: white; padding: 8px 16px; border-radius: 8px; text-decoration: none; font-size: 13px; font-weight: 500;">
          View &amp; Reply →
        </a>
        <p style="font-size: 12px; color: #9ca3af; margin-top: 24px;">Nerdshouse Technologies LLP</p>
      </div>
    `,
  });
}
