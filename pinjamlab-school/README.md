# PinjamLab — Sistem Peminjaman Alat Praktik Sekolah

Starter project frontend HTML, CSS, JavaScript dengan GitHub Pages + Supabase.
Tidak membutuhkan XAMPP, Node.js, atau MySQL di komputer sekolah.

## Fitur yang disiapkan
- Form siswa tanpa akun: nama, kelas, keperluan, tanggal pinjam, tanggal rencana kembali.
- Kelas otomatis menentukan kategori alat:
  - TKJ dan ACP -> TKJ
  - TSM -> TSM
  - AKL -> AKL
- Keranjang beberapa jenis alat dalam satu pengajuan, masing-masing dengan jumlah.
- Data permohonan masuk ke Supabase.
- Login admin, daftar permohonan, setujui/tolak, catat alat diambil, konfirmasi pengembalian.
- Status transaksi dan pergerakan stok dicatat di database.
- Persetujuan memeriksa benturan peminjaman pada rentang tanggal terhadap stok total.

## PENTING: belum siap dipakai resmi sebelum setup dan pengujian
File ini adalah starter yang perlu dihubungkan ke project Supabase milik sekolah, diberi stok nyata, dibuatkan akun admin, dan diuji. Jangan mengumumkan website sebagai layanan resmi sebelum langkah-langkah tersebut selesai.

## A. Buat backend/database online Supabase
1. Buat project di https://supabase.com/ (gunakan email pengelola sekolah, bukan akun pribadi siswa bila akan dipakai resmi).
2. Buka SQL Editor > New query.
3. Salin seluruh isi `supabase/schema.sql`, jalankan.
4. Buka Project Settings > API. Salin Project URL dan publishable key (atau anon key lama).
5. Buka `app.js`, isi:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   Publishable/anon key memang digunakan di frontend; keamanan harus berasal dari RLS dan fungsi database. JANGAN pernah menaruh `service_role` / secret key di frontend.

## B. Buat akun admin
1. Supabase > Authentication > Users > Add user.
2. Buat email dan password kuat untuk petugas sekolah.
3. Salin UUID user tersebut.
4. Di SQL Editor jalankan (ganti nilai contoh):
   ```sql
   insert into public.admin_profiles(user_id,display_name,role)
   values ('UUID-USER-ADMIN','Admin Sekolah','admin');
   ```
5. Batasi akun admin kepada petugas yang berwenang. Aktifkan MFA jika tersedia dan gunakan password unik.

## C. Masukkan stok sebenarnya
Seed alat awal memiliki stok 0 dengan sengaja karena jumlah fisik belum diketahui.
1. Buka Table Editor > equipment.
2. Untuk setiap alat, ubah `total_stock` dan `available_stock` sesuai inventaris nyata.
3. Periksa ejaan, kondisi, dan jumlah bersama petugas lab.
4. Jangan mengira angka contoh sebagai stok sekolah.

## D. Uji sebelum dipakai
- Coba pengajuan dari setiap kategori kelas: TKJ, ACP, TSM, AKL.
- Pastikan kelas TKJ/ACP hanya melihat alat TKJ; TSM hanya TSM; AKL hanya AKL.
- Coba jumlah 0, jumlah lebih besar dari stok, tanggal lampau, dan tanggal kembali sebelum tanggal pinjam.
- Coba dua permohonan yang berebut stok pada tanggal yang sama.
- Pastikan admin saja yang bisa membaca daftar peminjaman dan mengubah status.
- Coba persetujuan, catat diambil, dan konfirmasi kembali.
- Uji di HP dan komputer sekolah.
- Siapkan prosedur cadangan manual jika internet atau layanan online bermasalah.

## E. Hosting frontend di GitHub Pages
1. Buat repository GitHub, misalnya `pinjamlab-sekolah`.
2. Upload `index.html`, `style.css`, `app.js` (serta README bila perlu) ke root repository.
3. Repository > Settings > Pages.
4. Pilih Deploy from a branch, branch `main`, folder `/ (root)`, Save.
5. Tunggu GitHub Pages menerbitkan alamat `https://USERNAME.github.io/pinjamlab-sekolah/`.
6. Jika memakai domain sendiri, tambahkan domain di Pages lalu atur DNS sesuai petunjuk GitHub. Jangan membuat record DNS berdasarkan tebakan.

## Catatan keamanan dan operasional
- Supabase adalah backend/database online; GitHub Pages hanya meng-host file frontend.
- Siswa tidak punya akun. Fungsi `submit_borrow_request` hanya menerima permohonan dan tidak memberi akses baca tabel transaksi.
- Admin menggunakan Supabase Auth. Jangan bagikan akun admin.
- Tanggal kembali yang diisi siswa adalah tanggal rencana; tanggal aktual dicatat ketika admin mengonfirmasi alat diterima.
- Pengajuan berstatus pending tidak langsung mengurangi stok. Stok fisik berkurang ketika admin mencatat alat sudah diambil, dan bertambah ketika pengembalian dikonfirmasi.
- Lakukan backup database berkala dan tinjau pengaturan backup/retensi pada paket Supabase yang dipakai.
- Untuk penggunaan resmi, minta persetujuan kepala program/guru penanggung jawab, tentukan penanggung jawab akun, kebijakan data siswa, dan prosedur saat koneksi internet mati.
- Implementasi ini belum mencakup pengelolaan stok rusak/hilang, lampiran foto, notifikasi WhatsApp/email, ekspor Excel/PDF, atau audit log perubahan admin. Fitur tersebut dapat ditambahkan setelah kebutuhan sekolah disepakati.
