"use client";
import { signIn, signOut, useSession } from "next-auth/react";
import { Appbar } from "@repo/ui/appbar";
import { useRouter } from "next/navigation";
import { RootState } from "@repo/store/appStore";
import { useSelector } from "react-redux";
interface LinkProps {
  to: string;
  text: string;
}

export function AppbarClient() {
  const session = useSession();
  const router = useRouter();
  const cartLength = useSelector((store: RootState) => store.cart.items.length);
  const headerLinks: LinkProps[] = [
    {
      to: "/dashboard",
      text: "Wallet",
    },
    {
      to: "/cart",
      text: `Cart-${cartLength} items`,
    },
  ];
  return (
    <div>
      <Appbar
        onSignin={signIn}
        onSignout={async () => {
          await signOut();
          router.push("/api/auth/signin");
        }}
        user={session.data?.user}
        headerLinks={headerLinks}
      />
    </div>
  );
}
