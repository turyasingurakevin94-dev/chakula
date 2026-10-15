-- Chakula's tables. Safe to run on every start: it only creates what is missing.
-- Money is whole Uganda shillings (integer). Times are timestamptz.

create table if not exists drop_points (
  id text primary key,
  name text not null,
  kind text not null check (kind in ('gate', 'campus', 'hostel'))
);

create table if not exists kitchens (
  id text primary key,
  name text not null,
  cuisine text not null default '',
  tags text not null default '',
  photo text,
  delivery_fee integer not null default 0 check (delivery_fee >= 0),
  minutes integer not null default 15,
  open boolean not null default true,
  -- Shown while closed, e.g. '6:00 pm'.
  opens_at text,
  rating real not null default 0,
  rating_count integer not null default 0,
  sort integer not null default 0
);

create table if not exists dishes (
  kitchen_id text not null references kitchens(id),
  id text not null,
  name text not null,
  description text not null default '',
  category text not null default 'Popular',
  price integer not null check (price >= 0),
  prep_minutes integer not null default 10,
  pepper boolean not null default false,
  photo text,
  sold_out boolean not null default false,
  sort integer not null default 0,
  primary key (kitchen_id, id)
);

create table if not exists dish_extras (
  kitchen_id text not null,
  dish_id text not null,
  id text not null,
  name text not null,
  price integer not null check (price >= 0),
  sold_out boolean not null default false,
  sort integer not null default 0,
  primary key (kitchen_id, dish_id, id),
  foreign key (kitchen_id, dish_id) references dishes(kitchen_id, id)
);

create table if not exists users (
  id text primary key,
  -- +2567XXXXXXXX
  phone text not null unique,
  role text not null check (role in ('student', 'kitchen', 'rider', 'admin')),
  name text,
  -- Which kitchen a kitchen login works for.
  kitchen_id text references kitchens(id),
  drop_point_id text references drop_points(id),
  created_at timestamptz not null default now()
);

-- The latest sign-in code per phone, hashed. Cleared once used.
create table if not exists login_codes (
  phone text primary key,
  code_hash text not null,
  sent_at timestamptz not null,
  expires_at timestamptz not null,
  attempts integer not null default 0
);

create table if not exists sessions (
  token_hash text primary key,
  user_id text not null references users(id),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create table if not exists push_tokens (
  token text primary key,
  user_id text not null references users(id),
  app text not null,
  updated_at timestamptz not null default now()
);

create sequence if not exists order_numbers start 4800;

create table if not exists orders (
  id text primary key,
  -- The short number kitchens, riders and bag stickers use.
  number integer not null unique default nextval('order_numbers'),
  student_id text not null references users(id),
  kitchen_id text not null references kitchens(id),
  drop_point_id text not null references drop_points(id),
  status text not null check (status in ('awaiting_payment', 'cooking', 'ready', 'picked_up', 'at_gate', 'delivered', 'cancelled')),
  pay_method text not null check (pay_method in ('mtn', 'airtel', 'cash')),
  subtotal integer not null,
  delivery_fee integer not null,
  total integer not null,
  -- Said by the student to the rider at the gate.
  handover_code text not null,
  note text,
  rider_id text references users(id),
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  ready_at timestamptz,
  rider_at timestamptz,
  picked_at timestamptz,
  at_gate_at timestamptz,
  delivered_at timestamptz,
  cancelled_at timestamptz,
  cancel_reason text
);
create index if not exists orders_student on orders (student_id, created_at desc);
create index if not exists orders_kitchen on orders (kitchen_id, created_at desc);
create index if not exists orders_rider on orders (rider_id, created_at desc);

create table if not exists order_lines (
  order_id text not null references orders(id),
  line integer not null,
  dish_id text not null,
  name text not null,
  -- Price of one, with its extras, when ordered.
  unit_price integer not null,
  quantity integer not null check (quantity > 0),
  extras jsonb not null default '[]',
  pepper text,
  note text,
  primary key (order_id, line)
);

create table if not exists payments (
  id text primary key,
  order_id text not null references orders(id),
  provider text not null,
  method text not null,
  phone text not null,
  amount integer not null,
  status text not null check (status in ('pending', 'succeeded', 'failed')),
  provider_ref text,
  failure text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists payments_order on payments (order_id);

-- Each rider's last known position. Only the latest is kept.
create table if not exists rider_locations (
  rider_id text primary key references users(id),
  lat double precision not null,
  lng double precision not null,
  at timestamptz not null default now()
);
