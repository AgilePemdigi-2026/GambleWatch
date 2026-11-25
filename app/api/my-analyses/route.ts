import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {}
          },
        },
      }
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized", data: [] },
        { status: 401 }
      );
    }

    const { data, error } = await supabase
      .from("laporan_analisis")
      .select("*")
      .eq("user_id", user.id)
      .neq("status", "DRAFT")
      .order("created_at", { ascending: false });

    if (error) throw error;

    const mappedData = (data || []).map((row: any) => ({
      id: String(row.id),
      created_at: row.created_at,
      site_url: row.url_situs,
      risk_level: row.tingkat_risiko || "LOW",
      report_status: `STATUS: ${row.status || "SUBMITTED"}`,
      hasil_analisis:
        typeof row.skor_probabilitas === "number"
          ? `${row.tingkat_risiko} (${Math.round(row.skor_probabilitas)}% Probability)`
          : row.tingkat_risiko || "-",
      url_pattern_analysis: row.url_pattern_analysis || "-",
      visual_similarity: row.visual_similarity || "00% Match",
      image_to_text_analysis: row.ocr_flagged ? "OCR Flagged" : "Clean / Clear",
      keyword_analysis: row.keywords_found || "-",
      screenshots: row.bukti_screenshot ? [row.bukti_screenshot] : [],
    }));

    return NextResponse.json({ success: true, data: mappedData });
  } catch (error: any) {
    console.error("Error GET /api/my-analyses:", error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}