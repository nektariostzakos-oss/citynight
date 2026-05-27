// Phase J.4 — venue sub-routes killed alongside the venue page itself.
import { notFound } from 'next/navigation';
export default async function LegacyAbout404() { notFound(); }
