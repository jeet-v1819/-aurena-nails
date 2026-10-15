require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const CATEGORIES = [
  {
    name: "Bridal",
    slug: "bridal",
    description: "Intricate couture bridal nail artistry with pearl, lace, and rose-gold detailing.",
    image: "/images/art-nails.jpg"
  },
  {
    name: "French",
    slug: "french",
    description: "Timeless micro-French, classic ivory tips, and modern chrome-edged silhouettes.",
    image: "/images/french-nails.jpg"
  },
  {
    name: "Gel",
    slug: "gel",
    description: "High-gloss soft builder gel and chip-resistant Japanese gel manicures.",
    image: "/images/gel-nails.jpg"
  },
  {
    name: "Acrylic",
    slug: "acrylic",
    description: "Sculpted durability with custom length, arch balance, and velvety finishes.",
    image: "/images/gel-nails.jpg"
  },
  {
    name: "Minimal",
    slug: "minimal",
    description: "Sheer blush nudes, negative-space lines, and understated clean-girl aesthetics.",
    image: "/images/french-nails.jpg"
  },
  {
    name: "Luxury",
    slug: "luxury",
    description: "Bespoke 3D embellishments, Swarovski crystals, and gilded editorial sets.",
    image: "/images/art-nails.jpg"
  },
  {
    name: "Party",
    slug: "party",
    description: "Glazed chrome, cat-eye velvet shimmer, and statement celebration nails.",
    image: "/images/art-nails.jpg"
  },
  {
    name: "Seasonal",
    slug: "seasonal",
    description: "Curated palettes inspired by spring florals, summer resort, and festive warmth.",
    image: "/images/gel-nails.jpg"
  },
  {
    name: "Trending",
    slug: "trending",
    description: "Aura blush gradients, glazed donut finishes, and viral runway looks.",
    image: "/images/hero-nails.jpg"
  },
  {
    name: "Custom",
    slug: "custom",
    description: "One-of-a-kind hand-painted artistry tailored to your personal moodboard.",
    image: "/images/art-nails.jpg"
  }
];

