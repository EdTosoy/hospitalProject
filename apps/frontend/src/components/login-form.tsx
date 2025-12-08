"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { useRouter } from "next/navigation";
import { useLogin } from "@/hooks/use-login";
import { LoginInput, loginSchema } from "@/lib/validations/auth";
import Link from "next/link";

export default function LoginForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  const router = useRouter();
  const login = useLogin();

  const onSubmit = (data: LoginInput) => {
    login.mutate(data, {
      onSuccess: () => {
        router.push("/dashboard");
      },
    });
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="w-full max-w-md p-8 space-y-4"
    >
      <h1 className="text-3xl font-bold text-center">Pulse Login</h1>

      {login.isError && (
        <p className="text-red-500 text-center">{login.error.message}</p>
      )}

      <div>
        <input
          type="email"
          placeholder="email"
          {...register("email")}
          className="w-full p-3 border rounded-lg"
        />
        {errors.email && (
          <p className="text-red-500 text-sm mt-1">{errors.email?.message}</p>
        )}
      </div>
      <div>
        <input
          type="password"
          placeholder="password"
          {...register("password")}
          className="w-full p-3 border rounded-lg"
        />
        {errors.password && (
          <p className="text-red-500 text-sm mt-1">
            {errors.password?.message}
          </p>
        )}
      </div>
      <button
        type="submit"
        disabled={login.isPending}
        className="w-full p-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50"
      >
        {login.isPending ? "Logging in..." : "Login"}
      </button>
      <p className="text-center text-sm text-muted-foreground">
        Don't have an account?
        <Link href="/register" className="text-primary hover:underline">
          {" "}
          Register
        </Link>
      </p>
    </form>
  );
}
