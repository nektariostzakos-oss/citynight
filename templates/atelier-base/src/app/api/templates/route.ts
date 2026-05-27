import { getBaseRoot } from "@/lib/appRoot";
import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const DEMOS_DIR = () => path.join(getBaseRoot(), "demos");

export async function GET() {
  let ids: string[] = [];
  try {
    ids = await fs.readdir(DEMOS_DIR());
  } catch {
    return NextResponse.json({ templates: [] });
  }
  const templates = [];
  for (const id of ids) {
    try {
      const raw = await fs.readFile(path.join(DEMOS_DIR(), id, "meta.json"), "utf-8");
      templates.push(JSON.parse(raw));
    } catch {}
  }
  return NextResponse.json({ templates });
}
