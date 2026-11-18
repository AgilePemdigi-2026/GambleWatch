import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const ALLOWED_KATEGORI = ["Laporan Bug", "Saran Fitur", "Laporan Data"];

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      user_id,
      nama_pengirim,
      is_anonim,
      email,
      kategori,
      pesan_masukan,
    } = body;

    if (!pesan_masukan || pesan_masukan.trim().length === 0) {
      return NextResponse.json(
        { error: "Pesan masukan tidak boleh kosong." },
        { status: 400 }
      );
    }

    if (pesan_masukan.trim().length > 500) {
      return NextResponse.json(
        { error: "Pesan masukan maksimal 500 karakter." },
        { status: 400 }
      );
    }

    if (!kategori || !ALLOWED_KATEGORI.includes(kategori)) {
      return NextResponse.json(
        {
          error:
            "Kategori feedback wajib dipilih (Laporan Bug, Saran Fitur, atau Laporan Data).",
        },
        { status: 400 }
      );
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "Format alamat email tidak valid." },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    const finalNama =
      is_anonim || !nama_pengirim?.trim() ? "Anonim" : nama_pengirim.trim();

    // Tanpa .select().single() agar tidak memicu pengecekan policy SELECT untuk publik
    const { error } = await supabase.from("feedback").insert([
      {
        user_id: user_id || null,
        nama_pengirim: finalNama,
        email: is_anonim ? null : email?.trim() || null,
        kategori,
        pesan_masukan: pesan_masukan.trim(),
        status: "Perlu Tindakan",
      },
    ]);

    if (error) {
      console.error("Supabase insert error:", error);
      return NextResponse.json(
        { error: "Gagal menyimpan feedback: " + error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        message: "Terima kasih, masukan Anda berhasil dikirim!",
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("Server error:", err);
    return NextResponse.json(
      { error: "Terjadi kesalahan pada server." },
      { status: 500 }
    );
  }
}