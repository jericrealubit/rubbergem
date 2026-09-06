// Single source of truth for the three per-production-line login accounts.
// PressForm/BalesForm/BanburyForm each gate their live shift-config broadcast
// and final submit action on the matching account being logged in; app/page.tsx
// uses the same mapping to auto-reorder the burger-menu nav so whichever
// line's account is active shows up first.

export const LINE_ACCOUNTS = {
  press: "press@rubbergem.com",
  bales: "bales@rubbergem.com",
  banbury: "banbury@rubbergem.com",
} as const;

export type LineKey = keyof typeof LINE_ACCOUNTS;

export function activeLineFor(email: string | null | undefined): LineKey | null {
  return (
    (Object.keys(LINE_ACCOUNTS) as LineKey[]).find(
      (key) => LINE_ACCOUNTS[key] === email,
    ) ?? null
  );
}