const SERVICES = [
  {
    name: "Gel Nails",
    slug: "gel-nails",
    categorySlug: "gel",
    shortDescription: "A flawless finish. A little everyday luxury.",
    description:
      "A flawless finish. A little everyday luxury. Enjoy a thoughtful, personalised nail experience, from a consultation on your preferred shape and colour to cuticle refinement and a mirror-shine builder gel coat.",
    mainImage: "/images/gel-nails.jpg",
    duration: 60,
    startingPrice: 799,
    regularPrice: 999,
    promotionalPrice: 799,
    nailType: "Natural / Soft Gel",
    style: "Glossy Nude & Blush",
    occasion: "Everyday Luxury",
    difficulty: "Standard",
    preparation:
      "Please arrive with clean hands. Let us know if you have an existing gel set that requires gentle soak-off removal.",
    aftercare:
      "Apply nourishing cuticle oil daily, wear gloves for household chores, and avoid using your nails as tools.",
    available: true,
    featured: true,
    active: true
  },
  {
    name: "Acrylic Nails",
    slug: "acrylic-nails",
    categorySlug: "acrylic",
    shortDescription: "Sculpted strength with an effortlessly graceful silhouette.",
    description:
      "Precision-sculpted acrylic enhancements tailored to your desired length and shape—almond, coffin, oval, or stiletto—finished with ultra-smooth gel polish.",
    mainImage: "/images/gel-nails.jpg",
    duration: 90,
    startingPrice: 1299,
    regularPrice: 1499,
    promotionalPrice: 1299,
    nailType: "Acrylic Enhancement",
    style: "Sculpted Classic",
    occasion: "All Occasions",
    difficulty: "Advanced",
    preparation:
      "Keep natural nails untrimmed prior to your appointment so our technician can customize form placement.",
    aftercare:
      "Schedule a rebalance infill every 2 to 3 weeks and hydrate cuticles twice daily.",
    available: true,
    featured: false,
    active: true
  },
  {
    name: "French Nails",
    slug: "french-nails",
    categorySlug: "french",
    shortDescription: "Timeless elegance, down to the finest detail.",
    description:
      "Timeless elegance, down to the finest detail. Choose between classic Parisian ivory tips, ultra-thin micro-French lines, or rose-gold chrome edges over a sheer milky base.",
    mainImage: "/images/french-nails.jpg",
    duration: 60,
    startingPrice: 999,
    regularPrice: 1199,
    promotionalPrice: 999,
    nailType: "Builder Gel / Natural",
    style: "French Tip",
    occasion: "Work & Formal",
    difficulty: "Intermediate",
    preparation:
      "Arrive with bare nails or book a gentle gel removal add-on note.",
    aftercare:
      "Protect the crisp smile line by applying top-coat refresher or cuticle balm daily.",
    available: true,
    featured: true,
    active: true
  },
  {
    name: "Bridal Nails",
    slug: "bridal-nails",
    categorySlug: "bridal",
    shortDescription: "Bespoke bridal couture crafted for your unforgettable day.",
    description:
      "An indulgent bridal consultation and couture nail artistry featuring delicate 3D pearls, lace embroidery motifs, soft ombre blush, and subtle shimmer matched to your bridal attire.",
    mainImage: "/images/art-nails.jpg",
    duration: 120,
    startingPrice: 1999,
    regularPrice: 2499,
    promotionalPrice: 1999,
    nailType: "Gel Extension / Couture",
    style: "Bridal Pearl & Lace",
    occasion: "Wedding & Engagement",
    difficulty: "Couture",
    preparation:
      "Bring a photo of your bridal outfit or jewelry so our senior artist can harmonize undertones.",
    aftercare:
      "Book 2–3 days before wedding festivities and use provided travel cuticle oil.",
    available: true,
    featured: true,
    active: true
  },
  {
    name: "Party Nails",
    slug: "party-nails",
    categorySlug: "party",
    shortDescription: "Luminous chrome, velvet cat-eye, and celebration glamour.",
    description:
      "Turn heads at every celebration with magnetic velvet cat-eye pigments, rose-gold mirror chrome, and sparkling crystal accents designed to catch every light.",
    mainImage: "/images/art-nails.jpg",
    duration: 90,
    startingPrice: 1299,
    regularPrice: 1599,
    promotionalPrice: 1299,
    nailType: "Gel / Soft Extension",
    style: "Glazed Chrome & Cat-Eye",
    occasion: "Party & Festive",
    difficulty: "Intermediate",
    preparation: "Please arrive 5 minutes early to browse our chrome and cat-eye swatch library.",
    aftercare: "Avoid harsh solvents or acetone to preserve the mirror-chrome top coat.",
    available: true,
    featured: false,
    active: true
  },
  {
    name: "Minimal Nails",
    slug: "minimal-nails",
    categorySlug: "minimal",
    shortDescription: "Whisper-soft sheer tones and refined negative space.",
    description:
      "Clean, breathable Russian-style cuticle care paired with sheer milky pinks, fine gold micro-dots, and delicate botanical line work.",
    mainImage: "/images/french-nails.jpg",
    duration: 45,
    startingPrice: 699,
    regularPrice: 849,
    promotionalPrice: 699,
    nailType: "Natural Nail",
    style: "Clean Minimalist",
    occasion: "Everyday & Office",
    difficulty: "Standard",
    preparation: "Arrive with clean hands; no prior preparation needed.",
    aftercare: "Massage jojoba oil into the nail plate and eponychium every evening.",
    available: true,
    featured: false,
    active: true
  },
  {
    name: "Luxury Nail Art",
    slug: "luxury-nail-art",
    categorySlug: "luxury",
    shortDescription: "Editorial artistry with hand-sculpted 3D and gilded accents.",
    description:
      "Our signature luxury experience. Includes structured BIAB or soft-gel overlay, hand-painted fine art, genuine gold leaf encapsulation, and bespoke crystal placement.",
    mainImage: "/images/art-nails.jpg",
    duration: 90,
    startingPrice: 1499,
    regularPrice: 1899,
    promotionalPrice: 1499,
    nailType: "Structured Gel / Extension",
    style: "Editorial Couture",
    occasion: "Special Occasion",
    difficulty: "Couture",
    preparation: "Share your inspiration references in the booking note if desired.",
    aftercare: "Treat encapsulated charms gently and avoid prying objects with fingertips.",
    available: true,
    featured: true,
    active: true
  },
  {
    name: "Nail Extensions",
    slug: "nail-extensions",
    categorySlug: "acrylic",
    shortDescription: "Featherlight soft-gel and Apres-style full-cover extensions.",
    description:
      "Instant length and graceful architecture using soak-off soft gel tips that feel weightless on the natural nail bed while delivering 3+ weeks of wear.",
    mainImage: "/images/gel-nails.jpg",
    duration: 120,
    startingPrice: 1799,
    regularPrice: 2099,
    promotionalPrice: 1799,
    nailType: "Soft Gel Extension",
    style: "Almond & Coffin",
    occasion: "All Occasions",
    difficulty: "Advanced",
    preparation: "Please arrive with bare natural nails or mention removal in your booking note.",
    aftercare: "Return for professional soak-off removal; never peel extensions off.",
    available: true,
    featured: false,
    active: true
  },
  {
    name: "Custom Nail Art",
    slug: "custom-nail-art",
    categorySlug: "custom",
    shortDescription: "Your imagination brought to life by our master nail artists.",
    description:
      "Collaborate one-on-one with our lead nail artist to design a completely custom ten-finger story—from aura airbrush gradients to miniature hand-painted illustrations.",
    mainImage: "/images/art-nails.jpg",
    duration: 120,
    startingPrice: 1999,
    regularPrice: 2399,
    promotionalPrice: 1999,
    nailType: "Custom Canvas",
    style: "Bespoke Art",
    occasion: "Editorial & Custom",
    difficulty: "Couture",
    preparation: "Include design notes or colour preferences when booking your slot.",
    aftercare: "Apply cuticle serum daily to keep surrounding skin camera-ready.",
    available: true,
    featured: false,
    active: true
  },
  {
    name: "Nail Care",
    slug: "nail-care",
    categorySlug: "minimal",
    shortDescription: "Restorative spa manicure, keratin therapy, and cuticle ritual.",
    description:
      "A soothing restorative treatment for natural nails: exfoliating rose-petal soak, precision cuticle work, warm Shea butter massage, and keratin strengthening glaze.",
    mainImage: "/images/french-nails.jpg",
    duration: 30,
    startingPrice: 499,
    regularPrice: 649,
    promotionalPrice: 499,
    nailType: "Natural Spa Care",
    style: "Natural Glow",
    occasion: "Self-Care & Wellness",
    difficulty: "Standard",
    preparation: "Suitable for all natural nail types, including post-extension recovery.",
    aftercare: "Reapply nourishing nail serum after handwashing.",
    available: true,
    featured: false,
    active: true
  }
];

