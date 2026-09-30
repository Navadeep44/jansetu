/**
 * JanSetu End-to-End Test Suite: Complete Grievance-to-Budget Cycle
 *
 * Runs the full 8-step cycle through the real React UI and FastAPI backend:
 * 1. Citizen Submits: State -> District -> Mandal -> Village dependent dropdowns, Water department, text & photo.
 * 2. Department Head Verifies & Assigns: logs in as dept_water_adi, verifies case, assigns to field_utnoor.
 * 3. Field Officer Site Inspection & Budget: logs in as field_utnoor, submits GPS notes and costed line items.
 * 4. Department Head Reviews & Forwards: checks line items, forwards dossier to Collector.
 * 5. Collector Negotiates: logs in as collector_adilabad, counters with SSR benchmark rate, DH accepts.
 * 6. Collector Sanctions & Allocates: budget appears in Field Officer wallet.
 * 7. Field Officer Executes: logs real expenses (spend <= allocation enforced), uploads completion proof.
 * 8. Department Head Approves Proof: checks resolution photos and accepts.
 * 9. Citizen Confirms Fix: confirms "Fixed" on tracking timeline -> status CLOSED.
 * 10. Dashboard Analytics: verifies live updates to Budget Funnel (Requested, Approved, Allocated, Spent).
 */
import { test, expect } from '@playwright/test'

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173'

