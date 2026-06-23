// User-facing Kroger connect prompt removed — pricing is automatic via ZIP.
// Stub keeps existing imports compiling.
interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onContinueWithout: () => void;
  redirectAfter?: string;
}
export function KrogerRequiredDialog(_props: Props) {
  return null;
}
