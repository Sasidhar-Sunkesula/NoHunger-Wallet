"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "../auth";
import prisma from "@repo/db/client";
import { getCartTotal } from "./cart";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";

export async function makePayment() {
  // check if user exists
  const session = await getServerSession(authOptions);
  if (!session?.user || !session.user.id) {
    return {
      message: "Unauthenticated request",
    };
  }
  const userId = Number(session.user.id);
  // get the cart total, without relying on the cost sent by the client
  try {
    const cart = await prisma.cart.findFirst({
      where: {
        userId,
      },
    });
    if (!cart) {
      throw Error("Cart doesn't exist for this user");
    }
    const totalCost = await getCartTotal(cart.userId);
    if (!totalCost.cost) {
      throw Error("Error while getting the cost of the cart");
    }
    if (totalCost.cost > 0) {
      const walletBalance = await prisma.balance.findFirst({
        where: {
          userId,
        },
      });
      if (!walletBalance || walletBalance.amount < totalCost.cost) {
        // throw Error("Insufficient funds");
        redirect("/");
      }
      if (walletBalance.amount > totalCost.cost) {
        const updateBalance = await prisma.balance.update({
          where: {
            userId,
          },
          data: {
            amount: walletBalance.amount - totalCost.cost,
          },
        });

        // add it to the orders table
        const order = await prisma.orders.create({
          data: {
            userId,
            status: "Success",
            date: new Date(),
            orderTotal: totalCost.cost,
          },
        });
        if (!order) {
          throw Error("Error while placing the order");
        }
        return {
          updatedBalance: updateBalance.amount,
          message: order,
        };
      }
    } else {
      throw Error("Cost of the cart is less than or equal to zero");
    }
  } catch (error: any) {
    return {
      status: "error",
      message: error.message,
    };
  }
}
