import React from "react";
import ProtectedCustomerLayout from "@/components/auth/ProtectedCustomerLayout";

export const dynamic = "force-dynamic";

export default function WishlistLayout({ children }) {
  return (
    <ProtectedCustomerLayout redirectTo="/wishlist">
      {children}
    </ProtectedCustomerLayout>
  );
}
