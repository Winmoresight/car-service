"use client";

import { Loader2, LockKeyhole, LogIn } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { outfit } from "@/components/fonts/fonts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface LoginResponse {
  success: boolean;
  error?: string;
}

function getNextPath() {
  if (typeof window === "undefined") {
    return "/";
  }

  const nextPath = new URLSearchParams(window.location.search).get("next");

  return nextPath?.startsWith("/") && !nextPath.startsWith("//")
    ? nextPath
    : "/";
}

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!username.trim() || !password.trim()) {
      setErrorMessage("กรุณากรอก username และ password");
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          password,
        }),
      });
      const result = (await response.json()) as LoginResponse;

      if (!response.ok || !result.success) {
        throw new Error(result.error || "เข้าสู่ระบบไม่สำเร็จ");
      }

      router.replace(getNextPath());
      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "เข้าสู่ระบบไม่สำเร็จ",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-[420px] overflow-hidden rounded-[8px] border bg-card shadow-sm">
        <div className="border-b bg-[#FCFCFC] px-6 py-6">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-[8px] border bg-white">
              <Image src="/logo.svg" alt="logo" width={42} height={42} />
            </div>
            <div>
              <h1
                className={cn(
                  outfit.className,
                  "text-2xl font-bold text-primary",
                )}
              >
                CAR SERVICE
              </h1>
              <p className="mt-1 text-sm font-semibold text-muted-foreground">
                เข้าสู่ระบบก่อนใช้งาน
              </p>
            </div>
          </div>
        </div>

        <form className="space-y-4 px-6 py-6" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label
              htmlFor="login-username"
              className="block text-sm font-bold text-card-foreground"
            >
              Username
            </label>
            <Input
              id="login-username"
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="h-11 rounded-[8px] font-semibold"
              placeholder="กรอก username"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="login-password"
              className="block text-sm font-bold text-card-foreground"
            >
              Password
            </label>
            <Input
              id="login-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="h-11 rounded-[8px] font-semibold"
              placeholder="กรอก password"
            />
          </div>

          {errorMessage ? (
            <div className="flex items-start gap-2 rounded-[8px] border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-main-red">
              <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          ) : null}

          <Button
            type="submit"
            className="h-11 w-full rounded-[8px] font-bold"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <LogIn className="h-4 w-4" />
            )}
            เข้าสู่ระบบ
          </Button>
        </form>
      </div>
    </div>
  );
}
