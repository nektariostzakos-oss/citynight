"use client";

import { useEditor } from "../../lib/editorClient";

/**
 * Floating gold pill that appears on hover when the admin is logged in.
 * Wrap a section like:
 *   <section className="relative ...">
 *     <EditPencil section="hero" />
 *     ...
 *   </section>
 */
export default function EditPencil({ section }: { section: string }) {
  const { isAdmin, openEditor } = useEditor();
  if (!isAdmin) return null;
  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        openEditor(section);
      }}
      className="atelier-edit-pencil"
      aria-label={`Edit ${section}`}
    >
      ✎ Edit
    </button>
  );
}
