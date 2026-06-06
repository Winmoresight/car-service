"use client";

/**
 * Large Dialog Component
 * Dialog ขนาดใหญ่สำหรับแสดงข้อมูลรายละเอียด
 * รองรับ responsive และ full-screen บนมือถือ
 */

import * as React from "react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { XIcon } from "lucide-react";

function LargeDialog({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="large-dialog" {...props} />;
}

function LargeDialogTrigger({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return (
    <DialogPrimitive.Trigger data-slot="large-dialog-trigger" {...props} />
  );
}

function LargeDialogPortal({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="large-dialog-portal" {...props} />;
}

function LargeDialogClose({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="large-dialog-close" {...props} />;
}

function LargeDialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="large-dialog-overlay"
      className={cn(
        "fixed inset-0 isolate z-50 bg-black/50 backdrop-blur-sm duration-200 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
        className,
      )}
      {...props}
    />
  );
}

function LargeDialogContent({
  className,
  children,
  showCloseButton = true,
  size = "xl",
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  showCloseButton?: boolean;
  size?: "lg" | "xl" | "2xl" | "full";
}) {
  const sizeClasses = {
    lg: "max-w-4xl", // 896px
    xl: "max-w-6xl", // 1152px
    "2xl": "max-w-7xl", // 1280px
    full: "max-w-[95vw]",
  };

  return (
    <LargeDialogPortal>
      <LargeDialogOverlay />
      <DialogPrimitive.Content
        data-slot="large-dialog-content"
        className={cn(
          // Base styles
          "fixed top-1/2 left-1/2 z-50 grid w-full -translate-x-1/2 -translate-y-1/2",
          // Size
          sizeClasses[size],
          // Mobile: full screen with safe areas
          "h-[100dvh] max-h-[100dvh] md:h-auto md:max-h-[90vh]",
          // Padding and background
          "bg-white p-0",
          // Border and shadow
          "md:rounded-2xl md:border md:shadow-2xl",
          // Animation
          "duration-200 outline-none",
          "data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95",
          "data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
          // Overflow
          "overflow-hidden flex flex-col",
          className,
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close data-slot="large-dialog-close" asChild>
            <Button
              variant="ghost"
              className="absolute top-4 right-4 z-10 rounded-full"
              size="icon"
            >
              <XIcon className="h-5 w-5" />
              <span className="sr-only">Close</span>
            </Button>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </LargeDialogPortal>
  );
}

function LargeDialogHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="large-dialog-header"
      className={cn(
        "flex flex-col gap-3 px-6 py-6 border-b bg-muted/30 md:px-8",
        className,
      )}
      {...props}
    />
  );
}

function LargeDialogBody({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="large-dialog-body"
      className={cn("flex-1 overflow-y-auto px-6 py-6 md:px-8", className)}
      {...props}
    />
  );
}

function LargeDialogFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  showCloseButton?: boolean;
}) {
  return (
    <div
      data-slot="large-dialog-footer"
      className={cn(
        "flex flex-col-reverse gap-3 px-6 py-4 border-t bg-muted/30 sm:flex-row sm:justify-end md:px-8",
        className,
      )}
      {...props}
    >
      {children}
      {showCloseButton && (
        <DialogPrimitive.Close asChild>
          <Button variant="outline">Close</Button>
        </DialogPrimitive.Close>
      )}
    </div>
  );
}

function LargeDialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="large-dialog-title"
      className={cn(
        "font-heading text-2xl md:text-3xl leading-tight font-bold",
        className,
      )}
      {...props}
    />
  );
}

function LargeDialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="large-dialog-description"
      className={cn("text-base text-muted-foreground", className)}
      {...props}
    />
  );
}

export {
  LargeDialog,
  LargeDialogClose,
  LargeDialogContent,
  LargeDialogDescription,
  LargeDialogFooter,
  LargeDialogHeader,
  LargeDialogBody,
  LargeDialogOverlay,
  LargeDialogPortal,
  LargeDialogTitle,
  LargeDialogTrigger,
};
