import React from "react";
import ProtectedCustomerLayout from "@/components/auth/ProtectedCustomerLayout";

export const dynamic = "force-dynamic";

export default function NotificationsLayout({ children }) {
  return (
    <ProtectedCustomerLayout redirectTo="/notifications">
      {children}
    </ProtectedCustomerLayout>
  );
}
