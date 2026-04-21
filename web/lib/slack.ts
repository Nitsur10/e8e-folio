/**
 * Slack integration helpers for posting feedback and notifications.
 * Used by the FeedbackWidget and server-side API routes.
 */

interface SlackMessage {
  channel?: string;
  text: string;
  blocks?: SlackBlock[];
  thread_ts?: string;
}

interface SlackBlock {
  type: string;
  text?: { type: string; text: string };
  elements?: Array<{ type: string; text: string }>;
}

const SLACK_WEBHOOK_URL_RE = /^https:\/\/hooks\.slack\.com\//;

/**
 * Post a message to Slack using an incoming webhook URL.
 * Use this for simple notifications from the app.
 *
 * The URL must point at Slack's webhook domain — this is a simple guard against
 * SSRF if the caller is ever wired from a user-controllable source.
 */
export async function postToSlackWebhook(
  webhookUrl: string,
  message: { text: string; blocks?: SlackBlock[] }
): Promise<boolean> {
  if (!SLACK_WEBHOOK_URL_RE.test(webhookUrl)) {
    console.error('Rejected non-Slack webhook URL');
    return false;
  }
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    });
    return response.ok;
  } catch (error) {
    console.error('Failed to post to Slack webhook:', error);
    return false;
  }
}

/**
 * Post a message to a Slack channel using the Bot Token.
 * Use this when you need to post to specific channels or threads.
 * Only use server-side (API routes).
 */
export async function postToSlackChannel(
  botToken: string,
  message: SlackMessage
): Promise<{ ok: boolean; ts?: string; error?: string }> {
  try {
    const response = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${botToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });
    return await response.json();
  } catch (error) {
    console.error('Failed to post to Slack channel:', error);
    return { ok: false, error: String(error) };
  }
}

/**
 * Format a feedback item as a Slack message with blocks.
 */
export function formatFeedbackMessage(feedback: {
  category: string;
  priority: string;
  summary: string;
  raw_message: string;
  slack_user_name?: string;
}) {
  const priorityEmoji: Record<string, string> = {
    P0: '🔴',
    P1: '🟠',
    P2: '🟡',
    P3: '🟢',
  };

  const categoryEmoji: Record<string, string> = {
    bug: '🐛',
    feature: '✨',
    question: '❓',
    improvement: '💡',
    documentation: '📝',
    other: '📋',
  };

  return {
    text: `${priorityEmoji[feedback.priority] || '📋'} ${feedback.summary}`,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `${priorityEmoji[feedback.priority] || '📋'} *${feedback.priority}* — ${categoryEmoji[feedback.category] || '📋'} *${feedback.category}*\n${feedback.summary}`,
        },
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `Reported by ${feedback.slack_user_name || 'user'} | Original: _${feedback.raw_message.substring(0, 100)}${feedback.raw_message.length > 100 ? '...' : ''}_`,
          },
        ],
      },
    ],
  };
}
