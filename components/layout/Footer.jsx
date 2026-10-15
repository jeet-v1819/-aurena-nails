import React from "react";
import Link from "next/link";
import {
  Clock,
  Facebook,
  Instagram,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Sparkles,
  Youtube
} from "lucide-react";
import { WEEKDAY_NAMES, formatTimeDisplay } from "@/utils/format";

export default function Footer({ contact = {}, businessHours = [] }) {
  const phone = contact?.phone || "+91 98765 43210";
  const email = contact?.email || "concierge@aurenanails.com";
  const address =
    contact?.address ||
    "2nd Floor, Roseate Promenade, Linking Road, Bandra West, Mumbai 400050";
  const whatsappNumber = String(contact?.whatsapp || "919876543210").replace(
    /[^0-9]/g,
    ""
  );
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
    "Hello Aurena Nails, I would like to book an appointment."
  )}`;

  return (
    <footer className="bg-aurena-charcoal text-aurena-cream border-t border-aurena-border/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand Column */}
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <span className="w-9 h-9 rounded-full bg-aurena-rosegold flex items-center justify-center text-white">
                <Sparkles className="w-4 h-4" />
              </span>
              <span className="font-serif text-xl font-bold tracking-wider text-white">
                AURENA NAILS
              </span>
            </div>
            <p className="text-sm text-aurena-nude/80 leading-relaxed">
              Luxury Nail Art & Beauty Experience. Thoughtfully crafted manicures,
              bespoke bridal nail couture, and restorative nail care in a serene
              sanctuary.
            </p>
            <div className="flex items-center gap-3 pt-2">
              {contact?.instagram && (
                <a
                  href={contact.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                  className="w-9 h-9 rounded-full bg-white/10 hover:bg-aurena-rosegold flex items-center justify-center transition"
                >
                  <Instagram className="w-4 h-4" />
                </a>
              )}
              {contact?.facebook && (
                <a
                  href={contact.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Facebook"
                  className="w-9 h-9 rounded-full bg-white/10 hover:bg-aurena-rosegold flex items-center justify-center transition"
                >
                  <Facebook className="w-4 h-4" />
                </a>
              )}
              {contact?.pinterest && (
                <a
                  href={contact.pinterest}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Pinterest"
                  className="w-9 h-9 rounded-full bg-white/10 hover:bg-aurena-rosegold flex items-center justify-center transition text-xs font-bold"
                >
                  P
                </a>
              )}
              {contact?.youtube && (
                <a
                  href={contact.youtube}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="YouTube"
                  className="w-9 h-9 rounded-full bg-white/10 hover:bg-aurena-rosegold flex items-center justify-center transition"
                >
                  <Youtube className="w-4 h-4" />
                </a>
              )}
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="WhatsApp"
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-emerald-600 flex items-center justify-center transition"
              >
                <MessageCircle className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-serif text-base font-semibold text-white mb-4">
              Quick Links
            </h3>
            <ul className="space-y-2.5 text-sm text-aurena-nude/80">
              <li>
                <Link href="/about" className="hover:text-aurena-blush transition">
                  About Our Studio
                </Link>
              </li>
              <li>
                <Link href="/services" className="hover:text-aurena-blush transition">
                  Nail Services
                </Link>
              </li>
              <li>
                <Link href="/gallery" className="hover:text-aurena-blush transition">
                  Nail Art Gallery
                </Link>
              </li>
              <li>
                <Link href="/videos" className="hover:text-aurena-blush transition">
                  Video Showcase
                </Link>
              </li>
              <li>
                <Link href="/booking" className="hover:text-aurena-blush transition">
                  Book Appointment
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-aurena-blush transition">
                  Contact Us
                </Link>
              </li>
            </ul>
          </div>

          {/* Signature Services */}
          <div>
            <h3 className="font-serif text-base font-semibold text-white mb-4">
              Signature Services
            </h3>
            <ul className="space-y-2.5 text-sm text-aurena-nude/80">
              <li>
                <Link
                  href="/services/gel-nails"
                  className="hover:text-aurena-blush transition"
                >
                  Gel Nails
                </Link>
              </li>
              <li>
                <Link
                  href="/services/french-nails"
                  className="hover:text-aurena-blush transition"
                >
                  French Nails
                </Link>
              </li>
              <li>
                <Link
                  href="/services/bridal-nails"
                  className="hover:text-aurena-blush transition"
                >
                  Bridal Couture Nails
                </Link>
              </li>
              <li>
                <Link
                  href="/services/luxury-nail-art"
                  className="hover:text-aurena-blush transition"
                >
                  Luxury Nail Art
                </Link>
              </li>
              <li>
                <Link
                  href="/services/nail-extensions"
                  className="hover:text-aurena-blush transition"
                >
                  Nail Extensions
                </Link>
              </li>
              <li>
                <Link
                  href="/services/nail-care"
                  className="hover:text-aurena-blush transition"
                >
                  Restorative Nail Care
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact & Opening Hours */}
          <div className="space-y-4">
            <h3 className="font-serif text-base font-semibold text-white">
              Studio & Hours
            </h3>
            <div className="space-y-2.5 text-sm text-aurena-nude/80">
              <p className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-aurena-rosegold shrink-0 mt-1" />
                <span>{address}</span>
              </p>
              <p className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-aurena-rosegold shrink-0" />
                <span>{phone}</span>
              </p>
              <p className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-aurena-rosegold shrink-0" />
                <span>{email}</span>
              </p>
              <div className="pt-2 border-t border-white/10">
                <p className="flex items-center gap-2 text-xs uppercase tracking-wider text-aurena-blush mb-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Opening Hours</span>
                </p>
                {businessHours.length > 0 ? (
                  <div className="space-y-1 text-xs text-aurena-nude/80">
                    {businessHours.slice(0, 7).map((bh) => (
                      <div key={bh.weekday} className="flex justify-between">
                        <span>{WEEKDAY_NAMES[bh.weekday]}</span>
                        <span>
                          {bh.closed
                            ? "Closed"
                            : `${formatTimeDisplay(bh.open)} – ${formatTimeDisplay(bh.close)}`}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-aurena-nude/80">
                    Mon–Fri: 10:00 AM – 7:00 PM | Sat: 10:00 AM – 8:00 PM | Sun: Closed
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-aurena-nude/60">
          <p>
            © {new Date().getFullYear()} AURENA NAILS — Luxury Nail Art & Beauty
            Experience. All rights reserved.
          </p>
          <p>Informational service pricing only • Appointment-based luxury studio</p>
        </div>
      </div>
    </footer>
  );
}
