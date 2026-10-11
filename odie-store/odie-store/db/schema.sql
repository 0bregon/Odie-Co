-- =====================================================================
-- Odie & Co. - Esquema para Supabase (Postgres)
-- Pégalo completo en: Supabase -> SQL Editor -> New query -> Run
-- Es seguro correrlo más de una vez.
-- =====================================================================

create table if not exists products (
  id          bigint generated always as identity primary key,
  name        text not null,
  slug        text not null unique,
  category    text not null,
  description text,
  price       numeric(10,2) not null check (price >= 0),
  image_url   text,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

create table if not exists product_sizes (
  id         bigint generated always as identity primary key,
  product_id bigint not null references products(id) on delete cascade,
  size       text not null,
  stock      integer not null default 0 check (stock >= 0),
  unique (product_id, size)
);

create table if not exists users (
  id            bigint generated always as identity primary key,
  name          text not null,
  email         text not null unique,
  password_hash text not null,
  created_at    timestamptz not null default now()
);

create table if not exists carts (
  id         bigint generated always as identity primary key,
  token      text not null unique,
  user_id    bigint references users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists cart_items (
  id         bigint generated always as identity primary key,
  cart_id    bigint not null references carts(id) on delete cascade,
  product_id bigint not null references products(id) on delete cascade,
  size       text not null,
  quantity   integer not null default 1 check (quantity > 0),
  unique (cart_id, product_id, size)
);

create table if not exists orders (
  id         bigint generated always as identity primary key,
  user_id    bigint not null references users(id),
  total      numeric(10,2) not null,
  status     text not null default 'confirmado',
  created_at timestamptz not null default now()
);

create table if not exists order_items (
  id           bigint generated always as identity primary key,
  order_id     bigint not null references orders(id) on delete cascade,
  product_id   bigint not null,
  product_name text not null,
  size         text not null,
  quantity     integer not null,
  unit_price   numeric(10,2) not null
);

create index if not exists idx_product_sizes_product on product_sizes(product_id);
create index if not exists idx_cart_items_cart       on cart_items(cart_id);
create index if not exists idx_orders_user           on orders(user_id);
create index if not exists idx_order_items_order     on order_items(order_id);

-- ---------------------------------------------------------------------
-- SEGURIDAD: activamos RLS en todas las tablas y NO creamos políticas.
-- Resultado: la clave pública (anon) no puede leer ni escribir nada,
-- ni siquiera la tabla de usuarios. Solo tu servidor, con la clave
-- service_role, puede acceder (esa clave se salta RLS).
-- ---------------------------------------------------------------------
alter table products       enable row level security;
alter table product_sizes  enable row level security;
alter table users          enable row level security;
alter table carts          enable row level security;
alter table cart_items     enable row level security;
alter table orders         enable row level security;
alter table order_items    enable row level security;

-- ---------------------------------------------------------------------
-- Confirmar pedido de forma ATÓMICA (evita vender más de lo que hay).
-- Bloquea las filas de stock, valida, crea el pedido, descuenta y
-- vacía el carrito, todo en una sola transacción.
-- ---------------------------------------------------------------------
create or replace function checkout_order(p_user_id bigint, p_cart_id bigint)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  r         record;
  v_stock   integer;
  v_total   numeric(10,2) := 0;
  v_count   integer := 0;
  v_order   bigint;
begin
  -- 1) Bloquear y validar stock
  for r in
    select ci.product_id, ci.size, ci.quantity, p.name, p.price
    from cart_items ci
    join products p on p.id = ci.product_id and p.active
    where ci.cart_id = p_cart_id
    order by ci.product_id, ci.size
  loop
    select stock into v_stock
    from product_sizes
    where product_id = r.product_id and size = r.size
    for update;

    if v_stock is null or v_stock < r.quantity then
      raise exception 'SIN_STOCK|%|%', r.name, r.size;
    end if;

    v_total := v_total + (r.price * r.quantity);
    v_count := v_count + 1;
  end loop;

  if v_count = 0 then
    raise exception 'CARRITO_VACIO';
  end if;

  -- 2) Crear pedido
  insert into orders (user_id, total) values (p_user_id, v_total)
  returning id into v_order;

  -- 3) Líneas del pedido + descontar stock
  for r in
    select ci.product_id, ci.size, ci.quantity, p.name, p.price
    from cart_items ci
    join products p on p.id = ci.product_id
    where ci.cart_id = p_cart_id
  loop
    insert into order_items (order_id, product_id, product_name, size, quantity, unit_price)
    values (v_order, r.product_id, r.name, r.size, r.quantity, r.price);

    update product_sizes
       set stock = stock - r.quantity
     where product_id = r.product_id and size = r.size;
  end loop;

  -- 4) Vaciar carrito
  delete from cart_items where cart_id = p_cart_id;

  return v_order;
end;
$$;

-- Que solo el servidor (service_role) pueda ejecutarla
revoke all on function checkout_order(bigint, bigint) from public, anon, authenticated;
grant execute on function checkout_order(bigint, bigint) to service_role;
