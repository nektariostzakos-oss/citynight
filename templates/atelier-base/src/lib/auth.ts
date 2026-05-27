import { cookies } from "next/headers";
import {
  ensureSeedAdmin,
  findUserByEmail,
  findUserById,
  signSession,
  verifyPassword,
  verifySession,
  type User,
} from "./users";

const COOKIE = "atelier_session";

export async function currentUser(): Promise<User | null> {
  await ensureSeedAdmin();
  const c = await cookies();
  const token = c.get(COOKIE)?.value;
  if (!token) return null;
  const userId = await verifySession(token);
  if (!userId) return null;
  return findUserById(userId);
}

export async function isAdmin(): Promise<boolean> {
  const u = await currentUser();
  return u?.role === "admin";
}

export async function isStaff(): Promise<boolean> {
  const u = await currentUser();
  return u?.role === "admin" || u?.role === "barber";
}

export async function signIn(
  email: string,
  password: string
): Promise<User | null> {
  const user = await findUserByEmail(email);
  if (!user) return null;
  if (!verifyPassword(password, user.passwordHash)) return null;
  const token = await signSession(user.id);
  const c = await cookies();
  c.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  return user;
}

export async function signOut(): Promise<void> {
  const c = await cookies();
  c.delete(COOKIE);
}
