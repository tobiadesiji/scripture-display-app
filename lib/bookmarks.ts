import { prisma } from "./prisma";
import type { BibleVersion } from "@/types/scripture";

export async function getUserBookmarks(userId: string) {
  return prisma.bookmark.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}

export async function createBookmark(
  userId: string,
  reference: string,
  version?: BibleVersion | string | null,
  label?: string | null,
) {
  const cleanedReference = reference.trim();
  const cleanedVersion = version?.trim() || null;
  const cleanedLabel = label?.trim() || null;

  if (!cleanedReference) {
    return null;
  }

  const existing = await prisma.bookmark.findFirst({
    where: {
      userId,
      reference: cleanedReference,
      version: cleanedVersion,
    },
  });

  if (existing) {
    if (cleanedLabel && existing.label !== cleanedLabel) {
      return prisma.bookmark.update({
        where: { id: existing.id },
        data: { label: cleanedLabel },
      });
    }

    return existing;
  }

  return prisma.bookmark.create({
    data: {
      userId,
      reference: cleanedReference,
      version: cleanedVersion,
      label: cleanedLabel,
    },
  });
}

export async function deleteBookmark(userId: string, bookmarkId: string) {
  return prisma.bookmark.deleteMany({
    where: {
      id: bookmarkId,
      userId,
    },
  });
}

export async function updateBookmarkLabel(
  userId: string,
  bookmarkId: string,
  label?: string | null,
) {
  return prisma.bookmark.updateMany({
    where: {
      id: bookmarkId,
      userId,
    },
    data: {
      label: label?.trim() || null,
    },
  });
}