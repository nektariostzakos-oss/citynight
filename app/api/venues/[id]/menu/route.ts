import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth/session';
import { requireSameOrigin } from '@/lib/csrf';
import { replaceOwnerMenu, type MenuInput } from '@/lib/owner-minisite';
import { db } from '@/db';

// PATCH /api/venues/[id]/menu — full-replace owner menu (Featured tier).
// Body shape:
//   { sections: [{ id?, name, description?, items: [{ id?, name, description?,
//                  price?, isPopular?, isVegetarian?, isVegan?, isGlutenFree? }] }] }
// Stable ids (when provided) keep existing rows; missing ones get new uuids.
// Anything not in the new payload is deleted in the same transaction.

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const csrf = requireSameOrigin(req); if (csrf) return csrf;
  const user = await requireUser();
  const { id } = await params;
  let body: MenuInput;
  try { body = (await req.json()) as MenuInput; } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  try {
    replaceOwnerMenu(id, user.id, body);
    revalidateVenueSubpaths(id, ['', '/menu']);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Response) return err;
    throw err;
  }
}

function revalidateVenueSubpaths(id: string, subpaths: string[]) {
  const row = db.$client.prepare(`
    SELECT v.slug, c.slug AS city, COALESCE(a.slug, cat.slug) AS bucket
      FROM venues v
      JOIN cities c ON c.id = v.city_id
      LEFT JOIN areas a ON a.id = v.area_id
      LEFT JOIN categories cat ON cat.id = v.category_id
     WHERE v.id = ?
  `).get(id) as { slug: string | null; city: string; bucket: string | null } | undefined;
  if (!row?.slug || !row.bucket) return;
  for (const l of ['en', 'el', 'de', 'fr', 'it']) {
    for (const sub of subpaths) {
      revalidatePath(`/${l}/greece/${row.city}/${row.bucket}/${row.slug}${sub}`);
    }
  }
}
