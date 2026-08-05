'use client';

import { useState } from 'react';
import { deleteAccountAction } from '@/app/actions';
import { SubmitButton } from '@/components/submit-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// Mobile parity: DeleteAccountPage (lib/features/user_pages/delete_account_page.dart)
// keeps the destructive button locked until the user types a confirm phrase
// verbatim. Web reuses that idea with its own phrase (per brief) — an exact,
// case-sensitive match, not the mobile trim+lowercase comparison, since this
// is a "did you mean it" UX gate, not a security boundary (deleteAccountAction
// re-checks the current password server-side for email/password accounts).
const CONFIRM_PHRASE = 'HESABIMI SİL';

export function DeleteAccountForm({ isEmailProvider }: { isEmailProvider: boolean }) {
  const [typed, setTyped] = useState('');
  const matched = typed === CONFIRM_PHRASE;

  return (
    <form className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="confirmPhrase">
          Devam etmek için <span className="font-semibold">{CONFIRM_PHRASE}</span> yazın
        </Label>
        <Input
          id="confirmPhrase"
          name="confirmPhrase"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
        />
      </div>

      {isEmailProvider && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">Mevcut şifre</Label>
          <Input id="password" name="password" type="password" required />
        </div>
      )}

      <SubmitButton
        formAction={deleteAccountAction}
        pendingText="Siliniyor..."
        disabled={!matched}
        variant="destructive"
      >
        Hesabımı kalıcı olarak sil
      </SubmitButton>
    </form>
  );
}
