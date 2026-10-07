// Stub: standalone build has no vendor-chat backend. Keeps AssistantChat's
// "Chat with seller" path compiling; wire a real chat backend later if needed.
import { useState } from "react";

export interface VendorChatTarget {
  id: string;
  name: string;
  vendorId: string;
  image?: string;
  price?: number;
}

export function useVendorChat() {
  const [showChat, setShowChat] = useState(false);
  const [openChats, setOpenChats] = useState<VendorChatTarget[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);

  const openChat = (target: VendorChatTarget) => {
    setOpenChats((prev) =>
      prev.some((c) => c.id === target.id) ? prev : [...prev, target],
    );
    setActiveChatId(target.id);
    setShowChat(true);
  };

  return { showChat, openChats, activeChatId, setActiveChatId, setOpenChats, setShowChat, openChat };
}
