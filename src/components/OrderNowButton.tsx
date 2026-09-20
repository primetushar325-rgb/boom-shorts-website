"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";

/**
 * The "Order Now" action on a package card.
 *
 * The package ID is already known when the card renders, so this is a plain
 * client-side route navigation — no fetch, no database round-trip, nothing
 * between the tap and the checkout page. `loading.tsx` on /checkout/[id]
 * paints instantly while the server render streams in.
 *
 * What the tap feedback does:
 *  - the very first touch flips the button to "Opening Checkout…" immediately
 *    (synchronously in the click handler, before any render), so on a slow
 *    phone the user always sees that the tap registered;
 *  - the Link is never disabled — a second tap simply repeats the same
 *    navigation, which the router de-duplicates;
 *  - if the navigation never happens at all (e.g. the tab was suspended),
 *    a safety timer restores the normal label so the button can never get
 *    stuck in its "opening" state.
 */
export default function OrderNowButton({
  href,
  label,
  className,
}: {
  href: string;
  label: string;
  className?: string;
}) {
  const [opening, setOpening] = useState(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimer.current) clearTimeout(resetTimer.current);
    };
  }, []);

  function handleClick() {
    setOpening(true);
    if (resetTimer.current) clearTimeout(resetTimer.current);
    // If we are still on this page a few seconds later the navigation did not
    // take — give the button back to the customer instead of leaving it in a
    // half state.
    resetTimer.current = setTimeout(() => setOpening(false), 6000);
  }

  return (
    <Link
      href={href}
      onClick={handleClick}
      aria-busy={opening}
      className={className}
      style={opening ? { pointerEvents: "auto" } : undefined}
    >
      {opening ? (
        <>
          <Loader2 size={15} className="animate-spin" aria-hidden />
          Opening Checkout…
        </>
      ) : (
        label
      )}
    </Link>
  );
}
