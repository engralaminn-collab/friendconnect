"use client";

import { IncomingCallDialog, type AcceptedCall } from "./IncomingCallDialog";
import { CallOverlay } from "./CallOverlay";
import { useCallUI } from "@/store/useCallUI";
import { useMessenger } from "@/store/useMessenger";

/**
 * Mounted once inside AuthProvider. Renders incoming-call rings on every page
 * and hosts the active call overlay, persisting a local call-history entry
 * with real (zeroed when no media flowed) statistics.
 */
export function GlobalCallLayer() {
  const active = useCallUI((s) => s.active);
  const close = useCallUI((s) => s.close);
  const addCall = useMessenger((s) => s.addCall);

  const handleAccept = (accepted: AcceptedCall) => {
    useCallUI.getState().start({
      engine: accepted.engine,
      kind: accepted.kind,
      contactName: accepted.contactName,
      contactHue: 226,
      conversationId: accepted.conversationId,
      direction: "incoming",
    });
  };

  return (
    <>
      <IncomingCallDialog onAccept={handleAccept} />
      {active && (
        <CallOverlay
          engine={active.engine}
          contactName={active.contactName}
          contactHue={active.contactHue}
          onClose={close}
          onEnded={(seconds) => {
            const quality = active.engine.current.quality;
            addCall({
              contactName: active.contactName,
              contactId: active.contactId,
              direction: active.direction,
              kind: active.kind,
              startedAt: new Date(Date.now() - seconds * 1000).toISOString(),
              durationSec: seconds,
              status: "completed",
              recording: false,
              quality,
            });
            close();
          }}
        />
      )}
    </>
  );
}
