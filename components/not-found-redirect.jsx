"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function NotFoundRedirect({ delay = 2500 }) {
  const router = useRouter();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      router.replace("/main");
    }, delay);

    return () => window.clearTimeout(timer);
  }, [delay, router]);

  return null;
}
