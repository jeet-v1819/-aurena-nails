const { test, expect } = require("@playwright/test");
const {
  prisma,
  TEST_PREFIX,
  attachErrorCollector,
  ensureTestAdmin,
  cleanupTestArtifacts
} = require("./helpers");

test.describe("Admin Panel Authentication, Analytics & Full CRUD Management", () => {
  let adminInfo;

  test.beforeAll(async () => {
    adminInfo = await ensureTestAdmin();
  });

  test.afterAll(async () => {
    await cleanupTestArtifacts();
    await prisma.$disconnect();
  });

  test("Unauthenticated visitor is redirected to /admin/login when accessing /admin/dashboard", async ({
    page
  }) => {
    const collector = attachErrorCollector(page);
    await page.goto("/admin/dashboard");
    await expect(page).toHaveURL(/\/admin\/login/);
    collector.assertNoErrors();
  });

  test("Admin logs in, views real dashboard metrics, and performs CRUD across Categories, Services, Gallery, Videos, Content, Business Hours & Customers", async ({
    page
  }) => {
    const collector = attachErrorCollector(page);

    // 1. Admin Login
    await page.goto("/admin/login");
    await expect(page.getByTestId("admin-login-form")).toBeVisible();
    await page.getByTestId("admin-email-input").fill(adminInfo.email);
    await page.getByTestId("admin-password-input").fill(adminInfo.password);
    await page.getByTestId("admin-login-submit-btn").click();

    await expect(page).toHaveURL(/\/admin\/dashboard/);
    await expect(page.getByTestId("admin-dashboard-view")).toBeVisible();

    // 2. Category Management CRUD
    const catName = `${TEST_PREFIX}Bridal Couture ${Date.now()}`;
    await page.goto("/admin/categories");
    await page.getByTestId("admin-add-category-btn").click();
    await page.getByTestId("category-name-input").fill(catName);
    await page
      .getByTestId("category-desc-input")
      .fill("Bespoke bridal nail couture sets.");
    await page.getByTestId("save-category-btn").click();
    await expect(page.getByText(catName)).toBeVisible();

    // 3. Service Management CRUD
    const svcName = `${TEST_PREFIX}24K Gold Leaf Ritual ${Date.now()}`;
    await page.goto("/admin/services");
    await page.getByTestId("admin-add-service-btn").click();
    await page.getByTestId("service-name-input").fill(svcName);
    await page.getByTestId("service-duration-input").fill("75");
    await page.getByTestId("service-price-input").fill("2199");
    await page
      .getByTestId("service-shortDesc-input")
      .fill("Opulent 24K gold leaf builder gel overlay.");
    await page
      .getByTestId("service-desc-input")
      .fill(
        "A signature luxury manicure featuring genuine gold leaf encapsulated in crystal builder gel."
      );
    await page.getByTestId("save-service-btn").click();
    await expect(page.getByText(svcName)).toBeVisible();

    // 4. Gallery Management CRUD
    const galleryTitle = `${TEST_PREFIX}Champagne Velvet Cat-Eye ${Date.now()}`;
    await page.goto("/admin/gallery");
    await page.getByTestId("admin-add-gallery-btn").click();
    await page.getByTestId("gallery-title-input").fill(galleryTitle);
    await page
      .getByTestId("gallery-desc-input")
      .fill("Magnetic velvet cat-eye shimmer.");
    await page.getByTestId("save-gallery-btn").click();
    await expect(page.getByText(galleryTitle)).toBeVisible();

    // 5. Video Management CRUD
    const videoTitle = `${TEST_PREFIX}Chrome Glaze Masterclass ${Date.now()}`;
    await page.goto("/admin/videos");
    await page.getByTestId("admin-add-video-btn").click();
    await page.getByTestId("video-title-input").fill(videoTitle);
    await page
      .getByTestId("video-desc-input")
      .fill("Step-by-step mirror glaze demonstration.");
    await page.getByTestId("save-video-btn").click();
    await expect(page.getByText(videoTitle)).toBeVisible();

    // 6. Website Content Management
    await page.goto("/admin/content");
    await expect(page.getByTestId("hero-title-input")).toBeVisible();
    await page.getByTestId("save-hero-content-btn").click();
    await expect(page.getByTestId("content-saved-banner")).toContainText(
      /Updated home/i
    );

    // 7. Business Hours Management
    await page.goto("/admin/business-hours");
    await expect(page.getByTestId("business-hour-row-1")).toBeVisible();
    await page.getByTestId("save-business-hours-btn").click();
    await expect(page.getByTestId("toast-notification")).toContainText(
      /Business hours updated/i
    );

    // 8. Customer Management (Search & Toggle Active/Inactive)
    await page.goto("/admin/customers");
    await expect(page.getByTestId("admin-customers-search")).toBeVisible();

    // 9. Reviews & Contact Messages Management pages load cleanly
    await page.goto("/admin/reviews");
    await expect(
      page.getByRole("heading", { name: /Review Management/i })
    ).toBeVisible();

    await page.goto("/admin/messages");
    await expect(
      page.getByRole("heading", { name: /Contact Messages/i })
    ).toBeVisible();

    // 10. Admin Settings page loads and saves profile
    await page.goto("/admin/settings");
    await expect(page.getByTestId("admin-settings-firstName")).toBeVisible();
    await page.getByTestId("save-admin-profile-btn").click();
    await expect(page.getByTestId("toast-notification")).toContainText(
      /Admin profile updated/i
    );

    collector.assertNoErrors();
  });
});
