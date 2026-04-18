'use client';

import { useState } from 'react';
import { getSupabase } from '@/lib/supabase';

interface FeedbackWidgetProps {
  projectName?: string;
  slackWebhookUrl?: string;
  position?: 'bottom-right' | 'bottom-left';
}

/**
 * Drop-in feedback widget that:
 * 1. Captures user feedback via a floating button + modal
 * 2. Inserts it into the feedback_items table in Supabase
 * 3. Optionally posts to a Slack webhook
 * 
 * Usage:
 *   <FeedbackWidget projectName="my-app" />
 */
export default function FeedbackWidget({
  projectName = 'this app',
  slackWebhookUrl,
  position = 'bottom-right',
}: FeedbackWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [category, setCategory] = useState<string>('bug');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categories = [
    { value: 'bug', label: 'Bug report', icon: '🐛' },
    { value: 'feature', label: 'Feature request', icon: '✨' },
    { value: 'question', label: 'Question', icon: '❓' },
    { value: 'improvement', label: 'Improvement', icon: '💡' },
  ];

  async function handleSubmit() {
    if (!message.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      // Insert into Supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: dbError } = await (getSupabase() as any)
        .from('feedback_items')
        .insert({
          raw_message: message.trim(),
          category,
          status: 'received',
          priority: 'P3', // Default, routine will re-classify
          metadata: {
            source: 'feedback_widget',
            project: projectName,
            page_url: typeof window !== 'undefined' ? window.location.href : '',
            user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
            submitted_at: new Date().toISOString(),
          },
        });

      if (dbError) throw dbError;

      // Optionally post to Slack webhook
      if (slackWebhookUrl) {
        await fetch(slackWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: `New ${category} feedback via widget: ${message.trim().substring(0, 200)}`,
          }),
        }).catch(() => {
          // Don't fail the submission if Slack webhook fails
        });
      }

      setSubmitted(true);
      setMessage('');
    } catch (err) {
      setError('Failed to submit feedback. Please try again.');
      console.error('Feedback submission error:', err);
    } finally {
      setSubmitting(false);
    }
  }

  function handleClose() {
    setIsOpen(false);
    setSubmitted(false);
    setError(null);
  }

  const positionStyles =
    position === 'bottom-right'
      ? { right: '20px', bottom: '20px' }
      : { left: '20px', bottom: '20px' };

  return (
    <div style={{ position: 'fixed', zIndex: 9999, ...positionStyles }}>
      {/* Floating trigger button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: '#534AB7',
            color: 'white',
            border: 'none',
            cursor: 'pointer',
            fontSize: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          }}
          aria-label="Send feedback"
        >
          💬
        </button>
      )}

      {/* Feedback modal */}
      {isOpen && (
        <div
          style={{
            width: '340px',
            background: 'white',
            borderRadius: '12px',
            boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
            overflow: 'hidden',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '14px 16px',
              borderBottom: '1px solid #eee',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span style={{ fontWeight: 600, fontSize: '14px' }}>
              Send feedback
            </span>
            <button
              onClick={handleClose}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '18px',
                color: '#888',
              }}
            >
              ×
            </button>
          </div>

          {/* Body */}
          <div style={{ padding: '16px' }}>
            {submitted ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>✅</div>
                <p style={{ fontSize: '14px', color: '#333', margin: 0 }}>
                  Thanks for your feedback!
                </p>
                <p
                  style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}
                >
                  We'll review it and follow up in Slack.
                </p>
                <button
                  onClick={handleClose}
                  style={{
                    marginTop: '12px',
                    padding: '8px 20px',
                    borderRadius: '6px',
                    border: '1px solid #ddd',
                    background: 'white',
                    cursor: 'pointer',
                    fontSize: '13px',
                  }}
                >
                  Close
                </button>
              </div>
            ) : (
              <>
                {/* Category selector */}
                <div
                  style={{
                    display: 'flex',
                    gap: '6px',
                    marginBottom: '12px',
                    flexWrap: 'wrap',
                  }}
                >
                  {categories.map((cat) => (
                    <button
                      key={cat.value}
                      onClick={() => setCategory(cat.value)}
                      style={{
                        padding: '6px 10px',
                        borderRadius: '16px',
                        border: `1px solid ${category === cat.value ? '#534AB7' : '#ddd'}`,
                        background:
                          category === cat.value ? '#EEEDFE' : 'white',
                        color: category === cat.value ? '#534AB7' : '#666',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: category === cat.value ? 600 : 400,
                      }}
                    >
                      {cat.icon} {cat.label}
                    </button>
                  ))}
                </div>

                {/* Message input */}
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Describe what happened or what you'd like to see..."
                  style={{
                    width: '100%',
                    height: '100px',
                    padding: '10px',
                    borderRadius: '8px',
                    border: '1px solid #ddd',
                    fontSize: '13px',
                    resize: 'vertical',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box',
                  }}
                />

                {error && (
                  <p
                    style={{
                      color: '#e24b4a',
                      fontSize: '12px',
                      margin: '8px 0 0',
                    }}
                  >
                    {error}
                  </p>
                )}

                {/* Submit button */}
                <button
                  onClick={handleSubmit}
                  disabled={!message.trim() || submitting}
                  style={{
                    marginTop: '10px',
                    width: '100%',
                    padding: '10px',
                    borderRadius: '8px',
                    border: 'none',
                    background:
                      !message.trim() || submitting ? '#ccc' : '#534AB7',
                    color: 'white',
                    cursor:
                      !message.trim() || submitting ? 'default' : 'pointer',
                    fontSize: '13px',
                    fontWeight: 600,
                  }}
                >
                  {submitting ? 'Submitting...' : 'Submit feedback'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
