"use server"
import { getServerSession } from "next-auth";
import { authOptions } from "../auth";
import { Prisma } from "@prisma/client";
import prisma from "@repo/db/client";  // Ensure this import is correctly pointing to your PrismaClient instance

export async function p2pTransfer(to: string, amount: number) {
  const session = await getServerSession(authOptions);
  const from = session?.user?.id;

  if (!from) {
    return {
      message: "Error while sending"
    };
  }

  const toUser = await prisma.user.findFirst({
    where: {
      number: to
    }
  });

  if (!toUser) {
    return {
      message: "User not found"
    };
  }

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.$queryRaw`SELECT * FROM "Balance" WHERE "userId" = ${Number(from)} FOR UPDATE`;

    const fromBalance = await tx.balance.findUnique({
      where: { userId: Number(from) },
    });
  
    if (!fromBalance || fromBalance.amount < amount) {
      throw new Error('Insufficient funds');
    }

    await tx.balance.update({
      where: { userId: Number(from) },
      data: { amount: { decrement: amount } },
    });

    await tx.balance.update({
      where: { userId: toUser.id },
      data: { amount: { increment: amount } },
    });

    await tx.p2pTransfer.create({
      data: {
        fromUserId: Number(from),
        toUserId: toUser.id,
        amount,
        timestamp: new Date()
      }
    });
  });
}
