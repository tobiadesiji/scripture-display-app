import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import type { BibleVersion, ThemeSettings } from "@/types/scripture";

export type UserPreferenceInput = {
  preferredVersion?: BibleVersion | null;
  themeSettingsJson?: ThemeSettings | null;
};

export async function getUserPreferences(userId: string) {
  return prisma.userPreference.findUnique({
    where: { userId },
  });
}

export async function upsertUserPreferences(
  userId: string,
  data: UserPreferenceInput,
) {
  return prisma.userPreference.upsert({
    where: { userId },
    update: {
      ...(data.preferredVersion !== undefined
        ? { preferredVersion: data.preferredVersion }
        : {}),
      ...(data.themeSettingsJson !== undefined
        ? {
            themeSettingsJson:
              data.themeSettingsJson === null
                ? Prisma.JsonNull
                : (data.themeSettingsJson as Prisma.InputJsonValue),
          }
        : {}),
    },
    create: {
      userId,
      preferredVersion: data.preferredVersion ?? null,
      themeSettingsJson:
        data.themeSettingsJson === undefined
          ? Prisma.JsonNull
          : data.themeSettingsJson === null
            ? Prisma.JsonNull
            : (data.themeSettingsJson as Prisma.InputJsonValue),
    },
  });
}

export async function updatePreferredVersion(
  userId: string,
  preferredVersion: BibleVersion,
) {
  return upsertUserPreferences(userId, { preferredVersion });
}

export async function updateThemeSettings(
  userId: string,
  themeSettingsJson: ThemeSettings,
) {
  return upsertUserPreferences(userId, { themeSettingsJson });
}