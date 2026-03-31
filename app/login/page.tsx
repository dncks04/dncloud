"use client";

import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { HardDrive } from "lucide-react";

export default function LoginPage() {
  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-6 p-8 border border-border rounded-xl w-80">
        <div className="flex items-center gap-2">
          <HardDrive className="h-6 w-6" />
          <h1 className="text-2xl font-bold">DnCloud</h1>
        </div>
        <p className="text-sm text-muted-foreground text-center">
          로그인하고 파일을 관리하세요
        </p>
        <Button onClick={handleGoogleLogin} className="w-full gap-2">
          Google로 로그인
        </Button>
      </div>
    </div>
  );
}