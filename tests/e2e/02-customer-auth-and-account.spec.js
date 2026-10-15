const { test, expect } = require("@playwright/test");
const crypto = require("crypto");
const {
  prisma,
  TEST_PREFIX,
  attachErrorCollector
} = require("./helpers");

test.describe("Customer Authentication, Profile, Password Recovery & Wishlist", () => {
  const uniqueSuffix = Date.now();
  const customerEmail = `${TEST_PREFIX}customer-${uniqueSuffix}@aurenanails.com`;
  const initialPassword = "LuxuryNails@2026";
  const updatedPassword = "NewLuxuryNails@2026";

  test("Unauthenticated visitor is redirected to /login on protected customer routes", async ({
    page
  }) => {
    const collector = attachErrorCollector(page);

    for (const route of ["/profile", "/appointments", "/wishlist", "/notifications"]) {
      await page.goto(route);
      await expect(page).toHaveURL(/\/login/);
    }

    collector.assertNoErrors();
  });

  test("Customer registration, session persistence, profile update, wishlist toggle, and password change", async ({
    page
  }) => {
    const collector = attachErrorCollector(page);

    await page.goto("/register");
    await expect(page.getByTestId("register-form")).toBeVisible();

    await page.getByTestId("register-firstName-input").fill("Meera");
    await page.getByTestId("register-lastName-input").fill("Deshmukh");
    await page.getByTestId("register-email-input").fill(customerEmail);
    await page.getByTestId("register-mobile-input").fill("9820123456");
    await page.getByTestId("register-password-input").fill(initialPassword);
    await page
      .getByTestId("register-confirmPassword-input")
      .fill(initialPassword);

    await page.getByTestId("register-submit-btn").click();
    await expect(page).toHaveURL(/\/profile/);

    // Verify session persists on reload
    await page.reload();
    await expect(page.getByTestId("profile-firstName-input")).toHaveValue("Meera");

    // Update profile
    await page.getByTestId("profile-firstName-input").fill("Meera Aria");
    await page.getByTestId("profile-save-btn").click();
    await expect(page.getByTestId("profile-success-alert")).toBeVisible();

    const dbUser = await prisma.user.findUnique({
      where: { email: customerEmail }
    });
    expect(dbUser.firstName).toBe("Meera Aria");

    // Toggle wishlist on a service and a gallery item
    await page.goto("/services");
    const firstWishlistBtn = page
      .locator('[data-testid^="wishlist-service-btn-"]')
      .first();
    await firstWishlistBtn.click();
    await expect(page.getByTestId("toast-notification")).toBeVisible();

    await page.goto("/gallery");
    const firstGalleryWishlistBtn = page
      .locator('[data-testid^="wishlist-gallery-btn-"]')
      .first();
    await firstGalleryWishlistBtn.click();

    await page.goto("/wishlist");
    await expect(
      page.locator('[data-testid^="wishlist-item-"]').first()
    ).toBeVisible();

    // Change customer password
    await page.goto("/profile");
    await page.getByLabel("Current Password *").fill(initialPassword);
    await page.getByLabel("New Password *", { exact: true }).fill(updatedPassword);
    await page.getByLabel("Confirm New Password *").fill(updatedPassword);
    await page.getByRole("button", { name: "Update Password" }).click();
    await expect(
      page.getByText(/Your password has been updated/i)
    ).toBeVisible();

    // Logout and login with new password
    await page.getByRole("button", { name: "Logout" }).click();
    await page.goto("/login");
    await page.getByTestId("login-identifier-input").fill(customerEmail);
    await page.getByTestId("login-password-input").fill(updatedPassword);
    await page.getByTestId("login-submit-btn").click();
    await expect(page).toHaveURL(/\/profile|\/$/);

    collector.assertNoErrors();
  });

  test("Forgot password issues recovery token and resets password", async ({
    page
  }) => {
    const collector = attachErrorCollector(page);
    const resetTargetPassword = "ResetLuxury@2026";

    await page.goto("/forgot-password");
    await page.getByTestId("forgot-email-input").fill(customerEmail);
    await page.getByTestId("forgot-submit-btn").click();
    await expect(page.getByTestId("forgot-password-success")).toBeVisible();

    // Create a known raw token for the user in PasswordResetToken to verify the full token reset flow
    const user = await prisma.user.findUnique({
      where: { email: customerEmail }
    });
    expect(user).toBeTruthy();

    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + 3600 * 1000)
      }
    });

    await page.goto(`/forgot-password?token=${rawToken}`);
    await expect(page.getByTestId("reset-password-form")).toBeVisible();
    await page.getByTestId("reset-password-input").fill(resetTargetPassword);
    await page
      .getByTestId("reset-confirm-password-input")
      .fill(resetTargetPassword);
    await page.getByTestId("reset-password-submit-btn").click();

    await expect(page.getByTestId("forgot-password-success")).toBeVisible();

    // Verify login works with the newly reset password
    await page.goto("/login");
    await page.getByTestId("login-identifier-input").fill(customerEmail);
    await page.getByTestId("login-password-input").fill(resetTargetPassword);
    await page.getByTestId("login-submit-btn").click();
    await expect(page).toHaveURL(/\/profile|\/$/);

    collector.assertNoErrors();
  });
});
