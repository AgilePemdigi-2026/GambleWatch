import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// GET: Ambil daftar riwayat analisis untuk /my-analyses
export async function GET() {
  try {
    const { data, error } = await supabase
      .from("analysis_reports")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// POST: Simpan hasil analisis baru dari /form-gamblin-analysis
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      site_url,
      risk_level,
      report_status,
      hasil_analisis,
      url_pattern_analysis,
      visual_similarity,
      image_to_text_analysis,
      keyword_analysis,
      screenshots,
    } = body;

    const { data, error } = await supabase
      .from("analysis_reports")
      .insert([
        {
          site_url,
          risk_level: risk_level || "HIGH",
          report_status: report_status || "STATUS: PENDING",
          hasil_analisis,
          url_pattern_analysis,
          visual_similarity,
          image_to_text_analysis,
          keyword_analysis,
          screenshots,
        },
      ])
      .select();

    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}