const GALLERY_DESIGNS = [
  {
    publicId: "seed-gallery-rose-gold-bridal",
    title: "Rose Gold & Pearl Bridal Almond",
    description: "Hand-placed freshwater pearl accents over a sheer blush BIAB base with rose-gold leaf.",
    url: "/images/art-nails.jpg",
    categorySlug: "bridal",
    tags: ["bridal", "pearls", "rose-gold", "almond"],
    style: "Couture 3D",
    occasion: "Wedding",
    featured: true,
    position: 1
  },
  {
    publicId: "seed-gallery-parisian-micro-french",
    title: "Parisian Milky Micro-French",
    description: "Ultra-fine ivory smile lines over a translucent milky-pink builder gel manicure.",
    url: "/images/french-nails.jpg",
    categorySlug: "french",
    tags: ["french", "minimal", "milky", "oval"],
    style: "Micro-French",
    occasion: "Everyday",
    featured: true,
    position: 2
  },
  {
    publicId: "seed-gallery-blush-glazed-gel",
    title: "Silk Blush Glazed Gel Set",
    description: "Luminous pearl-glazed finish over soft nude gel polish for effortless everyday elegance.",
    url: "/images/gel-nails.jpg",
    categorySlug: "gel",
    tags: ["gel", "glazed", "nude", "blush"],
    style: "Glazed Chrome",
    occasion: "Everyday",
    featured: true,
    position: 3
  },
  {
    publicId: "seed-gallery-champagne-chrome-luxury",
    title: "Champagne Chrome & Botanical Foil",
    description: "Editorial luxury set combining brushed champagne chrome with delicate floral embossing.",
    url: "/images/hero-nails.jpg",
    categorySlug: "luxury",
    tags: ["luxury", "chrome", "floral", "gold"],
    style: "Editorial",
    occasion: "Party",
    featured: true,
    position: 4
  },
  {
    publicId: "seed-gallery-clean-girl-sheer",
    title: "Bare Cashmere Negative Space",
    description: "Whisper-sheer neutral base with a single rose-gold micro-dot at the lunula.",
    url: "/images/french-nails.jpg",
    categorySlug: "minimal",
    tags: ["minimal", "sheer", "nude", "short"],
    style: "Minimalist",
    occasion: "Work",
    featured: false,
    position: 5
  },
  {
    publicId: "seed-gallery-velvet-cat-eye-party",
    title: "Rose Quartz Velvet Cat-Eye",
    description: "Magnetic glass-velvet shimmer that shifts from soft pink to champagne in candlelight.",
    url: "/images/art-nails.jpg",
    categorySlug: "party",
    tags: ["party", "cat-eye", "velvet", "pink"],
    style: "Velvet Shimmer",
    occasion: "Party",
    featured: true,
    position: 6
  }
];

