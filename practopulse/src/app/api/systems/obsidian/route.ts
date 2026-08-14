import { NextResponse } from "next/server";
import { pushObsidianNote } from "@/lib/api";

export async function POST(req: Request) {
  const body = await req.json();
  const leads = body.leads || [];
  const paths = [];
  for (const lead of leads) {
    const r = await pushObsidianNote({
      lead,
      note: `# ${lead.clinicName}\n\n${lead.pitchHook || ""}\n\nStatus: ${lead.status}`,
    });
    if (r.ok) paths.push(r.data.path);
  }
  return NextResponse.json({
    paths,
    message: paths.length
      ? `Staged ${paths.length} Obsidian note(s)`
      : "No leads selected — nothing staged",
  });
}
