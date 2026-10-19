import React from "react";
import ProtectedCustomerLayout from "@/components/auth/ProtectedCustomerLayout";

export const dynamic = "force-dynamic";

export default function AppointmentsLayout({ children }) {
  return (
    <ProtectedCustomerLayout redirectTo="/appointments">
      {children}
    </ProtectedCustomerLayout>
  );
}
