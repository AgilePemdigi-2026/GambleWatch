import Link from "next/link";
import AuthForm from "../components/AuthForm";

export default function SignUpPage() {
  return (
    <AuthForm
      mode="sign-up"
      title="Buat Akun"
      subtitle="Daftar untuk mulai menganalisis dan melaporkan situs judi online"
      footer={
        <>
          Sudah punya akun?{" "}
          <Link href="/sign-in/sign-in-masyarakat" className="underline">
            Masuk di sini
          </Link>
        </>
      }
    />
  );
}