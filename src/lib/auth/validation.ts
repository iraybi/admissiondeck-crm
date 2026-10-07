import { z } from "zod";

export const passwordSchema = z
  .string()
  .min(12, "Password must be at least 12 characters")
  .max(128, "Password must be at most 128 characters");

export const emailSchema = z.string().email("Enter a valid email");

export const nameSchema = z
  .string()
  .trim()
  .min(1, "Name is required")
  .max(120, "Name is too long");

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const profileSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  phone: z.string().trim().max(32).optional().or(z.literal("")),
  avatarUrl: z.string().url().optional().or(z.literal("")),
});

export const orgSettingsSchema = z.object({
  name: nameSchema,
  website: z.string().url().optional().or(z.literal("")),
  supportEmail: emailSchema.optional().or(z.literal("")),
  phone: z.string().trim().max(32).optional().or(z.literal("")),
  addressLine1: z.string().trim().max(200).optional().or(z.literal("")),
  city: z.string().trim().max(80).optional().or(z.literal("")),
  country: z.string().trim().max(80).optional().or(z.literal("")),
  timezone: z.string().trim().max(64),
  currency: z.string().trim().length(3),
  brandColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Use a hex color like #E2555A")
    .optional()
    .or(z.literal("")),
  logoUrl: z.string().url().optional().or(z.literal("")),
});

export const inviteUserSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  role: z.enum(["FIRM_MANAGER", "AGENCY_MANAGER", "COUNSELLOR", "AGENT"]),
  orgId: z.string().uuid(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;
export type OrgSettingsInput = z.infer<typeof orgSettingsSchema>;
export type InviteUserInput = z.infer<typeof inviteUserSchema>;
