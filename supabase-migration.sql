-- =============================================
-- PESCATURISMO — SUPABASE MIGRATION
-- =============================================

-- 1. PROFILES (linked to auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  nombre TEXT,
  avatar_url TEXT,
  rol TEXT NOT NULL DEFAULT 'pendiente'
    CHECK (rol IN ('admin', 'staff', 'client', 'pendiente')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nombre, avatar_url, rol)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', ''),
    'pendiente'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. DISPONIBILIDAD
CREATE TABLE IF NOT EXISTS disponibilidad (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha DATE NOT NULL,
  modalidad TEXT NOT NULL CHECK (modalidad IN ('manana', 'tarde')),
  plazas_totales INT NOT NULL DEFAULT 4,
  plazas_reservadas INT NOT NULL DEFAULT 0,
  estado TEXT NOT NULL DEFAULT 'disponible'
    CHECK (estado IN ('disponible', 'completo', 'cancelado')),
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(fecha, modalidad)
);

-- 3. RESERVAS
CREATE TABLE IF NOT EXISTS reservas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  disponibilidad_id UUID REFERENCES disponibilidad(id) ON DELETE SET NULL,
  nombre TEXT NOT NULL,
  email TEXT NOT NULL,
  telefono TEXT NOT NULL,
  personas INT NOT NULL DEFAULT 1,
  mensaje TEXT,
  estado_pago TEXT NOT NULL DEFAULT 'pendiente'
    CHECK (estado_pago IN ('pendiente', 'pagado', 'reembolsado', 'error')),
  redsys_order TEXT,
  importe_cents INT NOT NULL DEFAULT 0,
  user_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE disponibilidad ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservas ENABLE ROW LEVEL SECURITY;

-- Helper: get current user's role
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT AS $$
  SELECT rol FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- PROFILES policies
CREATE POLICY "profiles_read_own" ON profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "profiles_read_admin" ON profiles
  FOR SELECT USING (get_my_role() IN ('admin'));

CREATE POLICY "profiles_update_admin" ON profiles
  FOR UPDATE USING (get_my_role() = 'admin');

-- DISPONIBILIDAD policies
-- Public read for calendar (available slots only)
CREATE POLICY "disponibilidad_public_read" ON disponibilidad
  FOR SELECT USING (true);

-- Admin/staff can insert/update/delete
CREATE POLICY "disponibilidad_admin_insert" ON disponibilidad
  FOR INSERT WITH CHECK (get_my_role() IN ('admin', 'staff'));

CREATE POLICY "disponibilidad_admin_update" ON disponibilidad
  FOR UPDATE USING (get_my_role() IN ('admin', 'staff'));

CREATE POLICY "disponibilidad_admin_delete" ON disponibilidad
  FOR DELETE USING (get_my_role() IN ('admin', 'staff'));

-- RESERVAS policies
-- Admin/staff can read all
CREATE POLICY "reservas_admin_read" ON reservas
  FOR SELECT USING (get_my_role() IN ('admin', 'staff'));

-- Clients can read their own
CREATE POLICY "reservas_client_read" ON reservas
  FOR SELECT USING (
    user_id = auth.uid()
    OR email = (SELECT email FROM profiles WHERE id = auth.uid())
  );

-- Anyone can insert (public booking form)
CREATE POLICY "reservas_public_insert" ON reservas
  FOR INSERT WITH CHECK (true);

-- Admin can update (payment status etc.)
CREATE POLICY "reservas_admin_update" ON reservas
  FOR UPDATE USING (get_my_role() = 'admin');

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX IF NOT EXISTS idx_disponibilidad_fecha ON disponibilidad(fecha);
CREATE INDEX IF NOT EXISTS idx_disponibilidad_estado ON disponibilidad(estado);
CREATE INDEX IF NOT EXISTS idx_reservas_disponibilidad ON reservas(disponibilidad_id);
CREATE INDEX IF NOT EXISTS idx_reservas_email ON reservas(email);
CREATE INDEX IF NOT EXISTS idx_reservas_redsys_order ON reservas(redsys_order);