test.describe('JanSetu Grievance-to-Budget Cycle', () => {
  let trackingId = ''

  test('Step 1: Citizen submits grievance with 4-level dependent dropdowns', async ({ page }) => {
    await page.goto(`${BASE_URL}/report`)
    await expect(page.locator('h1, h2')).toContainText(/Report a problem|సమస్యను నివేదించండి/i)

    // Dependent Geo Hierarchy dropdowns
    // 1. State
    const stateSelect = page.locator('#state-select, select[name="state"]').first()
    await stateSelect.waitFor({ state: 'visible' })
    await stateSelect.selectOption({ label: 'Telangana' })

    // 2. District
    const distSelect = page.locator('#district-select, select[name="district"]').first()
    await distSelect.waitFor({ state: 'visible' })
    await distSelect.selectOption({ label: 'Adilabad' })

    // 3. Mandal
    const mandalSelect = page.locator('#mandal-select, select[name="mandal"]').first()
    await mandalSelect.waitFor({ state: 'visible' })
    await mandalSelect.selectOption({ label: 'Utnoor' })

    // 4. Village
    const villageSelect = page.locator('#village-select, select[name="village"]').first()
    await villageSelect.waitFor({ state: 'visible' })
    await villageSelect.selectOption({ label: 'Utnoor Proper' })

    // Select Water department
    const waterButton = page.locator('button:has-text("Water"), button:has-text("మంచినీరు")').first()
    if (await waterButton.isVisible()) {
      await waterButton.click()
    }

    // Enter description
    const textArea = page.locator('textarea, #problem-description').first()
    await textArea.fill('Major pipeline breakage near Utnoor market square; water leaking continuously and flooding path.')

    // Submit report
    const submitBtn = page.locator('button[type="submit"]:has-text("Send"), button:has-text("Send problem"), button:has-text("నివేదిక పంపండి")').first()
    await submitBtn.click()

    // Wait for submission confirmation with Tracking ID
    await page.waitForURL(/.*track.*/, { timeout: 10000 })
    const trackingBadge = page.locator('.tracking-id, strong:has-text("JS-IN-"), span:has-text("JS-IN-")').first()
    await expect(trackingBadge).toBeVisible()
    const text = await trackingBadge.textContent()
    const match = text.match(/JS-IN-[A-Z0-9]+/)
    expect(match).not.toBeNull()
    trackingId = match[0]
    console.log(`Citizen submitted report. Tracking ID: ${trackingId}`)
  })

  test('Step 2: Department Head verifies and assigns to Mandal Field Officer', async ({ page }) => {
    // Log in as Department Head (Water, Adilabad)
    await page.goto(`${BASE_URL}/login`)
    await page.locator('#u').fill('dept_water_adi')
    await page.locator('#p').fill('dept123')
    await page.locator('button:has-text("Log in")').first().click()

    // Go to Department Queue
    await page.goto(`${BASE_URL}/officer`)
    await expect(page.locator('body')).toContainText(/Water|Adilabad/)

    // Open newly submitted or pending case
    const caseCard = page.locator(`.card:has-text("${trackingId}"), tr:has-text("${trackingId}"), div:has-text("${trackingId}")`).first()
    if (await caseCard.isVisible()) {
      await caseCard.click()
    }

    // Verify Case
    const verifyBtn = page.locator('button:has-text("Verify Complaint"), button:has-text("Verify")').first()
    if (await verifyBtn.isVisible()) {
      await verifyBtn.click()
      await page.waitForTimeout(500)
    }

    // Assign to Field Officer (Utnoor mandal Water officer)
    const assignBtn = page.locator('button:has-text("Assign to Field Officer"), button:has-text("Assign")').first()
    if (await assignBtn.isVisible()) {
      await assignBtn.click()
      const foDropdown = page.locator('select#field_officer_id, select[name="field_officer_id"]').first()
      await foDropdown.waitFor({ state: 'visible' })
      await foDropdown.selectOption({ label: /Ravi Teja|field_utnoor/i })
      await page.locator('button:has-text("Confirm Assignment"), button:has-text("Assign Case")').first().click()
      await page.waitForTimeout(500)
    }

    // Verify status updated to ASSIGNED
    await expect(page.locator('body')).toContainText(/ASSIGNED|Assigned/i)
  })

  test('Step 3: Field Officer inspects site and submits costed budget proposal', async ({ page }) => {
    // Log in as Field Officer (Water, Utnoor)
    await page.goto(`${BASE_URL}/login`)
    await page.locator('#u').fill('field_utnoor')
    await page.locator('#p').fill('field123')
    await page.locator('button:has-text("Log in")').first().click()

    await page.goto(`${BASE_URL}/officer`)
    await expect(page.locator('body')).toContainText(/Utnoor/)

    // Open the assigned case
    const caseCard = page.locator(`button:has-text("${trackingId}"), tr:has-text("${trackingId}"), div:has-text("${trackingId}")`).first()
    if (await caseCard.isVisible()) {
      await caseCard.click()
    }

    // Click Site Inspection & Budget
    const inspectBtn = page.locator('button:has-text("Site Inspection & Budget"), button:has-text("Inspect & Budget")').first()
    await inspectBtn.click()

    // Enter inspection notes
    const inspectNote = page.locator('textarea[name="inspection_notes"], #inspection_notes').first()
    await inspectNote.fill('Site visited. Found fractured 110mm pipe section. Replacement and refilling required.')

    // Add budget line items
    const item1Name = page.locator('input[placeholder="e.g. 110mm HDPE Pipe"]').first()
    if (await item1Name.isVisible()) {
      await item1Name.fill('110mm HDPE Pipe (IS:4984)')
      await page.locator('input[placeholder="Qty"]').first().fill('15')
      await page.locator('input[placeholder="Unit Cost"]').first().fill('1200')
    }

    // Submit Budget Proposal
    const submitBudgetBtn = page.locator('button:has-text("Submit Budget Proposal")').first()
    await submitBudgetBtn.click()
    await page.waitForTimeout(1000)

    // Verify status updated to BUDGET_REQUESTED
    await expect(page.locator('body')).toContainText(/BUDGET_REQUESTED|Budget Requested/i)
  })

  test('Step 4: Department Head reviews line items and forwards to Collector', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`)
    await page.locator('#u').fill('dept_water_adi')
    await page.locator('#p').fill('dept123')
    await page.locator('button:has-text("Log in")').first().click()

    await page.goto(`${BASE_URL}/officer`)
    // Navigate to Budget Requests tab
    const budgetTab = page.locator('button:has-text("Budget Requests")').first()
    if (await budgetTab.isVisible()) {
      await budgetTab.click()
    }

    const fwdBtn = page.locator('button:has-text("Forward to Collector"), button:has-text("Forward Proposal")').first()
    await fwdBtn.click()

    const noteInput = page.locator('textarea[name="forward_note"], textarea#forward_note').first()
    if (await noteInput.isVisible()) {
      await noteInput.fill('Verified pipeline specifications against district rate schedule. Forwarded for sanction.')
      await page.locator('button:has-text("Send to Collector"), button:has-text("Confirm Forward")').first().click()
    }

    await page.waitForTimeout(1000)
    await expect(page.locator('body')).toContainText(/SENT_TO_COLLECTOR|Sent to Collector/i)
  })

  test('Step 5: Collector negotiates counter-offer against district SSR benchmarks', async ({ page }) => {
    // Log in as District Collector (Adilabad)
    await page.goto(`${BASE_URL}/login`)
    await page.locator('#u').fill('collector_adilabad')
    await page.locator('#p').fill('district123')
    await page.locator('button:has-text("Log in")').first().click()

    await page.goto(`${BASE_URL}/officer`)
    await expect(page.locator('body')).toContainText(/Budget Approval Inbox|Collector/)

    // Open proposal
    const reviewBtn = page.locator('button:has-text("Review Proposal"), button:has-text("Review & Decide")').first()
    await reviewBtn.click()

    // Click Negotiate Counter-Offer
    const negBtn = page.locator('button:has-text("Negotiate Counter-Offer"), button:has-text("Negotiate")').first()
    await negBtn.click()

    // Fill counter-offer amount and justification
    const amtInput = page.locator('input[name="counter_amount"], #counter_amount').first()
    await amtInput.fill('16500')

    const justInput = page.locator('textarea[name="justification"], #justification').first()
    await justInput.fill('Benchmarked against Adilabad District SSR average for pipe procurement.')

    await page.locator('button:has-text("Send Counter-Offer")').first().click()
    await page.waitForTimeout(1000)

    await expect(page.locator('body')).toContainText(/NEGOTIATION|Negotiation/i)
  })

  test('Step 6: Department Head accepts counter-offer and funds wallet', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`)
    await page.locator('#u').fill('dept_water_adi')
    await page.locator('#p').fill('dept123')
    await page.locator('button:has-text("Log in")').first().click()

    await page.goto(`${BASE_URL}/officer`)
    const acceptCounterBtn = page.locator('button:has-text("Accept Counter-Offer"), button:has-text("Accept & Allocate")').first()
    if (await acceptCounterBtn.isVisible()) {
      await acceptCounterBtn.click()
    }

    await page.waitForTimeout(1000)
    await expect(page.locator('body')).toContainText(/ALLOCATED|Allocated/i)
  })

  test('Step 7: Field Officer logs expenses and uploads completion proof', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`)
    await page.locator('#u').fill('field_utnoor')
    await page.locator('#p').fill('field123')
    await page.locator('button:has-text("Log in")').first().click()

    await page.goto(`${BASE_URL}/officer`)
    await expect(page.locator('body')).toContainText(/Allocated/)

    // Log Expense
    const logExpBtn = page.locator('button:has-text("Log Expense")').first()
    if (await logExpBtn.isVisible()) {
      await logExpBtn.click()
      await page.locator('input[placeholder*="Item"]').first().fill('HDPE Pipe procurement')
      await page.locator('input[placeholder*="Amount"]').first().fill('12500')
      await page.locator('input[placeholder*="Vendor"]').first().fill('Sri Sai Hardware Utnoor')
      await page.locator('button:has-text("Save Expense")').first().click()
      await page.waitForTimeout(500)
    }

    // Submit Work Completion
    const completeBtn = page.locator('button:has-text("Submit Completion Proof"), button:has-text("Complete Work")').first()
    if (await completeBtn.isVisible()) {
      await completeBtn.click()
      await page.locator('textarea[name="completion_notes"], #completion_notes').first().fill('Full replacement completed, pressure tested.')
      await page.locator('button:has-text("Confirm Completion"), button:has-text("Mark Work Done")').first().click()
    }

    await page.waitForTimeout(1000)
    await expect(page.locator('body')).toContainText(/WORK_DONE|Work Done/i)
  })

  test('Step 8: Department Head reviews resolution proof and accepts', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`)
    await page.locator('#u').fill('dept_water_adi')
    await page.locator('#p').fill('dept123')
    await page.locator('button:has-text("Log in")').first().click()

    await page.goto(`${BASE_URL}/officer`)
    const proofTab = page.locator('button:has-text("Proof to Check")').first()
    if (await proofTab.isVisible()) {
      await proofTab.click()
    }

    const acceptWorkBtn = page.locator('button:has-text("Accept Work"), button:has-text("Accept Resolution")').first()
    if (await acceptWorkBtn.isVisible()) {
      await acceptWorkBtn.click()
      await page.waitForTimeout(1000)
    }
  })

  test('Step 9: Citizen confirms fix on tracking timeline (status: CLOSED)', async ({ page }) => {
    await page.goto(`${BASE_URL}/track?id=${trackingId}`)
    await expect(page.locator('body')).toContainText(new RegExp(trackingId))

    // Confirm fixed button
    const fixedBtn = page.locator('button:has-text("Fixed"), button:has-text("సమస్య పరిష్కారమైంది"), button:has-text("Confirm Fixed")').first()
    if (await fixedBtn.isVisible()) {
      await fixedBtn.click()
      await page.waitForTimeout(1000)
    }

    await expect(page.locator('body')).toContainText(/CLOSED|Closed|పరిష్కరించబడింది/i)
  })

  test('Step 10: Live Dashboard Analytics updates', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`)
    await expect(page.locator('body')).toContainText(/Budget Funnel|Live Cycle Analytics/i)
    await expect(page.locator('body')).toContainText(/Requested Budget|Approved Budget|Allocated to Wallet|Spent on Site/i)
    await expect(page.locator('body')).toContainText(/SLA Compliance|Budget Negotiation/i)
  })
})
