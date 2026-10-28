"use client";

import {
  Check,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  LogIn,
  ShieldCheck,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { outfit } from "@/components/fonts/fonts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface LoginResponse {
  success: boolean;
  data?: { canManage: boolean; mustChangePassword: boolean };
  error?: string;
}

function getNextPath() {
  if (typeof window === "undefined") return "/";
  const nextPath = new URLSearchParams(window.location.search).get("next");
  return nextPath?.startsWith("/") && !nextPath.startsWith("//")
    ? nextPath
    : "/";
}

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!username.trim() || !password.trim()) {
      setErrorMessage("กรุณากรอกชื่อผู้ใช้งานหรือเบอร์โทร และรหัสผ่าน");
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const result = (await response.json()) as LoginResponse;
      if (!response.ok || !result.success) {
        throw new Error(result.error || "เข้าสู่ระบบไม่สำเร็จ");
      }
      router.replace(
        result.data?.mustChangePassword
          ? "/change-password"
          : result.data?.canManage
            ? getNextPath()
            : "/check-in",
      );
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
    <div className="flex min-h-dvh bg-[#225477]">
      <div className="grid min-h-dvh w-full overflow-hidden bg-[#F8FAFC] lg:grid-cols-[1.05fr_0.95fr]">
        <section className="relative hidden overflow-hidden bg-[#3F7DF4] p-8 text-white lg:flex lg:flex-col">
          <div className="flex items-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-[10px] bg-white">
              <Image src="/logo.svg" alt="วิจิตรศิลป" width={38} height={38} />
            </div>
            <div>
              <div className={cn(outfit.className, "text-xl font-semibold")}>
                CAR SERVICE
              </div>
              <p className="text-sm text-white/75">วิจิตรศิลปปักธงชัย</p>
            </div>
          </div>

          <div className="relative mt-10 flex-1">
            <div className="absolute inset-x-0 top-4 overflow-hidden rounded-[18px] border-8 border-white bg-white">
              <div className="relative aspect-[16/9] overflow-hidden rounded-[10px]">
                <Image
                  src="/opengraph-image.png"
                  alt="หน้าร้านวิจิตรศิลปปักธงชัย"
                  fill
                  priority
                  sizes="520px"
                  className="object-cover"
                />
              </div>
              <div className="grid grid-cols-3 gap-2 py-3 text-[#245070]">
                {["ลงเวลางาน", "ข้อมูลครบ", "ใช้งานง่าย"].map((label) => (
                  <div
                    key={label}
                    className="flex items-center justify-center gap-1.5 rounded-[8px] bg-[#EFF5FF] px-2 py-2 text-sm font-medium"
                  >
                    <Check className="size-3.5 text-[#3F7DF4]" />
                    {label}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="px-5 pb-3 text-center">
            <h2 className="text-3xl font-semibold">จัดการงานได้ง่ายกว่าเดิม</h2>
            <p className="mx-auto mt-3 max-w-md leading-7 text-white/80">
              เข้าสู่ระบบเดียวสำหรับดูข้อมูลหน้าร้าน และลงเวลาทำงานประจำวัน
            </p>
            <div className="mx-auto mt-6 h-1.5 w-10 rounded-full bg-white" />
          </div>
        </section>

        <section className="flex min-w-0 flex-col bg-white">
          <div className="flex flex-1 items-center justify-center px-6 py-10 sm:px-10 lg:px-16">
            <div className="w-full max-w-[410px]">
              <div className="hidden items-center gap-3 lg:flex">
                <div className="flex size-11 items-center justify-center rounded-[10px] border bg-white">
                  <Image src="/logo.svg" alt="วิจิตรศิลป" width={34} height={34} />
                </div>
                <div>
                  <div
                    className={cn(
                      outfit.className,
                      "text-lg font-semibold text-primary",
                    )}
                  >
                    CAR SERVICE
                  </div>
                  <p className="text-sm text-muted-foreground">วิจิตรศิลปปักธงชัย</p>
                </div>
              </div>

              <div className="lg:mt-12">
                <h1 className="text-3xl font-semibold text-card-foreground sm:text-4xl">
                  ยินดีต้อนรับ 👋
                </h1>
                <p className="mt-2 text-muted-foreground">
                  เข้าสู่ระบบเพื่อเริ่มใช้งาน
                </p>
              </div>

              <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <label
                    htmlFor="login-username"
                    className="block font-medium text-card-foreground"
                  >
                    ชื่อผู้ใช้งานหรือเบอร์โทร
                  </label>
                  <Input
                    id="login-username"
                    autoComplete="username"
                    autoCapitalize="none"
                    spellCheck={false}
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    className="h-12 rounded-full bg-[#F8FAFC] px-5 font-medium"
                    placeholder="กรอกชื่อผู้ใช้งานหรือเบอร์โทร"
                    autoFocus
                  />
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="login-password"
                    className="block font-medium text-card-foreground"
                  >
                    รหัสผ่าน
                  </label>
                  <div className="relative">
                    <Input
                      id="login-password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      className="h-12 rounded-full bg-[#F8FAFC] px-5 pr-12 font-medium"
                      placeholder="กรอกรหัสผ่าน"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((visible) => !visible)}
                      aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                      className="absolute inset-y-0 right-1 flex w-11 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {showPassword ? (
                        <EyeOff className="size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                    </button>
                  </div>
                </div>

                {errorMessage ? (
                  <div className="flex items-start gap-2 rounded-[12px] border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-main-red">
                    <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                ) : null}

                <Button
                  type="submit"
                  className={cn(
                    "relative h-12 w-full overflow-hidden rounded-full border-[#3F7DF4] bg-[#3F7DF4] font-semibold hover:bg-[#326DE0]",
                    isSubmitting && "opacity-75",
                  )}
                  disabled={isSubmitting}
                  aria-busy={isSubmitting}
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" />
                  ) : (
                    <LogIn className="h-4 w-4" />
                  )}
                  {isSubmitting ? "กำลังเข้าสู่ระบบ" : "เข้าสู่ระบบ"}
                </Button>
              </form>

              <div className="mt-7 flex items-start gap-2 border-t pt-5 text-sm text-muted-foreground">
                <ShieldCheck className="mt-0.5 size-4 shrink-0" />
                <p>ระบบจะจดจำการเข้าสู่ระบบไว้ 30 วันบนอุปกรณ์นี้</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
