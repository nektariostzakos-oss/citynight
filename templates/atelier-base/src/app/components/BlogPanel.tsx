"use client";

import { useEffect, useState } from "react";
import { withBasePath } from "../../lib/basePath";
import ImagePicker from "./ImagePicker";

type Post = {
  id: string;
  slug: string;
  title_en: string;
  title_el: string;
  excerpt_en: string;
  excerpt_el: string;
  body_en: string;
  body_el: string;
  image: string;
  tags: string[];
  category: string;
  kind: "page" | "post";
  published: boolean;
  publishedAt: string;
  updatedAt: string;
};

type Draft = Omit<Post, "id" | "publishedAt" | "updatedAt">;

type Category = { id: string; name: string; slug: string; order: number };

const EMPTY: Draft = {
  slug: "",
  title_en: "",
  title_el: "",
  excerpt_en: "",
  excerpt_el: "",
  body_en: "",
  body_el: "",
  image: "",
  tags: [],
  category: "Grooming tips",
  kind: "post",
  published: true,
};

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export default function BlogPanel() {
  const [items, setItems] = useState<Post[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [filter, setFilter] = useState<string>("all");
  const [manageCats, setManageCats] = useState(false);
  const [newCat, setNewCat] = useState("");

  async function loadPosts() {
    const r = await fetch("/api/pages?kind=post");
    if (r.ok) setItems(((await r.json()).pages ?? []) as Post[]);
  }
  async function loadCats() {
    const r = await fetch("/api/blog-categories");
    if (r.ok) setCats(((await r.json()).categories ?? []) as Category[]);
  }
  async function load() {
    await Promise.all([loadPosts(), loadCats()]);
  }
  useEffect(() => { load(); }, []);

  async function addCategory() {
    if (!newCat.trim()) return;
    const r = await fetch("/api/blog-categories", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: newCat.trim() }),
    });
    if (r.ok) {
      setNewCat("");
      loadCats();
    }
  }
  async function removeCategory(id: string) {
    const cat = cats.find((c) => c.id === id);
    if (!cat) return;
    const inUse = items.filter((p) => p.category === cat.name).length;
    if (inUse > 0 && !confirm(`${inUse} post(s) use "${cat.name}". Delete the category anyway? (Posts keep the text but won't match the filter.)`)) return;
    await fetch(`/api/blog-categories?id=${id}`, { method: "DELETE" });
    loadCats();
  }

  async function save() {
    const payload = { ...draft, kind: "post" as const };
    if (editing) {
      await fetch("/api/pages", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: editing, ...payload }),
      });
    } else {
      await fetch("/api/pages", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
    }
    setEditing(null);
    setOpen(false);
    setDraft(EMPTY);
    load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this post?")) return;
    await fetch(`/api/pages?id=${id}`, { method: "DELETE" });
    load();
  }

  function startEdit(p: Post) {
    setEditing(p.id);
    setDraft({
      slug: p.slug,
      title_en: p.title_en,
      title_el: p.title_el,
      excerpt_en: p.excerpt_en,
      excerpt_el: p.excerpt_el,
      body_en: p.body_en,
      body_el: p.body_el,
      image: p.image,
      tags: p.tags,
      category: p.category || "Grooming tips",
      kind: "post",
      published: p.published,
    });
    setOpen(true);
  }

  function startCreate() {
    setEditing(null);
    setDraft({ ...EMPTY });
    setOpen(true);
  }

  const categoryNames = cats.map((c) => c.name);
  const categories = Array.from(new Set([...categoryNames, ...items.map((p) => p.category).filter(Boolean)]));
  const filtered = filter === "all" ? items : items.filter((p) => p.category === filter);

  if (open) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-serif text-2xl">{editing ? "Edit post" : "New post"}</h2>
          <button
            onClick={() => { setEditing(null); setOpen(false); setDraft(EMPTY); }}
            className="rounded-full border border-white/15 px-4 py-2 text-xs uppercase tracking-widest text-white/70"
          >
            Back
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <F label="Title (EN)" value={draft.title_en} onChange={(v) => setDraft({ ...draft, title_en: v, slug: draft.slug || slugify(v) })} />
          <F label="Title (EL)" value={draft.title_el} onChange={(v) => setDraft({ ...draft, title_el: v })} />
          <F label="Slug" value={draft.slug} onChange={(v) => setDraft({ ...draft, slug: slugify(v) })} />
          <div>
            <label className="mb-1 block text-[10px] uppercase tracking-widest text-white/65">Category</label>
            <input
              list="blog-categories"
              value={draft.category}
              onChange={(e) => setDraft({ ...draft, category: e.target.value })}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-white/40"
            />
            <datalist id="blog-categories">
              {categories.map((c) => <option key={c} value={c} />)}
            </datalist>
          </div>
          <F label="Excerpt (EN), ~150 chars" value={draft.excerpt_en} onChange={(v) => setDraft({ ...draft, excerpt_en: v })} textarea />
          <F label="Excerpt (EL)" value={draft.excerpt_el} onChange={(v) => setDraft({ ...draft, excerpt_el: v })} textarea />
          <F label="Body (EN): HTML or markdown" value={draft.body_en} onChange={(v) => setDraft({ ...draft, body_en: v })} textarea rows={10} />
          <F label="Body (EL)" value={draft.body_el} onChange={(v) => setDraft({ ...draft, body_el: v })} textarea rows={10} />
          <F
            label="Tags (comma separated)"
            value={draft.tags.join(", ")}
            onChange={(v) => setDraft({ ...draft, tags: v.split(",").map((t) => t.trim()).filter(Boolean) })}
          />
          <label className="flex items-center gap-2 pt-6">
            <input
              type="checkbox"
              checked={draft.published}
              onChange={(e) => setDraft({ ...draft, published: e.target.checked })}
            />
            <span className="text-sm">Published (show on site)</span>
          </label>
        </div>

        <div className="mt-4">
          <ImagePicker label="Cover image" preset="default" value={draft.image} onChange={(v) => setDraft({ ...draft, image: v })} />
        </div>

        <div className="mt-5 flex gap-3">
          <button onClick={save} disabled={!draft.title_en || !draft.slug} className="rounded-full bg-[#c9a961] px-6 py-2.5 text-xs font-semibold uppercase tracking-widest text-black disabled:opacity-40">
            Save
          </button>
          <button onClick={() => { setEditing(null); setOpen(false); setDraft(EMPTY); }} className="rounded-full border border-white/15 px-6 py-2.5 text-xs uppercase tracking-widest text-white/70">
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-serif text-2xl">Blog</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setManageCats(!manageCats)}
            className="rounded-full border border-white/15 px-4 py-2 text-[10px] uppercase tracking-widest text-white/80 hover:bg-white/10"
          >
            {manageCats ? "Done" : "Manage categories"}
          </button>
          <button
            onClick={startCreate}
            className="rounded-full bg-[#c9a961] px-5 py-2 text-xs font-semibold uppercase tracking-widest text-black"
          >
            + New post
          </button>
        </div>
      </div>

      {manageCats && (
        <div className="mb-4 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
          <div className="mb-3 flex gap-2">
            <input
              value={newCat}
              onChange={(e) => setNewCat(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addCategory()}
              placeholder="New category name"
              className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-white/40"
            />
            <button onClick={addCategory} className="rounded-full bg-[#c9a961] px-5 py-2 text-xs font-semibold uppercase tracking-widest text-black">
              Add
            </button>
          </div>
          <ul className="divide-y divide-white/10 border-y border-white/10">
            {cats.length === 0 ? (
              <li className="py-3 text-white/60">No categories.</li>
            ) : cats.map((c) => {
              const count = items.filter((p) => p.category === c.name).length;
              return (
                <li key={c.id} className="flex items-center justify-between py-2 text-sm">
                  <span>
                    {c.name} <span className="text-white/60">· /{c.slug} · {count} post{count === 1 ? "" : "s"}</span>
                  </span>
                  <button
                    onClick={() => removeCategory(c.id)}
                    className="rounded-full border border-red-400/40 px-3 py-1 text-[10px] uppercase tracking-widest text-red-300 hover:bg-red-500/10"
                  >
                    Delete
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-2">
        <button
          onClick={() => setFilter("all")}
          className={`rounded-full border px-3 py-1 text-[10px] uppercase tracking-widest ${filter === "all" ? "border-[#c9a961] bg-[#c9a961] text-black" : "border-white/15 text-white/70"}`}
        >
          All
        </button>
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setFilter(c)}
            className={`rounded-full border px-3 py-1 text-[10px] uppercase tracking-widest ${filter === c ? "border-[#c9a961] bg-[#c9a961] text-black" : "border-white/15 text-white/70"}`}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10">
        {filtered.length === 0 ? (
          <p className="p-6 text-center text-white/60">No posts in this category yet.</p>
        ) : (
          filtered.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center gap-3 border-b border-white/10 p-3 last:border-b-0">
              {p.image ? (
                <img src={withBasePath(p.image)} alt="" className="h-14 w-20 shrink-0 rounded-lg border border-white/10 object-cover" />
              ) : (
                <div className="h-14 w-20 shrink-0 rounded-lg border border-white/10 bg-white/[0.03]" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">
                  {p.title_en}
                  {!p.published && <span className="ml-2 text-xs text-amber-300">· draft</span>}
                </p>
                <p className="truncate text-xs text-white/50">
                  /{p.slug} · <span className="text-[#c9a961]">{p.category || "General"}</span> · {new Date(p.updatedAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => startEdit(p)} className="rounded-full border border-white/15 px-3 py-1 text-xs uppercase tracking-widest text-white/80 hover:bg-white/10">Edit</button>
                <button onClick={() => remove(p.id)} className="rounded-full border border-red-400/40 px-3 py-1 text-xs uppercase tracking-widest text-red-300 hover:bg-red-500/10">Delete</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function F({
  label,
  value,
  onChange,
  textarea,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  textarea?: boolean;
  rows?: number;
}) {
  return (
    <div>
      <label className="mb-1 block text-[10px] uppercase tracking-widest text-white/65">{label}</label>
      {textarea ? (
        <textarea
          rows={rows}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-white/40"
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-white/40"
        />
      )}
    </div>
  );
}
