import LoginForm from "@/components/login-form";

type Props = {};

export default function LoginPage({}: Props) {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <LoginForm />
    </main>
  );
}
