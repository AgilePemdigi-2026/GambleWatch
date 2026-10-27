import AuthForm from "../components/AuthForm";

export default function SignInAdminPage() {
  return (
    <AuthForm
      mode="sign-in"
      title="Masuk sebagai Administrator"
      subtitle="Akses khusus petugas GAMBLEWATCH"
      identifierLabel="EMAIL"
      identifierPlaceholder="Masukkan Email Administrator"
    />
  );
}
