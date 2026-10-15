const { test, expect } = require("@playwright/test");
const {
  prisma,
  TEST_PREFIX,
  attachErrorCollector,
  ensureTestAdmin,
  findAvailableFutureDateAndSlot,
  cleanupTestArtifacts
} = require("./helpers");

test.describe("Session Persistence, Role-Based Navigation, Protected Routes, Booking & Logout Regressions", () => {
  const uniqueSuffix = Date.now();
  const customerEmail = `${TEST_PREFIX}reg-cust-${uniqueSuffix}@aurenanails.com`;
  const customerMobile = `97${String(uniqueSuffix).slice(-8)}`;
  const customerPassword = "CustomerLogin@2026";
  let adminInfo;

  test.beforeAll(async () => {
    adminInfo = await ensureTestAdmin();
  });

  test.afterAll(async () => {
    await cleanupTestArtifacts();
    await prisma.$disconnect();
  });

  test("1. Customer login, session persistence on refresh & navigation, customer navbar links, protected pages, and logout", async ({
    page
  }) => {
    const collector = attachErrorCollector(page);

    // Register customer first
    await page.goto("/register");
    await page.getByTestId("register-firstName-input").fill("Ananya");
    await page.getByTestId("register-lastName-input").fill("Kapoor");
    await page.getByTestId("register-email-input").fill(customerEmail);
    await page.getByTestId("register-mobile-input").fill(customerMobile);
    await page.getByTestId("register-password-input").fill(customerPassword);
    await page
      .getByTestId("register-confirmPassword-input")
      .fill(customerPassword);
    await page.getByTestId("register-submit-btn").click();
    await expect(page).toHaveURL(/\/profile/);

    // Log out to test fresh login flow
    await page.getByTestId("nav-logout").click();
    await expect(page.getByTestId("nav-login")).toBeVisible();

    // 1. Customer logs in
    await page.goto("/login");
    await page.getByTestId("login-identifier-input").fill(customerEmail);
    await page.getByTestId("login-password-input").fill(customerPassword);
    await page.getByTestId("login-submit-btn").click();
    await expect(page).toHaveURL(/\/profile/);

    // 2. Customer session remains valid after page refresh
    await page.reload();
    await expect(page).toHaveURL(/\/profile/);
    await expect(page.getByTestId("profile-firstName-input")).toHaveValue(
      "Ananya"
    );

    // 7. Customer navigation displays the correct links (and not admin dashboard)
    await expect(page.getByTestId("nav-profile")).toBeVisible();
    await expect(page.getByTestId("nav-appointments")).toBeVisible();
    await expect(page.getByTestId("nav-wishlist")).toBeVisible();
    await expect(page.getByTestId("nav-notifications")).toBeVisible();
    await expect(page.getByTestId("nav-logout")).toBeVisible();
    await expect(page.getByTestId("nav-admin")).toHaveCount(0);

    // 3-6. Customer can navigate to Profile, My Appointments, Wishlist, and Notifications without being redirected to /login
    await page.getByTestId("nav-appointments").click();
    await expect(page).toHaveURL(/\/appointments/);
    await page.reload();
    await expect(page).toHaveURL(/\/appointments/);

    await page.getByTestId("nav-wishlist").click();
    await expect(page).toHaveURL(/\/wishlist/);
    await page.reload();
    await expect(page).toHaveURL(/\/wishlist/);

    await page.getByTestId("nav-notifications").click();
    await expect(page).toHaveURL(/\/notifications/);
    await page.reload();
    await expect(page).toHaveURL(/\/notifications/);

    await page.getByTestId("nav-profile").click();
    await expect(page).toHaveURL(/\/profile/);

    // 8. Customer remains authenticated when returning to the homepage
    await page.goto("/");
    await expect(page.getByTestId("nav-profile")).toBeVisible();
    await expect(page.getByTestId("nav-logout")).toBeVisible();
    await expect(page.getByTestId("nav-login")).toHaveCount(0);

    // Customer cannot access admin routes or admin APIs
    const adminApiAttempt = await page.evaluate(async () => {
      const res = await fetch("/api/admin/dashboard", {
        credentials: "include"
      });
      return res.status;
    });
    expect(adminApiAttempt).toBe(403);

    await page.goto("/admin/dashboard");
    await expect(page).toHaveURL(/\/|\?forbidden=1/);

    // 9. Customer can log out and session is invalidated on server
    await page.goto("/");
    await page.getByTestId("nav-logout").click();
    await expect(page.getByTestId("nav-login")).toBeVisible();
    await expect(page.getByTestId("nav-register")).toBeVisible();

    const sessionAfterLogout = await page.evaluate(async () => {
      const res = await fetch("/api/auth/session", { credentials: "include" });
      return res.json();
    });
    expect(sessionAfterLogout.user).toBeNull();
    expect(sessionAfterLogout.session).toBeNull();

    // 10. Protected routes redirect logged-out users correctly
    for (const protectedRoute of [
      "/profile",
      "/appointments",
      "/wishlist",
      "/notifications"
    ]) {
      await page.goto(protectedRoute);
      await expect(page).toHaveURL(/\/login/);
    }

    collector.assertNoErrors();
  });

  test("2. Admin login, persistent session, admin navigation on homepage (no customer links), all 12 admin routes, and logout", async ({
    page
  }) => {
    const collector = attachErrorCollector(page);

    // 1. Admin logs in
    await page.goto("/admin/login");
    await page.getByTestId("admin-email-input").fill(adminInfo.email);
    await page.getByTestId("admin-password-input").fill(adminInfo.password);
    await page.getByTestId("admin-login-submit-btn").click();

    // 3. Admin Dashboard opens successfully
    await expect(page).toHaveURL(/\/admin\/dashboard/);
    await expect(page.getByTestId("admin-dashboard-view")).toBeVisible();

    // 2. Admin session remains valid after page refresh
    await page.reload();
    await expect(page).toHaveURL(/\/admin\/dashboard/);
    await expect(page.getByTestId("admin-dashboard-view")).toBeVisible();

    // 4 & 5. Returning to the homepage displays admin navigation and does NOT show customer links
    await page.goto("/");
    await expect(page.getByTestId("nav-admin")).toBeVisible();
    await expect(page.getByTestId("nav-admin-appointments")).toBeVisible();
    await expect(page.getByTestId("nav-admin-services")).toBeVisible();
    await expect(page.getByTestId("nav-admin-customers")).toBeVisible();
    await expect(page.getByTestId("nav-admin-settings")).toBeVisible();
    await expect(page.getByTestId("nav-profile")).toBeVisible();
    await expect(page.getByTestId("nav-logout")).toBeVisible();

    // Must NOT show customer-only navigation items to ADMIN
    await expect(page.getByTestId("nav-appointments")).toHaveCount(0);
    await expect(page.getByTestId("nav-wishlist")).toHaveCount(0);
    await expect(page.getByTestId("nav-notifications")).toHaveCount(0);
    await expect(page.getByTestId("nav-login")).toHaveCount(0);

    // 6. Admin can access all 12 permitted admin pages without redirecting to /login
    const adminRoutes = [
      "/admin/dashboard",
      "/admin/customers",
      "/admin/services",
      "/admin/gallery",
      "/admin/videos",
      "/admin/appointments",
      "/admin/reviews",
      "/admin/messages",
      "/admin/categories",
      "/admin/content",
      "/admin/business-hours",
      "/admin/settings"
    ];

    for (const route of adminRoutes) {
      await page.goto(route);
      await expect(page).toHaveURL(new RegExp(route.replace(/\//g, "\\/")));
    }

    // 8. Admin logout invalidates session
    await page.goto("/");
    await page.getByTestId("nav-logout").click();
    await expect(page.getByTestId("nav-login")).toBeVisible();

    await page.goto("/admin/dashboard");
    await expect(page).toHaveURL(/\/admin\/login/);

    collector.assertNoErrors();
  });

  test("3. Appointment booking: unauthenticated user is redirected, authenticated customer books without 'Please sign in to continue', double-click is idempotent, and booking appears in My Appointments", async ({
    page,
    request
  }) => {
    const collector = attachErrorCollector(page);

    const service = await prisma.service.findFirst({
      where: { active: true, available: true },
      orderBy: { createdAt: "asc" }
    });
    expect(service).toBeTruthy();

    const { date: targetDate, slot: targetSlot } =
      await findAvailableFutureDateAndSlot(request, service.id, 18);

    // 8. Unauthenticated user cannot submit a booking
    await page.goto(`/booking?serviceId=${service.id}`);
    const unauthBookingRes = await page.evaluate(
      async ({ serviceId, date, time }) => {
        const res = await fetch("/api/appointments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ serviceId, date, time, note: "Unauth test" })
        });
        return res.status;
      },
      { serviceId: service.id, date: targetDate, time: targetSlot }
    );
    expect(unauthBookingRes).toBe(401);

    await page.getByTestId("confirm-booking-btn").click();
    await expect(page).toHaveURL(/\/login\?redirect=%2Fbooking/);

    // 1. Customer logs in
    await page.getByTestId("login-identifier-input").fill(customerEmail);
    await page.getByTestId("login-password-input").fill(customerPassword);
    await page.getByTestId("login-submit-btn").click();
    await expect(page).toHaveURL(/\/booking/);

    // 9. Authenticated customer is NOT shown 'Please sign in to continue.'
    await expect(page.getByText(/Please sign in to continue/i)).toHaveCount(0);

    // 2 & 3. Select service, available date and time
    await page.getByTestId("booking-service-select").selectOption(service.id);
    await page.getByTestId("booking-date-input").fill(targetDate);
    const slotBtn = page.getByTestId(`slot-btn-${targetSlot}`);
    await expect(slotBtn).toBeVisible();
    await slotBtn.click();

    await page
      .getByTestId("booking-note-input")
      .fill("Regression test booking note");

    // 4 & 10. Confirm appointment (double-click guard prevents duplicate appointments)
    const confirmBtn = page.getByTestId("confirm-booking-btn");
    await confirmBtn.dblclick();

    // 6. Success message appears after creation
    await expect(page.getByTestId("booking-confirmation-card")).toBeVisible();
    await expect(page.getByText(/Booking Submitted/i)).toBeVisible();
    await expect(page.getByText(/Please sign in to continue/i)).toHaveCount(0);

    // 5. Verify exactly 1 appointment saved in Neon PostgreSQL for this slot
    const customerRecord = await prisma.user.findUnique({
      where: { email: customerEmail }
    });
    const savedAppointments = await prisma.appointment.findMany({
      where: {
        userId: customerRecord.id,
        serviceId: service.id,
        note: "Regression test booking note"
      }
    });
    expect(savedAppointments.length).toBe(1);

    // 7. Appointment appears in My Appointments
    await page.goto("/appointments");
    await expect(
      page.getByTestId(`appointment-card-${savedAppointments[0].id}`)
    ).toBeVisible();
    await expect(
      page.getByTestId(`appointment-status-${savedAppointments[0].id}`)
    ).toHaveText("PENDING");

    collector.assertNoErrors();
  });
});
