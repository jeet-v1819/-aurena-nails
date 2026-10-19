import React from "react";
import Link from "next/link";
import {
  Award,
  Calendar,
  CheckCircle2,
  Heart,
  ShieldCheck,
  Sparkles
} from "lucide-react";
import {
  DEFAULT_WEBSITE_CONTENT,
  getPublicWebsiteContent
} from "@/services/contentService";

export const metadata = {
  title: "About Aurena Nails"
};

export const dynamic = "force-dynamic";

export default async function AboutPage() {
  let content;
  try {
    content = await getPublicWebsiteContent({ allowFallback: true });
  } catch (error) {
    // About content is editorial and optional: a database hiccup must never
    // take the page down. Log the real error so it stays observable.
    console.error("[about] Falling back to default studio content", {
      code: error?.code,
      message: error?.message
    });
    content = { about: DEFAULT_WEBSITE_CONTENT.about };
  }
  const about = content?.about || DEFAULT_WEBSITE_CONTENT.about;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-20">
      {/* Header & Salon Story */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        <div className="lg:col-span-6 space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-aurena-blush/50 text-xs uppercase tracking-[0.2em] text-aurena-rosegold font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Our Story</span>
          </div>
          <h1 className="font-serif text-4xl sm:text-5xl font-bold text-aurena-charcoal leading-tight">
            {about.title || "More than nails. A moment for you."}
          </h1>
          <p className="text-base text-aurena-muted leading-relaxed">
            {about.story}
          </p>
          <p className="text-sm text-aurena-muted leading-relaxed">
            {about.passion ||
              "Every brushstroke, builder gel overlay, and hand-sculpted extension is crafted using non-toxic, cruelty-free formulas with hospital-grade sterilization."}
          </p>
          <div className="pt-2">
            <Link
              href="/booking"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-aurena-rosegold text-white text-sm font-medium hover:bg-aurena-charcoal transition"
            >
              <Calendar className="w-4 h-4" />
              <span>Book Your Consultation</span>
            </Link>
          </div>
        </div>

        <div className="lg:col-span-6">
          <div className="rounded-3xl overflow-hidden border-4 border-white shadow-luxury aspect-[4/3] bg-aurena-beige">
            <img
              src={about.image || "/images/hero-nails.jpg"}
              alt="Aurena Nails artistry"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </section>

      {/* Mission, Vision, Passion */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="p-8 rounded-3xl bg-white border border-aurena-border shadow-soft space-y-3">
          <span className="text-xs uppercase tracking-widest text-aurena-rosegold font-semibold">
            01 • Our Mission
          </span>
          <h2 className="font-serif text-2xl font-bold text-aurena-charcoal">
            Personal, Effortless Self-Care
          </h2>
          <p className="text-sm text-aurena-muted leading-relaxed">
            {about.mission ||
              "To make self-care feel personal, beautiful, and effortless."}
          </p>
        </div>

        <div className="p-8 rounded-3xl bg-white border border-aurena-border shadow-soft space-y-3">
          <span className="text-xs uppercase tracking-widest text-aurena-rosegold font-semibold">
            02 • Our Vision
          </span>
          <h2 className="font-serif text-2xl font-bold text-aurena-charcoal">
            Where Creativity Meets Confidence
          </h2>
          <p className="text-sm text-aurena-muted leading-relaxed">
            {about.vision ||
              "A space where creativity and confidence meet, one set of nails at a time."}
          </p>
        </div>

        <div className="p-8 rounded-3xl bg-white border border-aurena-border shadow-soft space-y-3">
          <span className="text-xs uppercase tracking-widest text-aurena-rosegold font-semibold">
            03 • Master Artistry
          </span>
          <h2 className="font-serif text-2xl font-bold text-aurena-charcoal">
            Dedicated Nail Couturiers
          </h2>
          <p className="text-sm text-aurena-muted leading-relaxed">
            {about.artist ||
              "Meet your artist at your consultation. We’ll listen to your ideas and create your next favourite look together."}
          </p>
        </div>
      </section>

      {/* Why Choose Aurena Nails */}
      <section className="bg-aurena-beige/70 rounded-3xl p-8 sm:p-12 border border-aurena-border space-y-8">
        <div className="max-w-2xl space-y-2">
          <p className="text-xs uppercase tracking-[0.2em] text-aurena-rosegold font-semibold">
            The Aurena Standard
          </p>
          <h2 className="font-serif text-3xl font-bold text-aurena-charcoal">
            Why Guests Choose Aurena Nails
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              icon: ShieldCheck,
              title: "4-Step Sterilization",
              desc: "Ultrasonic cleaning and medical-grade autoclave pouches opened fresh at your table."
            },
            {
              icon: Award,
              title: "HEMA-Free & Vegan Gels",
              desc: "Curated Japanese and Korean builder gels gentle on sensitive nail beds."
            },
            {
              icon: Heart,
              title: "Natural Nail Health First",
              desc: "Damage-free soak-off removal and keratin conditioning built into every service."
            },
            {
              icon: CheckCircle2,
              title: "Bespoke Consultations",
              desc: "Custom undertone matching for bridal, editorial, and everyday minimalism."
            }
          ].map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="p-6 rounded-2xl bg-white border border-aurena-border space-y-2"
              >
                <Icon className="w-6 h-6 text-aurena-rosegold" />
                <h3 className="font-serif text-lg font-semibold text-aurena-charcoal">
                  {feature.title}
                </h3>
                <p className="text-xs text-aurena-muted leading-relaxed">
                  {feature.desc}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Studio Gallery */}
      <section className="space-y-8">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.2em] text-aurena-rosegold font-semibold">
            Our Sanctuary
          </p>
          <h2 className="font-serif text-3xl font-bold text-aurena-charcoal">
            Inside the Aurena Studio
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <img
            src="/images/studio-1.jpg"
            alt="Aurena Nails main studio lounge"
            className="w-full h-72 object-cover rounded-3xl border border-aurena-border shadow-soft"
          />
          <img
            src="/images/gel-nails.jpg"
            alt="Aurena Nails manicure station"
            className="w-full h-72 object-cover rounded-3xl border border-aurena-border shadow-soft"
          />
          <img
            src="/images/art-nails.jpg"
            alt="Aurena Nails bridal artistry suite"
            className="w-full h-72 object-cover rounded-3xl border border-aurena-border shadow-soft"
          />
        </div>
      </section>
    </div>
  );
}
