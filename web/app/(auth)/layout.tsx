export default function AuthLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <main className="auth-shell">
      <div className="auth-card">
        <div className="auth-brand">
          folio<em>.e8e</em>
        </div>
        {children}
      </div>
    </main>
  );
}
