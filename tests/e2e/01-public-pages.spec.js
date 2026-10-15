const { test, expect } = require("@playwright/test");
const {
  prisma,
  TEST_PREFIX,
  attachErrorCollector
} = require("./helpers");

test.describe("Public Pages & Brand Experience", () => {
  test("Homepage renders hero, featured services, gallery, philosophy, WhatsApp CTA, and zero e-commerce elements", async ({
    page
  }) => {
    const collector = attachErrorCollector(page);

    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: /Beautiful Nails\. Beautiful You\./i })
    ).toBeVisible();
    await expect(page.getByTestId("hero-book-cta")).toBeVisible();
    await expect(page.getByTestId("hero-explore-cta")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /Featured Nail Services/i })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /Featured Nail Art Gallery/i })
    ).toBeVisible();
    await expect(page.getByTestId("floating-whatsapp-button")).toBeVisible();

    // Strict check: no e-commerce / cart / checkout UI
    const bodyText = (await page.locator("body").innerText()).toLowerCase();
    expect(bodyText).not.toContain("add to cart");
    expect(bodyText).not.toContain("shopping cart");
    expect(bodyText).not.toContain("proceed to checkout");
    expect(bodyText).not.toContain("apply coupon");

    collector.assertNoErrors();
  });

  test("About page loads salon story, hygiene standards, and values", async ({
    page
  }) => {
    const collector = attachErrorCollector(page);
    await page.goto("/about");
    await expect(
      page.getByRole("heading", { name: /More than nails\. A moment for you\./i })
    ).toBeVisible();
    await expect(
      page.getByText(/Our Mission/i)
    ).toBeVisible();
    collector.assertNoErrors();
  });

  test("Services page filters by category & search and navigates to service detail page", async ({
    page
  }) => {
    const collector = attachErrorCollector(page);
    await page.goto("/services");

    const firstCard = page.locator('[data-testid^="service-card-"]').first();
    await expect(firstCard).toBeVisible();

    await page.getByTestId("services-search-input").fill("Gel");
    await expect(firstCard).toBeVisible();
    await page.getByTestId("services-search-input").fill("");

    await firstCard.getByRole("link", { name: /View Details/i }).click();

    await expect(page).toHaveURL(/\/services\/.+/);
    await expect(page.getByTestId("service-book-cta")).toBeVisible();

    // Open service lightbox
    await page.getByTestId("open-service-lightbox").click();
    await expect(page.getByTestId("image-lightbox")).toBeVisible();
    await page.getByRole("button", { name: /Close lightbox/i }).click();

    collector.assertNoErrors();
  });

  test("Gallery page filters, opens lightbox modal, and navigates to gallery detail page", async ({
    page
  }) => {
    const collector = attachErrorCollector(page);
    await page.goto("/gallery");

    const firstGalleryCard = page
      .locator('[data-testid^="gallery-card-"]')
      .first();
    await expect(firstGalleryCard).toBeVisible();

    // Open lightbox
    await firstGalleryCard.getByRole("button", { name: /Preview .* full screen/i }).click();
    await expect(page.getByTestId("image-lightbox")).toBeVisible();
    await page.getByRole("button", { name: /Close lightbox/i }).click();
    await expect(page.getByTestId("image-lightbox")).toBeHidden();

    // Navigate to detail page
    await firstGalleryCard.getByRole("link", { name: /View Design/i }).click();
    await expect(page).toHaveURL(/\/gallery\/.+/);
    await expect(
      page.getByRole("link", { name: /Book Inspired Set/i })
    ).toBeVisible();

    collector.assertNoErrors();
  });

  test("Videos page displays video library and opens video detail player", async ({
    page
  }) => {
    const collector = attachErrorCollector(page);
    await page.goto("/videos");

    const firstVideoCard = page.locator('[data-testid^="video-card-"]').first();
    await expect(firstVideoCard).toBeVisible();

    await firstVideoCard.locator("a").first().click();
    await expect(page).toHaveURL(/\/videos\/.+/);
    await expect(page.locator("video").first()).toBeVisible();

    collector.assertNoErrors();
  });

  test("Contact page validates and submits inquiry to PostgreSQL", async ({
    page
  }) => {
    const collector = attachErrorCollector(page);
    const contactEmail = `${TEST_PREFIX}inquiry-${Date.now()}@aurenanails.com`;

    await page.goto("/contact");
    await expect(page.getByTestId("contact-form")).toBeVisible();

    await page.getByTestId("contact-name-input").fill("Ananya Kapoor");
    await page.getByTestId("contact-email-input").fill(contactEmail);
    await page.getByTestId("contact-mobile-input").fill("9876543211");
    await page
      .getByTestId("contact-subject-input")
      .fill("Bridal Trousseau Nail Art Consultation");
    await page
      .getByTestId("contact-message-input")
      .fill(
        "Hello Aurena Studio, I would love to schedule a bridal nail art consultation for next month."
      );

    await page.getByTestId("contact-submit-btn").click();
    await expect(page.getByTestId("contact-success-alert")).toBeVisible();

    const saved = await prisma.contactMessage.findFirst({
      where: { email: contactEmail }
    });
    expect(saved).toBeTruthy();
    expect(saved.subject).toContain("Bridal Trousseau");

    collector.assertNoErrors();
  });
});
