export default function ComingSoon({ title }: { title: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f8f5ef] p-6 text-[#482b19]">
      <section className="w-full max-w-md rounded-3xl bg-[#f5efe5] p-8 text-center shadow-sm">
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="mt-3 text-sm text-[#786b62]">
          Halaman ini sedang dalam pengembangan.
        </p>
        <a
          href="/"
          className="mt-6 inline-block rounded-full bg-[#492b19] px-6 py-3 text-sm font-bold text-white"
        >
          Kembali ke Beranda
        </a>
      </section>
    </main>
  );
}
