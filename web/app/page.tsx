import { APP_NAME, DISCLAIMER } from '@folio/shared';

export default function Home() {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 24px',
        gap: '16px',
      }}
    >
      <h1
        style={{
          fontFamily: 'var(--serif)',
          fontSize: '52px',
          fontWeight: 400,
          letterSpacing: '-0.02em',
        }}
      >
        Hello from{' '}
        <em style={{ fontStyle: 'italic', color: 'var(--amber)' }}>
          {APP_NAME}
        </em>
      </h1>
      <p
        style={{
          fontFamily: 'var(--mono)',
          fontSize: '11px',
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'var(--ink-quiet)',
        }}
      >
        {DISCLAIMER}
      </p>
    </main>
  );
}
