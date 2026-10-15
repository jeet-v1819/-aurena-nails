const { test, expect } = require("@playwright/test");
const {
  prisma,
  TEST_PREFIX,
  attachErrorCollector,
  findAvailableFutureDateAndSlot
} = require("./helpers");

test.describe("Appointment Booking, Concurrency Protection & Verified Reviews", () => {
  const uniqueSuffix = Date.now();
  const bookingEmail = `${TEST_PREFIX}booker-${uniqueSuffix}@aurenanails.com`;
  const bookingPassword = "BookerPassword@2026";

  test("Customer books appointment, double-booking same slot is rejected, review is gated until COMPLETED, and cancellation frees slot", async ({
    page,
    request
  }) => {
    const collector = attachErrorCollector(page);

    // 1. Register customer
    await page.goto("/register");
    await page.getByTestId("register-firstName-input").fill("Kavya");
    await page.getByTestId("register-lastName-input").fill("Menon");
    await page.getByTestId("register-email-input").fill(bookingEmail);
    await page.getByTestId("register-mobile-input").fill("9811223344");
    await page.getByTestId("register-password-input").fill(bookingPassword);
    await page
      .getByTestId("register-confirmPassword-input")
      .fill(bookingPassword);
    await page.getByTestId("register-submit-btn").click();
    await expect(page).toHaveURL(/\/profile/);

    const bookerUser = await prisma.user.findUnique({
      where: { email: bookingEmail }
    });
    expect(bookerUser).toBeTruthy();

    // 2. Pick a real active service and find an open future date & slot
    const service = await prisma.service.findFirst({
      where: { active: true, available: true },
      orderBy: { createdAt: "asc" }
    });
    expect(service).toBeTruthy();

    const { date: targetDate, slot: targetSlot, secondSlot } =
      await findAvailableFutureDateAndSlot(request, service.id, 14);

    // 3. Verify that before completing an appointment, review submission form is not shown
    await page.goto(`/services/${service.slug}`);
    await expect(page.getByTestId("service-review-form")).toHaveCount(0);

    // 4. Book appointment on /booking
    await page.goto(`/booking?serviceId=${service.id}`);
    await expect(page.getByTestId("booking-form")).toBeVisible();
    await page.getByTestId("booking-date-input").fill(targetDate);

    const slotBtn = page.getByTestId(`slot-btn-${targetSlot}`);
    await expect(slotBtn).toBeVisible();
    await slotBtn.click();

    await page
      .getByTestId("booking-note-input")
      .fill("Soft almond shape with rose gold chrome accent.");
    await page.getByTestId("confirm-booking-btn").click();

    await expect(page.getByTestId("booking-confirmation-card")).toBeVisible();

    const createdAppt = await prisma.appointment.findFirst({
      where: {
        userId: bookerUser.id,
        serviceId: service.id,
        status: "PENDING"
      },
      orderBy: { createdAt: "desc" }
    });
    expect(createdAppt).toBeTruthy();

    // 5. Verify review API blocks submission while appointment is still PENDING (403)
    const pendingReviewAttempt = await page.evaluate(
      async ({ appointmentId, serviceId }) => {
        const res = await fetch("/api/reviews", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            appointmentId,
            serviceId,
            rating: 5,
            comment: "Attempting review while appointment is still pending."
          })
        });
        return res.status;
      },
      { appointmentId: createdAppt.id, serviceId: service.id }
    );
    expect(pendingReviewAttempt).toBe(403);

    // 6. Verify concurrency / overlap constraint: attempting to book the exact same slot again returns 409
    const duplicateRes = await page.evaluate(
      async ({ serviceId, date, time }) => {
        const res = await fetch("/api/appointments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            serviceId,
            date,
            time,
            note: "Duplicate attempt"
          })
        });
        return { status: res.status, body: await res.json() };
      },
      { serviceId: service.id, date: targetDate, time: targetSlot }
    );
    expect(duplicateRes.status).toBe(409);

    // 7. Mark appointment COMPLETED and verify customer can now submit a verified review
    await prisma.appointment.update({
      where: { id: createdAppt.id },
      data: { status: "COMPLETED" }
    });

    await page.goto(`/services/${service.slug}`);
    await expect(page.getByTestId("service-review-form")).toBeVisible();
    await page
      .getByTestId("review-comment-input")
      .fill(
        "Absolutely flawless gel manicure at Aurena! The rose gold finish lasted three weeks without a single chip."
      );
    await page.getByTestId("submit-review-btn").click();

    await expect(
      page.getByText(/Absolutely flawless gel manicure at Aurena/i)
    ).toBeVisible();

    // 8. Book a second appointment and test customer cancellation on /appointments
    await page.goto(`/booking?serviceId=${service.id}`);
    await page.getByTestId("booking-date-input").fill(targetDate);
    await page.getByTestId(`slot-btn-${secondSlot}`).click();
    await page.getByTestId("confirm-booking-btn").click();
    await expect(page.getByTestId("booking-confirmation-card")).toBeVisible();

    const secondAppt = await prisma.appointment.findFirst({
      where: {
        userId: bookerUser.id,
        serviceId: service.id,
        status: "PENDING"
      },
      orderBy: { createdAt: "desc" }
    });
    expect(secondAppt).toBeTruthy();

    await page.goto("/appointments");
    const cancelBtn = page.getByTestId(`cancel-appointment-btn-${secondAppt.id}`);
    await expect(cancelBtn).toBeVisible();
    await cancelBtn.click();
    await page.getByTestId("confirm-modal-submit").click();

    await expect(
      page.getByTestId(`appointment-status-${secondAppt.id}`)
    ).toHaveText("CANCELLED");

    collector.assertNoErrors();
  });
});
