
"use client";

import * as React from "react";
import { useFormStatus } from "react-dom";
import { useActionState } from "react";
import { authenticate } from "@/app/settings/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Lock } from "lucide-react";

function LoginButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" aria-disabled={pending}>
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Authenticating...
        </>
      ) : (
        "Login"
      )}
    </Button>
  );
}

export function AdminLogin() {
  const [errorMessage, dispatch] = useActionState(authenticate, undefined);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-8 bg-background">
      <Card className="w-full max-w-sm shadow-2xl">
        <CardHeader className="text-center">
            <div className="mx-auto p-3 bg-primary/10 rounded-full w-fit mb-4">
                <Lock className="h-8 w-8 text-primary" />
            </div>
          <CardTitle className="text-2xl">Admin Access Required</CardTitle>
          <CardDescription>
            Enter the password to manage scheduler settings.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={dispatch} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                name="password"
                placeholder="••••••••"
                required
                className="text-base"
              />
            </div>
            {errorMessage && (
                <Alert variant="destructive">
                    <AlertDescription>{errorMessage}</AlertDescription>
                </Alert>
            )}
            <LoginButton />
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
