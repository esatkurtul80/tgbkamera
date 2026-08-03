import { NextRequest, NextResponse } from "next/server";

const IZINLI_HOSTLER = ["firebasestorage.googleapis.com", "storage.googleapis.com"];

/**
 * Firebase Storage görsellerini aynı origin üzerinden servis eder — PDF üretiminde
 * html2canvas'ın görselleri canvas'a çizebilmesi için CORS engelini aşar.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "url parametresi gerekli" }, { status: 400 });
  }

  let hedef: URL;
  try {
    hedef = new URL(url);
  } catch {
    return NextResponse.json({ error: "geçersiz url" }, { status: 400 });
  }

  if (!IZINLI_HOSTLER.includes(hedef.hostname)) {
    return NextResponse.json({ error: "izin verilmeyen kaynak" }, { status: 403 });
  }

  const yanit = await fetch(hedef.toString());
  if (!yanit.ok) {
    return NextResponse.json({ error: "görsel alınamadı" }, { status: yanit.status });
  }

  const buffer = Buffer.from(await yanit.arrayBuffer());
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": yanit.headers.get("content-type") ?? "image/jpeg",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
