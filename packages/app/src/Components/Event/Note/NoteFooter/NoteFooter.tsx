import { NostrLink, TaggedNostrEvent } from "@snort/system";
import { useEventReactions } from "@snort/system-react";
import React, { useMemo, useState } from "react";

import { FooterZapButton } from "@/Components/Event/Note/NoteFooter/FooterZapButton";
import { LikeButton } from "@/Components/Event/Note/NoteFooter/LikeButton";
import { PowIcon } from "@/Components/Event/Note/NoteFooter/PowIcon";
import { ReplyButton } from "@/Components/Event/Note/NoteFooter/ReplyButton";
import { RepostButton } from "@/Components/Event/Note/NoteFooter/RepostButton";
import ReactionsModal from "@/Components/Event/Note/ReactionsModal";
import { useReactionsView } from "@/Feed/WorkerRelayView";
import useLogin from "@/Hooks/useLogin";

export interface NoteFooterProps {
  replyCount?: number;
  ev: TaggedNostrEvent;
}

export default function NoteFooter(props: NoteFooterProps) {
  const { ev } = props;
  const link = useMemo(() => NostrLink.fromEvent(ev), [ev.id]);
  const ids = useMemo(() => [link], [link]);
  const [showReactions, setShowReactions] = useState(false);

  const related = useReactionsView(ids, false);
  const { reactions, zaps, reposts } = useEventReactions(link, related);
  const { positive } = reactions;

  const { preferences: prefs, readonly } = useLogin(s => ({
    preferences: s.appData.item.preferences,
    publicKey: s.publicKey,
    readonly: s.readonly,
  }));

  return (
    <div className="flex flex-row gap-4 overflow-hidden max-w-full h-6 items-center">
      <ReplyButton ev={ev} replyCount={props.replyCount} readonly={readonly} />
      {!readonly && <RepostButton ev={ev} reposts={reposts} />}
      {prefs.enableReactions && <LikeButton ev={ev} positiveReactions={positive} />}
      {CONFIG.showPowIcon && <PowIcon ev={ev} />}
      <FooterZapButton ev={ev} zaps={zaps} onClickZappers={() => setShowReactions(true)} />
      {showReactions && <ReactionsModal initialTab={1} onClose={() => setShowReactions(false)} event={ev} />}
    </div>
  );
}
