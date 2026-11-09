import { prisma, transaction, isUniqueViolation } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { applyWalletChange } from "./wallet.service";

const DAILY_REWARD_AMOUNT = 100;

export function getWibDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")!.value;
  const month = parts.find((part) => part.type === "month")!.value;
  const day = parts.find((part) => part.type === "day")!.value;

  return `${year}-${month}-${day}`;
}

export async function getDailyLoginRewardStatus(userId: string) {
  const dateKey = getWibDateKey();

  const claim = await prisma.dailyLoginReward.findUnique({
    where: {
      userId_dateKey: {
        userId,
        dateKey,
      },
    },
    select: {
      createdAt: true,
      amount: true,
    },
  });

  return {
    amount: DAILY_REWARD_AMOUNT,
    dateKey,
    claimedAt: claim?.createdAt ?? null,
    claimed: Boolean(claim),
  };
}

export async function claimDailyLoginReward(userId: string) {
  const dateKey = getWibDateKey();

  try {
    return await transaction(async (tx) => {
      const claim = await tx.dailyLoginReward.create({
        data: {
          userId,
          dateKey,
          amount: DAILY_REWARD_AMOUNT,
        },
      });

      await applyWalletChange(tx, {
        userId,
        currency: "COIN",
        amount: DAILY_REWARD_AMOUNT,
        type: "DAILY_LOGIN_REWARD",
        referenceType: "DailyLoginReward",
        referenceId: claim.id,
        description: "Daily login reward",
        metadata: {
          rewardDate: dateKey,
          timezone: "Asia/Jakarta",
        },
      });

      return claim;
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new AppError(
        "CONFLICT",
        "Reward harian sudah kamu klaim hari ini.",
      );
    }

    throw error;
  }
}