import FeedbackWidget from '@/components/FeedbackWidget';

export default function Home() {
  return (
    <main style={{ minHeight: '100vh', padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
      <h1>Welcome</h1>
      <p>Your project is up and running. Drop feedback using the widget in the corner.</p>

      <FeedbackWidget
        projectName={process.env.NEXT_PUBLIC_PROJECT_NAME || 'this app'}
        slackWebhookUrl={process.env.SLACK_WEBHOOK_URL}
      />
    </main>
  );
}
