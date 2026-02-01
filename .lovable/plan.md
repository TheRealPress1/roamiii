

# Auto-Calculate "Split Between X People" from Trip Members

This plan removes the manual split input and automatically calculates the per-person cost based on the actual number of trip members.

---

## Current State

The `CreateProposalModal` component currently:
- Has a manual input field for "Split between X people" (default: 4)
- Uses this value to calculate `costPerPerson = totalCost / attendeeCount`
- The parent `TripChat.tsx` already has `members` data from `useTripData` hook

---

## Solution: Pass Member Count as Prop

Since `TripChat.tsx` already fetches members via `useTripData`, we'll pass the member count to the modal rather than making a duplicate query.

### Changes Overview

| File | Action | Description |
|------|--------|-------------|
| `src/components/proposal/CreateProposalModal.tsx` | Update | Add `memberCount` prop, remove manual input, auto-calculate split |
| `src/pages/TripChat.tsx` | Update | Pass `memberCount={members.length}` to the modal |

---

## Implementation Details

### 1. Update CreateProposalModal Props

**File:** `src/components/proposal/CreateProposalModal.tsx`

Add new prop to interface:

```typescript
interface CreateProposalModalProps {
  open: boolean;
  onClose: () => void;
  tripId: string;
  onCreated: () => void;
  memberCount: number;  // NEW: Auto-populated from trip members
}
```

### 2. Remove Manual Attendee Input State

Remove:
```typescript
const [attendeeCount, setAttendeeCount] = useState('4');
```

Replace with derived value:
```typescript
// Use member count from props, minimum of 1
const splitCount = Math.max(memberCount, 1);
```

### 3. Update Cost Per Person Calculation

Change from:
```typescript
const costPerPerson = attendeeCount ? Math.round(totalCost / parseInt(attendeeCount)) : 0;
```

To:
```typescript
const costPerPerson = Math.round(totalCost / splitCount);
```

### 4. Replace Manual Input with Static Text

**Current UI (lines 303-314):**
```text
┌─────────────────────────────────────────────────────┐
│ Split between [ 4 ] people          Est. per person │
│                                           $XXX      │
└─────────────────────────────────────────────────────┘
```

**New UI:**
```text
┌─────────────────────────────────────────────────────┐
│ Split: 4 members                    Est. per person │
│                                           $XXX      │
└─────────────────────────────────────────────────────┘
```

Replace the input section with:
```tsx
<div className="flex items-center gap-2">
  <span className="text-sm text-muted-foreground">
    Split: {splitCount} {splitCount === 1 ? 'member' : 'members'}
  </span>
</div>
```

### 5. Update Reset Form Function

Remove `attendeeCount` from `resetForm()` since it's no longer state.

### 6. Update Proposal Insert

Change:
```typescript
attendee_count: parseInt(attendeeCount) || 1,
```

To:
```typescript
attendee_count: splitCount,
```

### 7. Update TripChat to Pass Member Count

**File:** `src/pages/TripChat.tsx`

Update modal invocation:
```tsx
<CreateProposalModal
  open={proposalModalOpen}
  onClose={() => setProposalModalOpen(false)}
  tripId={tripId!}
  onCreated={() => {
    setProposalModalOpen(false);
    refetch();
  }}
  memberCount={members.length}  // NEW
/>
```

---

## Edge Cases Handled

| Scenario | Handling |
|----------|----------|
| Member count is 0 (impossible but defensive) | `Math.max(memberCount, 1)` ensures minimum of 1 |
| Modal opened before members loaded | Parent waits for loading to complete before rendering modal |
| Members change while modal is open | Props update automatically; per-person recalculates |

---

## Visual Comparison

**Before:**
```text
┌─────────────────────────────────────────────────────┐
│ Cost Estimator                                      │
├─────────────────────────────────────────────────────┤
│ Lodging Total    Transport                          │
│ [$ 1200      ]   [$ 400       ]                     │
│ Food             Activities                         │
│ [$ 300       ]   [$ 200       ]                     │
├─────────────────────────────────────────────────────┤
│ Split between [4] people          Est. per person   │
│ ────────────────────────                 $525       │
└─────────────────────────────────────────────────────┘
                  ↑
        Manual editable input
```

**After:**
```text
┌─────────────────────────────────────────────────────┐
│ Cost Estimator                                      │
├─────────────────────────────────────────────────────┤
│ Lodging Total    Transport                          │
│ [$ 1200      ]   [$ 400       ]                     │
│ Food             Activities                         │
│ [$ 300       ]   [$ 200       ]                     │
├─────────────────────────────────────────────────────┤
│ Split: 4 members                  Est. per person   │
│                                          $525       │
└─────────────────────────────────────────────────────┘
        ↑
   Static text from actual member count
```

---

## Acceptance Criteria

1. No manual "split between X people" input field in the modal
2. Per-person estimate automatically uses actual trip member count
3. If member count changes (e.g., someone joins), the calculation updates
4. Saved proposal has correct `attendee_count` matching member count
5. Works correctly with 1, 2, or many members

