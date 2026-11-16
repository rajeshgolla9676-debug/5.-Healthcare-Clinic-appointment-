-- SmartCare Clinic: Supabase schema
-- Run this whole file in Supabase Dashboard > SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text,
  role text not null default 'patient' check (role in ('patient','doctor','admin')),
  doctor_id text,
  created_at timestamptz not null default now()
);

create table if not exists public.doctors (
  id text primary key,
  name text not null,
  speciality text not null,
  department text not null,
  days text not null,
  hours text not null,
  fee integer not null default 0,
  initials text not null default ''
);

insert into public.doctors(id,name,speciality,department,days,hours,fee,initials) values
('doc-ravi','Dr. Ravi Kumar','General Physician','General Medicine','Mon – Sat','9:00 AM – 1:00 PM',300,'RK'),
('doc-priya','Dr. Priya','Dermatologist','Dermatology','Mon – Fri','10:00 AM – 4:00 PM',500,'DP'),
('doc-suresh','Dr. Suresh','Cardiologist','Cardiology','Tue – Sat','9:30 AM – 2:00 PM',700,'DS'),
('doc-anjali','Dr. Anjali','Pediatrician','Pediatrics','Mon – Sat','11:00 AM – 5:00 PM',400,'DA')
on conflict (id) do update set name=excluded.name,speciality=excluded.speciality,department=excluded.department,days=excluded.days,hours=excluded.hours,fee=excluded.fee,initials=excluded.initials;

create table if not exists public.token_counters (
  doctor_id text not null references public.doctors(id),
  appointment_date date not null,
  last_token integer not null default 0,
  primary key (doctor_id, appointment_date)
);

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references auth.users(id) on delete cascade,
  patient_name text not null,
  age integer not null check (age between 1 and 110),
  phone text not null,
  email text,
  doctor_id text not null references public.doctors(id),
  department text not null,
  appointment_date date not null,
  appointment_time text not null,
  reason text,
  token_no integer not null,
  status text not null default 'Waiting' check (status in ('Waiting','Called','Completed','Cancelled')),
  created_at timestamptz not null default now(),
  unique (doctor_id, appointment_date, token_no)
);
create unique index if not exists appointments_no_duplicate_active
on public.appointments(doctor_id, appointment_date, appointment_time, phone)
where status <> 'Cancelled';

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path=public
as $$
begin
  insert into public.profiles(id,full_name,phone)
  values(new.id, coalesce(new.raw_user_meta_data->>'full_name',''), new.raw_user_meta_data->>'phone')
  on conflict (id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path=public
as $$ select exists(select 1 from public.profiles where id=auth.uid() and role='admin') $$;

create or replace function public.is_doctor_for(p_doctor_id text)
returns boolean language sql stable security definer set search_path=public
as $$ select exists(select 1 from public.profiles where id=auth.uid() and role='doctor' and doctor_id=p_doctor_id) $$;

alter table public.profiles enable row level security;
alter table public.doctors enable row level security;
alter table public.appointments enable row level security;
alter table public.token_counters enable row level security;

drop policy if exists "Profiles read own or admin" on public.profiles;
create policy "Profiles read own or admin" on public.profiles for select to authenticated
using (id=auth.uid() or public.is_admin());
drop policy if exists "Doctors visible to everyone" on public.doctors;
create policy "Doctors visible to everyone" on public.doctors for select to anon,authenticated using (true);
drop policy if exists "Patients and assigned staff read appointments" on public.appointments;
create policy "Patients and assigned staff read appointments" on public.appointments for select to authenticated
using (patient_id=auth.uid() or public.is_admin() or public.is_doctor_for(doctor_id));
drop policy if exists "Staff update assigned appointments" on public.appointments;
create policy "Staff update assigned appointments" on public.appointments for update to authenticated
using (public.is_admin() or public.is_doctor_for(doctor_id))
with check (public.is_admin() or public.is_doctor_for(doctor_id));
drop policy if exists "No direct token counter access" on public.token_counters;
create policy "No direct token counter access" on public.token_counters for select to authenticated using (public.is_admin() or public.is_doctor_for(doctor_id));

-- Atomic token allocation: concurrent bookings for the same doctor/date are serialized.
create or replace function public.book_appointment(
  p_patient_name text, p_age integer, p_phone text, p_email text,
  p_doctor_id text, p_department text, p_appointment_date date,
  p_appointment_time text, p_reason text default null
)
returns table(appointment_id uuid, token_no integer)
language plpgsql security definer set search_path=public
as $$
declare v_token integer; v_uid uuid;
begin
  v_uid := auth.uid();
  if v_uid is null then raise exception 'Please sign in before booking.'; end if;
  if length(trim(p_patient_name)) < 2 or p_age < 1 or p_age > 110 then raise exception 'Please check patient name and age.'; end if;
  if p_appointment_date < current_date then raise exception 'Choose today or a future date.'; end if;
  if not exists(select 1 from public.doctors where id=p_doctor_id) then raise exception 'Select a valid doctor.'; end if;
  insert into public.token_counters(doctor_id,appointment_date,last_token)
  values(p_doctor_id,p_appointment_date,0)
  on conflict (doctor_id,appointment_date) do nothing;
  select last_token into v_token from public.token_counters
  where doctor_id=p_doctor_id and appointment_date=p_appointment_date for update;
  v_token := v_token + 1;
  update public.token_counters set last_token=v_token
  where doctor_id=p_doctor_id and appointment_date=p_appointment_date;
  return query
  insert into public.appointments(patient_id,patient_name,age,phone,email,doctor_id,department,appointment_date,appointment_time,reason,token_no)
  values(v_uid,trim(p_patient_name),p_age,trim(p_phone),nullif(trim(p_email),''),p_doctor_id,p_department,p_appointment_date,p_appointment_time,nullif(trim(p_reason),''),v_token)
  returning id, public.appointments.token_no;
end;
$$;

-- Lookup requires both the unpredictable appointment UUID and the patient's phone number.
create or replace function public.lookup_appointment(p_appointment_id uuid, p_phone text)
returns table(appointment_id uuid, doctor_name text, appointment_date date, appointment_time text, token_no integer, status text, patients_ahead integer, currently_called integer)
language sql security definer set search_path=public
as $$
  select a.id,d.name,a.appointment_date,a.appointment_time,a.token_no,a.status,
    case when a.status='Waiting' then greatest(0,
      (select count(*)::integer from public.appointments q
       where q.doctor_id=a.doctor_id and q.appointment_date=a.appointment_date
       and q.token_no<a.token_no and q.status in ('Waiting','Called'))) else 0 end,
    coalesce((select max(q.token_no) from public.appointments q
      where q.doctor_id=a.doctor_id and q.appointment_date=a.appointment_date and q.status='Called'),0)
  from public.appointments a join public.doctors d on d.id=a.doctor_id
  where a.id=p_appointment_id and a.phone=trim(p_phone)
  limit 1;
$$;

grant execute on function public.book_appointment(text,integer,text,text,text,text,date,text,text) to authenticated;
grant execute on function public.lookup_appointment(uuid,text) to anon,authenticated;
grant select on public.doctors to anon,authenticated;
grant select on public.profiles, public.appointments, public.token_counters to authenticated;
grant update(status) on public.appointments to authenticated;
