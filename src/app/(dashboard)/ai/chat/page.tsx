'use client';

import { useSyncExternalStore, useState } from 'react';
import { SquarePen } from 'lucide-react';
import {
  ChatFullView,
  clearChat,
  getChatState,
  subscribeChat,
} from '../../../../widgets/ai-chat';
import { ConfirmDialog } from '../../../../components/ConfirmDialog';

export default function AIChatPage() {
  const state = useSyncExternalStore(subscribeChat, getChatState, getChatState);
  const [confirmClear, setConfirmClear] = useState(false);

  return (
    <>
    <div className="mx-auto flex h-full min-h-0 w-full max-w-[1100px] flex-col">
      <div className="flex items-center justify-end gap-2 px-1 pb-1">
        {state.messages.length > 0 && (
          <button
            type="button"
            onClick={() => setConfirmClear(true)}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[12px] font-medium text-text-secondary transition-colors hover:bg-black/5 hover:text-text-primary"
          >
            <SquarePen size={14} />
            New chat
          </button>
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <ChatFullView />
      </div>
    </div>

      <ConfirmDialog
        open={confirmClear}
        title="Clear this conversation?"
        tone="danger"
        confirmLabel="Clear conversation"
        message="This removes the current thread. New messages will start from scratch."
        onConfirm={() => {
          clearChat();
          setConfirmClear(false);
        }}
        onClose={() => setConfirmClear(false)}
      />
    </>
  );
}
