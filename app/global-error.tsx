'use client';

// Kök layout'ta bile patlarsa devreye girer → kendi <html>/<body>'sini içerir.
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="tr">
      <body style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, fontFamily: 'sans-serif' }}>
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>Bir şeyler ters gitti</h1>
        <button onClick={() => reset()} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #ccc' }}>
          Tekrar dene
        </button>
      </body>
    </html>
  );
}
