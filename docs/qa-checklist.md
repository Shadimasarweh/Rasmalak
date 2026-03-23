# Rasmalak QA Checklist

## Pre-Deployment Verification

### Build Verification
- [ ] `npm run build` completes without errors
- [ ] No TypeScript errors
- [ ] No console warnings about missing dependencies

---

## Functional Testing

### Authentication Flow

#### Signup
- [ ] Signup page loads correctly
- [ ] Form validation works (name required, email format, password length)
- [ ] Password strength indicator updates correctly
- [ ] Successful signup redirects to **/onboarding** (not dashboard)
- [ ] Error messages display correctly for duplicate email

#### Onboarding (Personalization Flow)
- [ ] Onboarding page loads after signup
- [ ] Starts in **Arabic by default**
- [ ] Progress bar updates correctly (3 steps)
- [ ] **Language toggle button** visible in header (shows "English" in Arabic mode)
- [ ] Clicking language toggle switches UI immediately (Arabic ↔ English)
- [ ] **Step 1 - Segment**: Individual / Self-employed / SME cards display correctly
- [ ] Segment selection required to proceed
- [ ] **Step 2 - Topics**: Multi-select chips for financial topics
- [ ] Topics step is optional (can proceed with none selected)
- [ ] **Step 3 - Insights**: Multi-select cards for preferred insights
- [ ] Insights step is optional (can proceed with none selected)
- [ ] "Skip" button completes onboarding with defaults
- [ ] "Next" button advances steps
- [ ] "Back" button returns to previous step
- [ ] Completing onboarding redirects to dashboard
- [ ] Re-visiting /onboarding when already onboarded → redirects to dashboard
- [ ] Onboarding data persists in localStorage after completion

#### Login
- [ ] Login page loads correctly
- [ ] Form validation works
- [ ] Successful login redirects to dashboard (if onboarded) or onboarding
- [ ] Error messages display for invalid credentials
- [ ] "Forgot password" link works

#### Logout
- [ ] Logout clears session
- [ ] Redirects to login page
- [ ] Protected pages redirect to login when not authenticated

---

### Dashboard

#### KPI Cards
- [ ] Balance card shows correct value
- [ ] Income card shows correct value
- [ ] Expenses card shows correct value
- [ ] Percentage changes display correctly

#### Budget Widget (New Feature)
- [ ] Budget progress bar displays correctly
- [ ] "Set Budget" button navigates to /budget page
- [ ] "Edit" button navigates to /budget page when budget exists
- [ ] Budget remaining calculation is correct
- [ ] Over-budget warning displays when exceeded
- [ ] Near-budget warning displays at 80%+

#### Recent Transactions
- [ ] Transactions list displays correctly
- [ ] Transaction click opens detail modal
- [ ] Edit button navigates to edit page
- [ ] Delete button shows confirmation
- [ ] Delete confirmation works

#### Charts
- [ ] Top spending bar chart renders
- [ ] Expense breakdown donut chart renders
- [ ] Tooltips work on hover

---

### Budget Settings Page (New Feature)

- [ ] Page loads correctly from dashboard button
- [ ] Back button returns to dashboard
- [ ] Monthly budget input works
- [ ] Category budget inputs work
- [ ] Total category budget displays correctly
- [ ] Warning shows when category totals exceed monthly budget
- [ ] Save button saves data and redirects
- [ ] Reset button clears all values
- [ ] Saved values persist after page refresh

---

### Transactions

#### Transactions List
- [ ] Page loads correctly
- [ ] Search functionality works
- [ ] Filter by type works (All/Income/Expense)
- [ ] Chart view selector works (Daily/Weekly/Monthly)
- [ ] Transaction items display correctly
- [ ] Click on transaction shows options

#### Add Transaction
- [ ] "Add" button navigates to new transaction page
- [ ] Type selector works (Income/Expense)
- [ ] Amount input works
- [ ] Category picker works
- [ ] Date picker works
- [ ] Description (optional) works
- [ ] Currency selector works
- [ ] Save creates transaction
- [ ] Transaction appears in list

#### Edit Transaction
- [ ] Edit page loads with existing data
- [ ] Changes save correctly
- [ ] Cancel returns without saving

---

### Learn Page
- [ ] Page loads correctly
- [ ] Category tabs work
- [ ] Content tabs work (Articles/Videos/Courses)
- [ ] Learning paths display correctly
- [ ] Progress indicators show correctly

---

### Calculators Page
- [ ] Page loads correctly
- [ ] Calculator tabs work (Loan/Savings/Home)
- [ ] Loan calculator computes correctly
- [ ] Savings calculator computes correctly
- [ ] Home affordability calculator computes correctly

---

### Settings Page
- [ ] Page loads correctly
- [ ] Name change works
- [ ] Currency change works and persists
- [ ] Language change works and persists
- [ ] Theme toggle works
- [ ] All changes persist after refresh

---

## Language & Localization

### Arabic (RTL)
- [ ] Layout is correctly mirrored
- [ ] Text reads right-to-left
- [ ] Icons/arrows point correctly
- [ ] Numbers display correctly
- [ ] Date formatting is correct (ar-SA locale)
- [ ] No English text in Arabic mode (except brand names)
- [ ] Arabic copy reads naturally (not translated)

### English (LTR)
- [ ] Layout is correctly left-to-right
- [ ] Text reads left-to-right
- [ ] Icons/arrows point correctly
- [ ] Date formatting is correct (en-US locale)
- [ ] No Arabic text in English mode (except brand elements)

### Language Switch
- [ ] Switching language updates immediately
- [ ] No layout shift during switch
- [ ] Preference persists after refresh
- [ ] First paint matches stored preference (no flash)

---

## Theme Testing

### Light Theme
- [ ] All pages render correctly
- [ ] Contrast is readable
- [ ] No invisible elements

### Dark Theme
- [ ] All pages render correctly
- [ ] Contrast is readable
- [ ] No invisible elements
- [ ] No light theme flash on load

---

## Mobile Responsiveness

### Mobile View (< 768px)
- [ ] Bottom navigation appears
- [ ] Sidebar is hidden
- [ ] Content fits without horizontal scroll
- [ ] Touch targets are adequate size
- [ ] Forms are usable
- [ ] Modals display correctly

### Tablet View (768px - 1024px)
- [ ] Layout adjusts appropriately
- [ ] Sidebar may show/hide appropriately

### Desktop View (> 1024px)
- [ ] Sidebar is visible
- [ ] Bottom nav is hidden
- [ ] Content uses full width appropriately

---

## Performance

- [ ] Pages load within 3 seconds
- [ ] No excessive re-renders (check React DevTools)
- [ ] No memory leaks on navigation
- [ ] Images/icons load correctly

---

## Accessibility

- [ ] Focus states are visible
- [ ] Form labels are associated correctly
- [ ] Error messages are announced
- [ ] Color contrast meets WCAG AA
- [ ] Interactive elements are keyboard accessible

---

## Browser Testing

- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

---

## Notes

Date tested: _______________
Tester: _______________
Version: _______________

### Issues Found:
1. 
2. 
3. 

### Recommendations:
1. 
2. 
3. 


