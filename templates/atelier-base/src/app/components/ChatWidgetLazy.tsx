"use client";

import dynamic from "next/dynamic";

// Defer the chat widget: not part of the initial bundle. The floating
// button is small enough that a brief hydration lag is imperceptible.
const ChatWidget = dynamic(() => import("./ChatWidget"), {
  ssr: false,
  loading: () => null,
});

export default function ChatWidgetLazy() {
  return <ChatWidget />;
}
