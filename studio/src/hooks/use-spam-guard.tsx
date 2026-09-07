'use client';

import { useCallback, useRef } from 'react';

/**
 * Two cheap filters that cost a real person nothing.
 *
 * **A honeypot.** A field that is invisible and unreachable to a person — off
 * screen, not tabbable, hidden from assistive technology, autocomplete off — but
 * plainly present in the DOM. A scripted signup fills every input it finds; a
 * human cannot fill this one. Anything in it is a bot.
 *
 * **A minimum time.** Nobody completes a multi-step signup in two seconds. A
 * submission that fast came from a script, whatever else it looks like.
 *
 * Neither sets a cookie, calls a third party, sends anything to Google, or asks
 * the visitor to identify traffic lights — so neither adds a line to the cookie
 * policy or a new processor to the privacy policy. That is the whole reason to
 * start here rather than with a CAPTCHA.
 *
 * This is a first line, not a wall. A determined attacker gets past both. The
 * stronger step is Firebase App Check with reCAPTCHA Enterprise, which does
 * bring Google into the request path and is worth turning on when there is
 * abuse worth stopping — see RISKS.md.
 */
const MINIMUM_FILL_MS = 2500;

export function useSpamGuard() {
    const mountedAt = useRef(Date.now());
    const honeypot = useRef<HTMLInputElement>(null);

    /** True when the submission looks human. */
    const looksHuman = useCallback(() => {
        if (honeypot.current?.value) return false;
        return Date.now() - mountedAt.current >= MINIMUM_FILL_MS;
    }, []);

    /**
     * Rendered inside the form. `aria-hidden` plus `tabIndex={-1}` keeps it away
     * from screen readers and the tab order; the off-screen position keeps it
     * out of sight without `display:none`, which some bots skip.
     */
    const HoneypotField = useCallback(
        () => (
            <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px', top: 0, height: 0, overflow: 'hidden' }}>
                <label htmlFor="company-website">Company website</label>
                <input
                    ref={honeypot}
                    id="company-website"
                    name="company-website"
                    type="text"
                    tabIndex={-1}
                    autoComplete="off"
                    defaultValue=""
                />
            </div>
        ),
        [],
    );

    return { looksHuman, HoneypotField };
}
