// Stub: standalone build has no vendor-chat backend. Renders a minimal panel so
// "Chat with seller" isn't dead — replace with a real chat implementation later.
import type { VendorChatTarget } from "@/hooks/useVendorChat";

interface Props {
  openChats: VendorChatTarget[];
  activeChatId: string | null;
  setActiveChatId: (id: string) => void;
  setOpenChats: (updater: (prev: VendorChatTarget[]) => VendorChatTarget[]) => void;
  setShowChat: (show: boolean) => void;
}

const ChatManager = ({ openChats, activeChatId, setOpenChats, setShowChat }: Props) => {
  const active = openChats.find((c) => c.id === activeChatId) ?? openChats[0];
  if (!active) return null;
  return (
    <div className="fixed bottom-4 end-4 z-[9998] w-80 rounded-[8px] border border-border bg-card shadow-xl">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="truncate text-[13px] font-medium">{active.name}</span>
        <button
          type="button"
          onClick={() => {
            setOpenChats((prev) => prev.filter((c) => c.id !== active.id));
            setShowChat(false);
          }}
          className="text-muted-foreground hover:text-foreground"
          aria-label="Close"
        >
          ✕
        </button>
      </div>
      <div className="p-4 text-[13px] text-muted-foreground">
        Vendor chat is not connected in this standalone build.
      </div>
    </div>
  );
};

export default ChatManager;
