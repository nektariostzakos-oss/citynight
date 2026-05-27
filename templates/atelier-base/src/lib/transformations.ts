import { getAppRoot } from "@/lib/appRoot";
import { promises as fs } from "fs";
import path from "path";

const FILE = () => path.join(getAppRoot(), "data", "transformations.json");

export type Transformation = {
  id: string;
  title_en: string;
  title_el: string;
  caption_en: string;
  caption_el: string;
  before: string;
  after: string;
};

export async function listTransformations(): Promise<Transformation[]> {
  try {
    const raw = await fs.readFile(FILE(), "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Transformation[]) : [];
  } catch {
    return [];
  }
}
