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
          <a href="/sign-in" className="underline">
            Masuk di sini
          </a>
        </>
      }
    />
  );
}
