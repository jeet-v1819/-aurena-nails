import React from "react";
import { notFound } from "next/navigation";
import { getServiceBySlug } from "@/services/serviceService";
import ServiceDetailClient from "@/components/customer/ServiceDetailClient";

export const dynamic = "force-dynamic";

export default async function ServiceDetailPage(context) {
  const params = await context.params;
  const service = await getServiceBySlug(params?.slug);

  if (!service) {
    notFound();
  }

  return <ServiceDetailClient initialService={service} />;
}
