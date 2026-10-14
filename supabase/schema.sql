-- =====================================================================
-- RUANG SURVEY - Skema Supabase. Jalankan SEKALI di SQL Editor (project baru).
-- =====================================================================

create table responden (
  id_responden  bigint generated always as identity primary key,
  nama          text check (char_length(nama) <= 100),
  umur          int  not null check (umur between 5 and 120),
  jenis_kelamin text not null check (jenis_kelamin in ('Laki-laki','Perempuan')),
  pekerjaan     text not null check (char_length(pekerjaan) <= 100),
  created_at    timestamptz not null default now()
);

create table survey_jawaban (
  id_jawaban           bigint generated always as identity primary key,
  id_responden         bigint not null references responden(id_responden) on delete cascade,
  platform_utama       text not null check (platform_utama in ('WhatsApp','Instagram','TikTok','Facebook','YouTube','X','Telegram','Threads','Lainnya')),
  durasi_harian        text not null check (durasi_harian in ('Kurang dari 1 jam','1-2 jam','3-4 jam','5-6 jam','Lebih dari 6 jam')),
  tujuan_utama         text not null check (tujuan_utama in ('Komunikasi','Hiburan','Pendidikan','Pekerjaan','Bisnis','Mencari Informasi','Mengikuti Berita','Lainnya')),
  frekuensi            text not null check (frekuensi in ('1-2 kali','3-5 kali','6-10 kali','Lebih dari 10 kali','Hampir setiap saat')),
  bantu_informasi      text not null check (bantu_informasi in ('Sangat Membantu','Membantu','Cukup Membantu','Tidak Membantu')),
  ganggu_produktivitas text not null check (ganggu_produktivitas in ('Sangat Mengganggu','Mengganggu','Kadang-kadang','Tidak Mengganggu')),
  pengaruh_kehidupan   text not null check (pengaruh_kehidupan in ('Sangat Positif','Positif','Netral','Negatif','Sangat Negatif')),
  saran                text check (char_length(saran) <= 2000),
  created_at           timestamptz not null default now()
);

create table galeri (
  id_galeri  bigint generated always as identity primary key,
  judul      text not null check (char_length(judul) <= 200),
  deskripsi  text check (char_length(deskripsi) <= 1000),
  gambar     text not null,
  created_at timestamptz not null default now()
);

create table kontak (
  id_kontak  bigint generated always as identity primary key,
  nama       text not null check (char_length(nama)   <= 100),
  email      text not null check (char_length(email)  <= 100),
  subjek     text not null check (char_length(subjek) <= 200),
  isi        text not null check (char_length(isi)    <= 2000),
  status     text not null default 'baru' check (status in ('baru','dibaca','dibalas')),
  created_at timestamptz not null default now()
);

create table artikel (
  id_artikel bigint generated always as identity primary key,
  judul      text not null check (char_length(judul) <= 200),
  tipe       text not null check (tipe in ('link','file')),
  link       text,
  file       text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------
alter table responden      enable row level security;
alter table survey_jawaban enable row level security;
alter table galeri         enable row level security;
alter table kontak         enable row level security;
alter table artikel        enable row level security;

-- Publik (anon): baca galeri & artikel, kirim pesan kontak
create policy "publik baca galeri"  on galeri  for select using (true);
create policy "publik baca artikel" on artikel for select using (true);
create policy "publik kirim kontak" on kontak  for insert to anon, authenticated
  with check (status = 'baru');

-- Admin (user yang login): akses penuh
create policy "admin galeri"    on galeri         for all to authenticated using (true) with check (true);
create policy "admin artikel"   on artikel        for all to authenticated using (true) with check (true);
create policy "admin kontak"    on kontak         for all to authenticated using (true) with check (true);
create policy "admin responden" on responden      for all to authenticated using (true) with check (true);
create policy "admin jawaban"   on survey_jawaban for all to authenticated using (true) with check (true);

-- ---------------------------------------------------------------------
-- Kirim survey: satu transaksi (pengganti proses-survey.php + rollback manual)
-- Pengunjung TIDAK bisa membaca/menulis tabel responden langsung.
-- ---------------------------------------------------------------------
create function submit_survey(
  p_nama text, p_umur int, p_jk text, p_pekerjaan text,
  p_platform text, p_durasi text, p_tujuan text, p_frekuensi text,
  p_bantu text, p_ganggu text, p_pengaruh text, p_saran text
) returns void
language plpgsql security definer set search_path = public as $$
declare v_id bigint;
begin
  insert into responden(nama, umur, jenis_kelamin, pekerjaan)
  values (nullif(trim(p_nama), ''), p_umur, p_jk, trim(p_pekerjaan))
  returning id_responden into v_id;

  insert into survey_jawaban(id_responden, platform_utama, durasi_harian, tujuan_utama,
    frekuensi, bantu_informasi, ganggu_produktivitas, pengaruh_kehidupan, saran)
  values (v_id, p_platform, p_durasi, p_tujuan, p_frekuensi, p_bantu, p_ganggu,
    p_pengaruh, nullif(trim(p_saran), ''));
end $$;
revoke all on function submit_survey from public;
grant execute on function submit_survey to anon, authenticated;

-- ---------------------------------------------------------------------
-- Statistik publik untuk beranda (hanya angka agregat, bukan data responden)
-- ---------------------------------------------------------------------
create function public_stats() returns json
language sql stable security definer set search_path = public as $$
  select json_build_object(
    'total',            (select count(*) from responden),
    'popular',          coalesce((select platform_utama from survey_jawaban
                                  group by platform_utama order by count(*) desc, platform_utama limit 1), '-'),
    'positive_percent', coalesce((select round(100.0 * count(*) filter (where pengaruh_kehidupan in ('Sangat Positif','Positif')) / nullif(count(*),0))
                                  from survey_jawaban), 0),
    'daily',            (select count(*) from survey_jawaban where frekuensi = 'Hampir setiap saat')
  );
$$;
revoke all on function public_stats from public;
grant execute on function public_stats to anon, authenticated;

-- ---------------------------------------------------------------------
-- Storage: bucket publik untuk baca, hanya admin yang boleh upload/ubah/hapus
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('galeri',  'galeri',  true, 5242880,
    array['image/jpeg','image/png','image/webp','image/gif']),
  ('artikel', 'artikel', true, 10485760,
    array['application/pdf','application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-powerpoint',
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'])
on conflict (id) do nothing;

create policy "admin upload storage" on storage.objects for insert to authenticated
  with check (bucket_id in ('galeri','artikel'));
create policy "admin ubah storage" on storage.objects for update to authenticated
  using (bucket_id in ('galeri','artikel'));
create policy "admin hapus storage" on storage.objects for delete to authenticated
  using (bucket_id in ('galeri','artikel'));
