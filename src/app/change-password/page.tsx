"use client";

import { Eye, EyeOff, KeyRound, Loader2 } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface MeResponse {
  success: boolean;
  data?: { mustChangePassword: boolean };
}

export default function ChangePasswordPage() {
  const router = useRouter();
  const [mustChange, setMustChange] = useState(true);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((response) => response.json() as Promise<MeResponse>)
      .then((result) => setMustChange(Boolean(result.data?.mustChangePassword)))
      .catch(() => undefined);
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (newPassword !== confirmPassword) {
      setError("รหัสผ่านใหม่ทั้งสองช่องไม่ตรงกัน");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      const response = await fetch("/api/auth/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const result = (await response.json()) as {
        success: boolean;
        error?: string;
      };
      if (!response.ok || !result.success) {
        throw new Error(result.error || "ไม่สามารถเปลี่ยนรหัสผ่านได้");
      }
      router.replace("/check-in");
      router.refresh();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "ไม่สามารถเปลี่ยนรหัสผ่านได้",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#F8FAFC] px-5 py-10">
      <section className="w-full max-w-[440px] rounded-[20px] border bg-white p-6 shadow-sm sm:p-8">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-[10px] border">
            <Image src="/logo.svg" alt="วิจิตรศิลป" width={34} height={34} />
          </div>
          <div>
            <p className="font-semibold">CAR SERVICE</p>
            <p className="text-sm text-muted-foreground">บัญชีพนักงาน</p>
          </div>
        </div>

        <div className="mt-8">
          <div className="flex size-11 items-center justify-center rounded-[10px] bg-blue-50 text-[#3F7DF4]">
            <KeyRound className="size-5" />
          </div>
          <h1 className="mt-4 text-2xl font-semibold">
            {mustChange ? "ตั้งรหัสผ่านใหม่" : "เปลี่ยนรหัสผ่าน"}
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {mustChange
              ? "เพื่อความปลอดภัย กรุณาเปลี่ยนรหัสเริ่มต้น 123456 ก่อนลงชื่อทำงาน"
              : "ตั้งรหัสผ่านที่คุณจำได้และไม่บอกให้ผู้อื่นทราบ"}
          </p>
        </div>

        <form className="mt-7 space-y-5" onSubmit={handleSubmit}>
          {!mustChange ? (
            <div className="space-y-2">
              <label htmlFor="current-password" className="font-medium">
                รหัสผ่านปัจจุบัน
              </label>
              <Input
                id="current-password"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                className="h-12 rounded-[10px]"
                required
              />
            </div>
          ) : null}

          <div className="space-y-2">
            <label htmlFor="new-password" className="font-medium">
              รหัสผ่านใหม่
            </label>
            <div className="relative">
              <Input
                id="new-password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                className="h-12 rounded-[10px] pr-12"
                minLength={6}
                autoFocus
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-muted-foreground"
                aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
              >
                {showPassword ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="confirm-password" className="font-medium">
              ยืนยันรหัสผ่านใหม่
            </label>
            <div className="relative">
              <Input
                id="confirm-password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="h-12 rounded-[10px] pr-12"
                minLength={6}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-muted-foreground"
                aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
              >
                {showPassword ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </button>
            </div>
          </div>

          {error ? (
            <p className="rounded-[10px] border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-main-red">
              {error}
            </p>
          ) : null}

          <Button
            type="submit"
            disabled={isSubmitting}
            className="h-12 w-full rounded-[10px] bg-[#3F7DF4] font-semibold hover:bg-[#326DE0]"
          >
            {isSubmitting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <KeyRound className="size-4" />
            )}
            {isSubmitting ? "กำลังบันทึก" : "บันทึกรหัสผ่านใหม่"}
          </Button>
        </form>
      </section>
    </main>
  );
}
