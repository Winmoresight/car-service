/**
 * API Utilities
 * Helper functions สำหรับ API routes
 */

import { NextResponse } from "next/server";
import type { ApiResponse } from "@/types/api";

/**
 * Wrap API handler with timeout and error handling
 */
export function withTimeout<T>(
  handler: () => Promise<T>,
  timeoutMs = 60000, // 60 seconds default
): Promise<T> {
  return Promise.race([
    handler(),
    new Promise<T>((_, reject) =>
      setTimeout(
        () => reject(new Error(`Request timeout after ${timeoutMs}ms`)),
        timeoutMs,
      ),
    ),
  ]);
}

/**
 * Create error response
 */
export function errorResponse(
  message: string,
  status = 500,
  details?: unknown,
): NextResponse<ApiResponse<never>> {
  const response: ApiResponse<never> = {
    success: false,
    error: message,
    timestamp: new Date().toISOString(),
  };

  if (details && process.env.NODE_ENV === "development") {
    response.details = details;
  }

  return NextResponse.json(response, { status });
}

/**
 * Create success response
 */
export function successResponse<T>(
  data: T,
  status = 200,
): NextResponse<ApiResponse<T>> {
  const response: ApiResponse<T> = {
    success: true,
    data,
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json(response, { status });
}

/**
 * Handle API errors with proper logging and response
 */
export function handleApiError(error: unknown, context: string) {
  console.error(`❌ ${context}:`, error);

  if (error instanceof Error) {
    const errorMsg = error.message.toLowerCase();

    // Connection errors
    if (
      errorMsg.includes("connection") ||
      errorMsg.includes("timeout") ||
      errorMsg.includes("socket") ||
      errorMsg.includes("econnreset")
    ) {
      return errorResponse(
        "Database connection error. Please try again.",
        503,
        process.env.NODE_ENV === "development" ? error.message : undefined,
      );
    }

    // Query errors
    if (errorMsg.includes("invalid") || errorMsg.includes("syntax")) {
      return errorResponse(
        "Invalid request parameters",
        400,
        process.env.NODE_ENV === "development" ? error.message : undefined,
      );
    }

    // Permission errors
    if (errorMsg.includes("permission") || errorMsg.includes("denied")) {
      return errorResponse(
        "Permission denied",
        403,
        process.env.NODE_ENV === "development" ? error.message : undefined,
      );
    }
  }

  // Generic error
  return errorResponse(
    "An unexpected error occurred",
    500,
    process.env.NODE_ENV === "development" ? error : undefined,
  );
}

/**
 * Retry function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: {
    maxAttempts?: number;
    delayMs?: number;
    backoff?: boolean;
  } = {},
): Promise<T> {
  const { maxAttempts = 3, delayMs = 1000, backoff = true } = options;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt < maxAttempts) {
        const delay = backoff ? delayMs * attempt : delayMs;
        console.warn(`⚠️ Attempt ${attempt} failed, retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error("Retry failed");
}
