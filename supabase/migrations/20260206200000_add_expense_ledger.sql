-- Create trip_expenses table
CREATE TABLE public.trip_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  paid_by UUID NOT NULL REFERENCES public.profiles(id),
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  description TEXT NOT NULL,
  category TEXT CHECK (category IN ('food', 'transport', 'housing', 'activity', 'other')) DEFAULT 'other',
  receipt_url TEXT,
  expense_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create expense_splits table
CREATE TABLE public.expense_splits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id UUID NOT NULL REFERENCES public.trip_expenses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  amount DECIMAL(10,2) NOT NULL,
  is_settled BOOLEAN DEFAULT false,
  settled_at TIMESTAMPTZ,
  UNIQUE(expense_id, user_id)
);

-- Create indexes for performance
CREATE INDEX idx_trip_expenses_trip ON public.trip_expenses(trip_id);
CREATE INDEX idx_trip_expenses_paid_by ON public.trip_expenses(paid_by);
CREATE INDEX idx_trip_expenses_date ON public.trip_expenses(expense_date);
CREATE INDEX idx_expense_splits_expense ON public.expense_splits(expense_id);
CREATE INDEX idx_expense_splits_user ON public.expense_splits(user_id);
CREATE INDEX idx_expense_splits_unsettled ON public.expense_splits(is_settled) WHERE is_settled = false;

-- Enable RLS
ALTER TABLE public.trip_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_splits ENABLE ROW LEVEL SECURITY;

-- RLS Policies for trip_expenses
CREATE POLICY "Members can view trip expenses" ON public.trip_expenses
FOR SELECT USING (is_trip_member(trip_id, auth.uid()));

CREATE POLICY "Members can create expenses" ON public.trip_expenses
FOR INSERT WITH CHECK (
  is_trip_member(trip_id, auth.uid()) AND
  paid_by = auth.uid()
);

CREATE POLICY "Users can update own expenses" ON public.trip_expenses
FOR UPDATE USING (paid_by = auth.uid());

CREATE POLICY "Users can delete own expenses" ON public.trip_expenses
FOR DELETE USING (paid_by = auth.uid());

-- RLS Policies for expense_splits
CREATE POLICY "Members can view expense splits" ON public.expense_splits
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.trip_expenses e
    WHERE e.id = expense_id AND is_trip_member(e.trip_id, auth.uid())
  )
);

CREATE POLICY "Expense creators can manage splits" ON public.expense_splits
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.trip_expenses e
    WHERE e.id = expense_id AND e.paid_by = auth.uid()
  )
);

CREATE POLICY "Users can update splits they owe" ON public.expense_splits
FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Expense creators can delete splits" ON public.expense_splits
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.trip_expenses e
    WHERE e.id = expense_id AND e.paid_by = auth.uid()
  )
);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.trip_expenses;
ALTER PUBLICATION supabase_realtime ADD TABLE public.expense_splits;
