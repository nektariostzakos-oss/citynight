"use client";

import dynamic from "next/dynamic";

/**
 * Post-paint chrome for the tenant runtime.
 *
 * Everything in here is either invisible until a user interaction
 * (cart drawer, in-page editor) or scroll-triggered chrome the user
 * doesn't perceive at first paint (sticky book bar, page tracker). None
 * is part of the LCP element or the initial render path, so we defer
 * via `next/dynamic` with `ssr:false` to keep the initial route chunk
 * free of framer-motion, the editor surface, and analytics overhead.
 */
const CartSidebar = dynamic(() => import("./CartSidebar"), { ssr: false });
const EditorPanel = dynamic(() => import("./EditorPanel"), { ssr: false });
const StickyBookBar = dynamic(() => import("./StickyBookBar"), { ssr: false });
const PageTracker = dynamic(() => import("./PageTracker"), { ssr: false });

export default function LazyDemoChrome() {
  return (
    <>
      <EditorPanel />
      <CartSidebar />
      <StickyBookBar />
      <PageTracker />
    </>
  );
}
