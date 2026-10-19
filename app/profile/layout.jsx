import React from "react";
import ProtectedCustomerLayout from "@/components/auth/ProtectedCustomerLayout";

export const dynamic = "force-dynamic";

export default function ProfileLayout({ children }) {
  return (
    <ProtectedCustomerLayout redirectTo="/profile">
      {children}
    </ProtectedCustomerLayout>
  );
}
