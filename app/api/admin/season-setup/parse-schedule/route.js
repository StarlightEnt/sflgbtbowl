import { requireAdminApi } from "@/lib/requireAdminApi";
import { parseSchedulePDF } from "@/lib/pdf/parseSchedule";

// This route, not the page it's used from, is the real security
// boundary — a hidden page is never enough on its own.
export async function POST(req) {
  const { forbidden } = await requireAdminApi();
  if (forbidden) return forbidden;

  const formData = await req.formData();
  const file = formData.get("file");
  if (!file || typeof file === "string") {
    return Response.json({ error: "Missing file" }, { status: 400 });
  }

  const pdfParse = (await import("pdf-parse")).default;
  const buffer = Buffer.from(await file.arrayBuffer());

  let text;
  try {
    const data = await pdfParse(buffer);
    text = data.text;
  } catch {
    return Response.json({ error: "Could not read PDF" }, { status: 400 });
  }

  const weeks = parseSchedulePDF(text);
  if (weeks.length === 0) {
    return Response.json(
      { error: "Could not find any weeks — is this a Schedule PDF?" },
      { status: 400 }
    );
  }

  return Response.json({ weeks, counts: { weeks: weeks.length }, fileName: file.name });
}
