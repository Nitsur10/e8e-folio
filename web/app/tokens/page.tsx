import { colors, radii, spacing, typeScale } from '@folio/shared/design-tokens';

type ColorKey = keyof typeof colors;

export const metadata = {
  title: 'folio.e8e — design tokens',
};

const colorGroups: Array<{ label: string; keys: ColorKey[] }> = [
  { label: 'Background / surface', keys: ['bg', 'bgElev', 'surface', 'surface2', 'surface3'] },
  { label: 'Ink', keys: ['ink', 'inkDim', 'inkQuiet'] },
  { label: 'Rule', keys: ['rule', 'ruleSoft'] },
  { label: 'Amber (agent voice)', keys: ['amber', 'amberSoft', 'amberBg'] },
  { label: 'Teal (paper / confirmed)', keys: ['teal', 'tealSoft', 'tealBg'] },
  { label: 'Sage / profit', keys: ['sage', 'sageBg', 'profit'] },
  { label: 'Rose / loss', keys: ['rose', 'roseBg', 'loss'] },
  { label: 'Cream', keys: ['cream'] },
];

export default function TokensPage() {
  return (
    <main
      style={{
        minHeight: '100vh',
        padding: '64px 48px',
        maxWidth: '1200px',
        margin: '0 auto',
      }}
    >
      <h1
        style={{
          fontFamily: 'var(--serif)',
          fontSize: '44px',
          fontWeight: 400,
          letterSpacing: '-0.02em',
          marginBottom: '8px',
        }}
      >
        Design <em style={{ fontStyle: 'italic', color: 'var(--amber)' }}>tokens</em>
      </h1>
      <p
        style={{
          fontFamily: 'var(--mono)',
          fontSize: '11px',
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'var(--ink-quiet)',
          marginBottom: '48px',
        }}
      >
        source of truth · @folio/shared/design-tokens
      </p>

      <section style={{ marginBottom: '64px' }}>
        <h2 style={sectionHeading}>Colors</h2>
        {colorGroups.map((group) => (
          <div key={group.label} style={{ marginBottom: '32px' }}>
            <div style={groupLabel}>{group.label}</div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                gap: '12px',
              }}
            >
              {group.keys.map((key) => (
                <Swatch key={key} name={key} value={colors[key]} />
              ))}
            </div>
          </div>
        ))}
      </section>

      <section style={{ marginBottom: '64px' }}>
        <h2 style={sectionHeading}>Typography scale</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {Object.entries(typeScale).map(([name, t]) => {
            const hasLetterSpacing = 'letterSpacing' in t;
            const isUppercase = 'uppercase' in t && t.uppercase;
            return (
              <div key={name} style={{ display: 'flex', alignItems: 'baseline', gap: '24px' }}>
                <span style={tokenLabel}>{name}</span>
                <span
                  style={{
                    fontFamily: `var(--${t.font})`,
                    fontSize: `${t.size}px`,
                    fontWeight: t.weight,
                    color: 'var(--ink)',
                    letterSpacing: hasLetterSpacing ? `${t.letterSpacing}em` : undefined,
                    textTransform: isUppercase ? 'uppercase' : undefined,
                  }}
                >
                  The quick brown fox 1,234.56
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <section style={{ marginBottom: '64px' }}>
        <h2 style={sectionHeading}>Spacing</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {Object.entries(spacing).map(([name, value]) => (
            <div key={name} style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <span style={{ ...tokenLabel, width: '60px' }}>{name}</span>
              <span style={{ ...tokenLabel, width: '60px', color: 'var(--ink-dim)' }}>{value}px</span>
              <div
                style={{
                  height: '8px',
                  width: `${value}px`,
                  background: 'var(--amber)',
                  borderRadius: '2px',
                }}
              />
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 style={sectionHeading}>Radii</h2>
        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
          {Object.entries(radii).map(([name, value]) => (
            <div key={name} style={{ textAlign: 'center' }}>
              <div
                style={{
                  height: '80px',
                  width: '80px',
                  background: 'var(--surface)',
                  border: '1px solid var(--rule)',
                  borderRadius: `${value === 9999 ? 9999 : value}px`,
                  marginBottom: '8px',
                }}
              />
              <span style={tokenLabel}>{name}</span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

const sectionHeading: React.CSSProperties = {
  fontFamily: 'var(--serif)',
  fontSize: '28px',
  fontWeight: 400,
  marginBottom: '24px',
  letterSpacing: '-0.015em',
};

const groupLabel: React.CSSProperties = {
  fontFamily: 'var(--mono)',
  fontSize: '10px',
  letterSpacing: '0.2em',
  textTransform: 'uppercase',
  color: 'var(--ink-quiet)',
  marginBottom: '12px',
};

const tokenLabel: React.CSSProperties = {
  fontFamily: 'var(--mono)',
  fontSize: '11px',
  letterSpacing: '0.1em',
  color: 'var(--ink-dim)',
};

function Swatch({ name, value }: { name: string; value: string }) {
  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--rule-soft)',
        borderRadius: 'var(--r-md)',
        padding: '12px',
      }}
    >
      <div
        style={{
          height: '56px',
          background: value,
          borderRadius: 'var(--r-sm)',
          border: '1px solid var(--rule-soft)',
          marginBottom: '10px',
        }}
      />
      <div style={{ ...tokenLabel, color: 'var(--ink)', marginBottom: '2px' }}>{name}</div>
      <div style={{ ...tokenLabel, fontSize: '10px' }}>{value}</div>
    </div>
  );
}
