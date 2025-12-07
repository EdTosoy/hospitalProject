"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { useRouter } from "next/navigation";
import { registerSchema, RegisterInput } from "@/lib/validations/auth";
import { useRegister } from "@/hooks/use-register";
import Link from "next/link";

export default function RegisterForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
  });

  const router = useRouter();
  const registerUser = useRegister();

  const onSubmit = (data: RegisterInput) => {
    const { confirmPassword, ...registerData } = data;
    registerUser.mutate(registerData, {
      onSuccess: () => {
        router.push("/login");
      },
    });
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="w-full max-w-md p-8 space-y-4"
    >
      <h1 className="text-3xl font-bold text-center">Pulse Register</h1>

      {registerUser.isError && (
        <p className="text-red-500 text-center">{registerUser.error.message}</p>
      )}

      <div>
        <input
          type="text"
          placeholder="name"
          {...register("name")}
          className="w-full p-3 border rounded-lg"
        />
        {errors.name && (
          <p className="text-red-500 text-sm mt-1">{errors.name?.message}</p>
        )}
      </div>

      <div>
        <input
          type="email"
          placeholder="email"
          {...register("email")}
          className="w-full p-3 border rounded-lg"
        />
        {errors.email && (
          <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
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
          <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>
        )}
      </div>
      <div>
        <input
          type="password"
          placeholder="confirmPassword"
          {...register("confirmPassword")}
          className="w-full p-3 border rounded-lg"
        />
        {errors.confirmPassword && (
          <p className="text-red-500 text-sm mt-1">
            {errors.confirmPassword.message}
          </p>
        )}
      </div>
      <button
        type="submit"
        disabled={registerUser.isPending}
        className="w-full p-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50"
      >
        {registerUser.isPending ? "Creating account..." : "Register"}
      </button>
      <p className="text-center text-sm text-muted-foreground">
        Already have an account?
        <Link href="/login" className="text-primary hover:underline">
          Login
        </Link>
      </p>
    </form>
  );
}