const SAMPLE_VIDEOS = [
  {
    publicId: "seed-video-bridal-couture-process",
    title: "Behind the Artistry: Bridal Pearl & Rose-Gold Couture",
    description:
      "Watch our master nail artist hand-sculpt delicate 3D floral petals and place micro-pearls on a sheer blush almond extension set.",
    url: "/videos/nail-art-showcase.mp4",
    thumbnail: "/images/art-nails.jpg",
    categorySlug: "bridal",
    tags: ["bridal", "tutorial", "3d-art", "luxury"],
    featured: true
  },
  {
    publicId: "seed-video-french-perfection",
    title: "The Signature Parisian Micro-French Ritual",
    description:
      "Discover how we achieve a razor-sharp micro-French smile line over structured Japanese builder gel.",
    url: "/videos/nail-art-showcase.mp4",
    thumbnail: "/images/french-nails.jpg",
    categorySlug: "french",
    tags: ["french", "gel", "studio", "minimal"],
    featured: true
  },
  {
    publicId: "seed-video-studio-tour",
    title: "Inside Aurena Nails Luxury Studio",
    description:
      "Step inside our serene blush-and-travertine sanctuary designed for unhurried pampering and bespoke nail care.",
    url: "/videos/nail-art-showcase.mp4",
    thumbnail: "/images/studio-1.jpg",
    categorySlug: "luxury",
    tags: ["studio", "luxury", "experience"],
    featured: false
  }
];

function ensureSampleMp4File() {
  const videoDir = path.join(process.cwd(), "public", "videos");
  fs.mkdirSync(videoDir, { recursive: true });
  const filePath = path.join(videoDir, "nail-art-showcase.mp4");
  if (!fs.existsSync(filePath)) {
    // Valid minimal ISO Base Media File (MP4) header box + moov box
    const ftyp = Buffer.from([
      0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70,
      0x69, 0x73, 0x6f, 0x6d, 0x00, 0x00, 0x02, 0x00,
      0x69, 0x73, 0x6f, 0x6d, 0x69, 0x73, 0x6f, 0x32
    ]);
    const moov = Buffer.from([
      0x00, 0x00, 0x00, 0x08, 0x6d, 0x6f, 0x6f, 0x76
    ]);
    fs.writeFileSync(filePath, Buffer.concat([ftyp, moov]));
  }
}

