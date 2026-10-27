import AuthForm from "../components/AuthForm";

export default function SignInMasyarakatPage() {
  return (
    <AuthForm
      mode="sign-in"
      title="Masuk sebagai Masyarakat"
      subtitle="Masuk untuk menganalisis dan melaporkan situs mencurigakan"
      footer={
        <>
          Belum punya akun?{" "}
          <a href="/sign-up" className="underline">
            Daftar di sini
          </a>
        </>
      }
    />
  );
}
