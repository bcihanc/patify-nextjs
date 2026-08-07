'use client';

export default function AppError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div style={{ display: 'flex', minHeight: '60vh', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700 }}>Bir şeyler ters gitti</h2>
      <button onClick={() => reset()} className="rounded-md border px-4 py-2">
        Tekrar dene
      </button>
    </div>
  );
}
