import { RelaySettings, SystemInterface } from "@snort/system";
import { useEffect } from "react";

import useEventPublisher from "./useEventPublisher";
import useLogin from "./useLogin";

export function useLoginRelays() {
  const { relays } = useLogin();
  const { system } = useEventPublisher();

  useEffect(() => {
    if (relays) {
      updateRelayConnections(system, relays.item).catch(console.error);
    }
  }, [relays]);
}

export async function updateRelayConnections(system: SystemInterface, relays: Record<string, RelaySettings>) {
  if (SINGLE_RELAY) {
    system.ConnectToRelay(SINGLE_RELAY, { read: true, write: true });
  } else {
    for (const [k, v] of Object.entries(relays)) {
      // note: don't awit this, causes race condition with sending requests to relays
      system.ConnectToRelay(k, v);
    }
    for (const v of system.Sockets) {
      if (!relays[v.address] && !v.ephemeral) {
        system.DisconnectRelay(v.address);
      }
    }
  }
}