async function seed() {
  console.log("Starting Aurena Nails non-destructive database seed...");
  ensureSampleMp4File();

  // 1. Upsert Gallery Categories
  const categoryMap = new Map();
  for (const cat of CATEGORIES) {
    const existing = await prisma.galleryCategory.findUnique({
      where: { slug: cat.slug }
    });
    const record = await prisma.galleryCategory.upsert({
      where: { slug: cat.slug },
      update: {
        description: existing?.description || cat.description,
        image: existing?.image || cat.image
      },
      create: {
        name: cat.name,
        slug: cat.slug,
        description: cat.description,
        image: cat.image,
        active: true
      }
    });
    categoryMap.set(cat.slug, record.id);
  }
  console.log(`✔ Seeded ${categoryMap.size} categories.`);

  // 2. Upsert Services
  for (const svc of SERVICES) {
    const categoryId = categoryMap.get(svc.categorySlug) || null;
    const existing = await prisma.service.findUnique({
      where: { slug: svc.slug }
    });

    await prisma.service.upsert({
      where: { slug: svc.slug },
      update: {
        categoryId: existing?.categoryId || categoryId,
        mainImage: existing?.mainImage || svc.mainImage,
        nailType: existing?.nailType || svc.nailType,
        style: existing?.style || svc.style,
        occasion: existing?.occasion || svc.occasion,
        difficulty: existing?.difficulty || svc.difficulty
      },
      create: {
        name: svc.name,
        slug: svc.slug,
        shortDescription: svc.shortDescription,
        description: svc.description,
        categoryId,
        mainImage: svc.mainImage,
        duration: svc.duration,
        startingPrice: svc.startingPrice,
        regularPrice: svc.regularPrice,
        promotionalPrice: svc.promotionalPrice,
        nailType: svc.nailType,
        style: svc.style,
        occasion: svc.occasion,
        difficulty: svc.difficulty,
        preparation: svc.preparation,
        aftercare: svc.aftercare,
        available: svc.available,
        featured: svc.featured,
        active: svc.active
      }
    });
  }
  console.log(`✔ Seeded ${SERVICES.length} services.`);

  // 3. Upsert Sample Gallery Images
  for (const item of GALLERY_DESIGNS) {
    const categoryId = categoryMap.get(item.categorySlug) || null;
    await prisma.galleryImage.upsert({
      where: { publicId: item.publicId },
      update: {},
      create: {
        title: item.title,
        description: item.description,
        url: item.url,
        publicId: item.publicId,
        categoryId,
        tags: item.tags,
        style: item.style,
        occasion: item.occasion,
        featured: item.featured,
        active: true,
        position: item.position
      }
    });
  }
  console.log(`✔ Seeded ${GALLERY_DESIGNS.length} gallery designs.`);

  // 4. Upsert Sample Videos
  for (const vid of SAMPLE_VIDEOS) {
    const categoryId = categoryMap.get(vid.categorySlug) || null;
    await prisma.video.upsert({
      where: { publicId: vid.publicId },
      update: {},
      create: {
        title: vid.title,
        description: vid.description,
        url: vid.url,
        publicId: vid.publicId,
        thumbnail: vid.thumbnail,
        categoryId,
        tags: vid.tags,
        featured: vid.featured,
        active: true
      }
    });
  }
  console.log(`✔ Seeded ${SAMPLE_VIDEOS.length} videos.`);

  // 5. Ensure Business Hours exist for all 7 weekdays
  const defaultHours = [
    { weekday: 0, open: "10:00", close: "19:00", closed: true },
    { weekday: 1, open: "10:00", close: "19:00", closed: false },
    { weekday: 2, open: "10:00", close: "19:00", closed: false },
    { weekday: 3, open: "10:00", close: "19:00", closed: false },
    { weekday: 4, open: "10:00", close: "19:00", closed: false },
    { weekday: 5, open: "10:00", close: "19:00", closed: false },
    { weekday: 6, open: "10:00", close: "20:00", closed: false }
  ];
  for (const bh of defaultHours) {
    await prisma.businessHours.upsert({
      where: { weekday: bh.weekday },
      update: {},
      create: bh
    });
  }
  console.log("✔ Verified 7 weekday business hour records.");

  // 6. Ensure WebsiteContent sections exist
  const contentDefaults = {
    home: {
      title: "Beautiful Nails. Beautiful You.",
      description:
        "Thoughtfully crafted nail art. A little luxury, just for you. Discover your signature style at Aurena Nails.",
      image: "/images/hero-nails.jpg",
      primaryLabel: "Book Appointment",
      secondaryLabel: "Explore Nail Art"
    },
    about: {
      title: "More than nails. A moment for you.",
      story:
        "We believe beauty is in the little details. A shade that makes you smile. A design that feels entirely your own. A quiet moment to slow down and be cared for. Aurena brings thoughtful artistry and personal attention to every nail experience.",
      mission: "To make self-care feel personal, beautiful, and effortless.",
      vision: "A space where creativity and confidence meet, one set of nails at a time.",
      artist:
        "Meet your artist at your consultation. We’ll listen to your ideas and create your next favourite look together.",
      image: "/images/hero-nails.jpg"
    },
    contact: {
      businessName: "Aurena Nails Luxury Studio",
      phone: "+91 98765 43210",
      whatsapp: "919876543210",
      email: "concierge@aurenanails.com",
      address: "2nd Floor, Roseate Promenade, Linking Road, Bandra West, Mumbai 400050",
      mapUrl:
        "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3771.0!2d72.83!3d19.06!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMTnCsDAzJzM2LjAiTiA3MsKwNDknNDguMCJF!5e0!3m2!1sen!2sin!4v1700000000000",
      instagram: "https://instagram.com/aurenanails",
      facebook: "https://facebook.com/aurenanails",
      pinterest: "https://pinterest.com/aurenanails",
      youtube: "https://youtube.com/@aurenanails"
    },
    settings: {
      timezone: "Asia/Kolkata",
      bookingDays: 60,
      cancellationHours: 24
    }
  };

  for (const [key, defaultVal] of Object.entries(contentDefaults)) {
    const existing = await prisma.websiteContent.findUnique({ where: { key } });
    if (!existing) {
      await prisma.websiteContent.create({
        data: { key, value: defaultVal }
      });
    } else if (key === "contact" && (!existing.value?.phone || !existing.value?.address)) {
      await prisma.websiteContent.update({
        where: { key },
        data: {
          value: {
            ...defaultVal,
            ...(existing.value || {}),
            phone: existing.value?.phone || defaultVal.phone,
            whatsapp: existing.value?.whatsapp || defaultVal.whatsapp,
            email: existing.value?.email || defaultVal.email,
            address: existing.value?.address || defaultVal.address,
            instagram: existing.value?.instagram || defaultVal.instagram,
            facebook: existing.value?.facebook || defaultVal.facebook,
            pinterest: existing.value?.pinterest || defaultVal.pinterest,
            youtube: existing.value?.youtube || defaultVal.youtube
          }
        }
      });
    }
  }
  console.log("✔ Verified WebsiteContent sections.");

  // 7. Optional secure first-admin setup via environment variables (no hardcoded credentials)
  const adminEmail = process.env.INITIAL_ADMIN_EMAIL?.trim()?.toLowerCase();
  const adminPassword = process.env.INITIAL_ADMIN_PASSWORD;
  const adminMobile = process.env.INITIAL_ADMIN_MOBILE?.trim() || "9876543210";

  if (
    adminEmail &&
    adminPassword &&
    adminPassword !== "CHANGE_ME_STRONG_PASSWORD" &&
    process.env.NEON_AUTH_BASE_URL
  ) {
    console.log(`Provisioning initial admin account for ${adminEmail}...`);
    const baseUrl = process.env.NEON_AUTH_BASE_URL;
    const signUpRes = await fetch(`${baseUrl}/sign-up/email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        "x-neon-auth-proxy": "nextjs"
      },
      body: JSON.stringify({
        email: adminEmail,
        password: adminPassword,
        name: "Aurena Administrator"
      })
    });

    let authId = null;
    if (signUpRes.ok) {
      const body = await signUpRes.json();
      authId = body?.user?.id || null;
    } else {
      const existingAuth = await prisma.$queryRaw`
        SELECT id FROM "neon_auth"."user" WHERE email = ${adminEmail} LIMIT 1
      `;
      if (Array.isArray(existingAuth) && existingAuth[0]?.id) {
        authId = String(existingAuth[0].id);
      }
    }

    if (authId) {
      await prisma.user.upsert({
        where: { email: adminEmail },
        update: { role: "ADMIN", active: true, authId },
        create: {
          authId,
          email: adminEmail,
          firstName: "Aurena",
          lastName: "Admin",
          mobile: adminMobile,
          role: "ADMIN",
          active: true
        }
      });
      console.log(`✔ Initial admin account (${adminEmail}) verified with ADMIN role.`);
    }
  }

  console.log("Aurena Nails seed completed successfully.");
}

seed()
  .catch((err) => {
    console.error("Seed error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
