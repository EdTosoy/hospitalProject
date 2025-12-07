"use client";

import { FormEvent, useState } from "react";

import { useRouter } from "next/navigation";
import { useLogin } from "@/hooks/use-login";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const router = useRouter();
  const login = useLogin();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    login.mutate(
      {
        email,
        password,
      },
      {
        onSuccess: () => {
          router.push("/dashboard");
        },
      },
    );
  };
  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md p-8 space-y-4">
      <h1 className="text-3xl font-bold text-center">Pulse Login</h1>

      {login.isError && (
        <p className="text-red-500 text-center">{login.error.message}</p>
      )}

      <input
        type="email"
        placeholder="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full p-3 border rounded-lg"
      />
      <input
        type="password"
        placeholder="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full p-3 border rounded-lg"
      />
      <button
        disabled={login.isPending}
        className="w-full p-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50"
      >
        {login.isPending ? "Logging in..." : "Login"}
      </button>
    </form>
  );
}
