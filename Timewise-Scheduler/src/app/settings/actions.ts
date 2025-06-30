
"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function authenticate(
  prevState: string | undefined,
  formData: FormData
) {
  try {
    const password = formData.get("password");
    // For production, ADMIN_PASSWORD should be set in the .env file.
    // We fall back to a default "password" for ease of development.
    const adminPassword = process.env.ADMIN_PASSWORD || "password";

    if (password === adminPassword) {
      cookies().set("admin-session", "true", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: "/",
      });
      // A redirect in a server action must be called outside of the try/catch block.
      // This is a known issue in Next.js.
    } else {
      return "Incorrect password. Please try again.";
    }
  } catch (error) {
    console.error("Authentication error:", error);
    return "An unexpected error occurred. Please try again.";
  }
  // Redirect after a successful login.
  redirect("/settings");
}

export async function changePassword(
  prevState: { error?: string; success?: string } | undefined,
  formData: FormData
): Promise<{ error?: string; success?: string }> {
  try {
    const currentPassword = formData.get('currentPassword');
    const newPassword = formData.get('newPassword');
    const confirmPassword = formData.get('confirmPassword');

    const adminPassword = process.env.ADMIN_PASSWORD || "password";

    if (currentPassword !== adminPassword) {
      return { error: 'Incorrect current password.' };
    }
    
    if (!newPassword || newPassword.toString().length < 6) {
        return { error: "New password must be at least 6 characters long." };
    }

    if (newPassword !== confirmPassword) {
      return { error: 'New passwords do not match.' };
    }

    // NOTE: In a real application, you would securely update the password.
    // This prototype cannot modify environment variables at runtime.
    // This action simulates a successful change.
    console.log(`Password change simulated.`);

    return { success: 'Password updated successfully!' };
  } catch (error) {
    console.error('Change password error:', error);
    return { error: 'An unexpected error occurred. Please try again.' };
  }
}
