import { prisma } from "./prisma";
import type { BibleVersion } from "@/types/scripture";

export async function getRecentReferenceHistory(
  userId: string,
  limit = 12,
) {
  return prisma.referenceHistory.findMany({
    where: {
      userId,
      hiddenByUserAt: null,
    },
    orderBy: { openedAt: "desc" },
    take: limit,
  });
}

export async function getAllReferenceHistoryForAdmin(userId: string) {
  return prisma.referenceHistory.findMany({
    where: { userId },
    orderBy: { openedAt: "desc" },
  });
}

export async function addReferenceHistory(
  userId: string,
  sessionKey: string | null | undefined,
  reference: string,
  version?: BibleVersion | string | null,
) {
  const cleanedReference = reference.trim();
  const cleanedVersion = version?.trim() || null;
  const cleanedSessionKey = sessionKey?.trim() || null;

  if (!cleanedReference) {
    return null;
  }

  const latest = await prisma.referenceHistory.findFirst({
    where: { userId },
    orderBy: { openedAt: "desc" },
  });

  if (
    latest &&
    latest.reference === cleanedReference &&
    latest.version === cleanedVersion &&
    latest.sessionKey === cleanedSessionKey
  ) {
    return latest;
  }

  return prisma.referenceHistory.create({
    data: {
      userId,
      sessionKey: cleanedSessionKey,
      reference: cleanedReference,
      version: cleanedVersion,
    },
  });
}

export async function hideReferenceHistoryItem(userId: string, historyId: string) {
  return prisma.referenceHistory.updateMany({
    where: {
      id: historyId,
      userId,
      hiddenByUserAt: null,
    },
    data: {
      hiddenByUserAt: new Date(),
    },
  });
}

export async function clearReferenceHistory(userId: string) {
  return prisma.referenceHistory.updateMany({
    where: {
      userId,
      hiddenByUserAt: null,
    },
    data: {
      hiddenByUserAt: new Date(),
    },
  });
}