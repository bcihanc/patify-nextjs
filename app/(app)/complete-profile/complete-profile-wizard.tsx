'use client';

import { useState } from 'react';
import { Step1Username } from './step1-username';
import { Step2AvatarBio } from './step2-avatar-bio';

// 2-step gate wizard (spec §4.2). A user who already has a username enters
// directly at Step 2 (mobile parity) — Step 1 is not something they can
// navigate back to since it's not theirs to do.
export function CompleteProfileWizard({
  userId,
  hasUsername,
}: {
  userId: string;
  hasUsername: boolean;
}) {
  const [step, setStep] = useState<1 | 2>(hasUsername ? 2 : 1);

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        {step === 1 ? (
          <Step1Username userId={userId} onDone={() => setStep(2)} />
        ) : (
          <Step2AvatarBio userId={userId} />
        )}
      </div>
    </div>
  );
}
