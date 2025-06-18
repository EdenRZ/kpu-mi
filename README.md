# 🗳️ KPU Monasmuda Institute - Sistem Pemilihan Digital

![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)
![GitHub repo size](https://img.shields.io/github/repo-size/[username]/[repo-name])
![GitHub last commit](https://img.shields.io/github/last-commit/[username]/[repo-name])

Sistem pemilihan digital yang modern dan aman untuk mendukung proses demokrasi di lingkungan akademik Monasmuda Institute.

## � Fitur Utama

### Untuk Pemilih
- **Proses Voting Intuitif**: Step-by-step wizard dengan 4 tahap pemilihan
- **Sistem "One Vote One Value"**: Distribusi 20 suara per kategori sesuai preferensi
- **Responsive Design**: Berfungsi optimal di semua perangkat
- **Real-time Feedback**: Validasi dan counter suara langsung

### Untuk Administrator
- **Dashboard Real-time**: Monitor hasil pemilihan secara langsung
- **Manajemen User**: Kelola data pemilih dan kredensial
- **Kontrol Pemilihan**: Atur status dan periode pemilihan
- **Export Data**: Unduh hasil dalam format Excel/CSV
- **Audit Trail**: Log aktivitas untuk transparansi

## 🗳️ Sistem Pemilihan

### Kategori Pemilihan
1. **Presiden & Wakil Presiden** - 2 pasangan calon
2. **Perdana Menteri** - 2 kandidat individual
3. **Ketua Parlemen** - 4 kandidat individual

### Alur Voting
- Login dengan kredensial yang diberikan
- Distribusikan 20 suara per kategori sesuai preferensi
- Review dan konfirmasi pilihan
- Terima konfirmasi voting berhasil

## 🔧 Teknologi

- **Frontend**: HTML5, Tailwind CSS, JavaScript
- **Backend**: PHP, MySQL
- **Server**: Apache (XAMPP) atau Node.js
- **Database**: MySQL dengan API PHP

## 🚀 Instalasi & Setup

### Metode 1: Quick Setup (Recommended)
1. **Install XAMPP** dan jalankan Apache + MySQL
2. **Clone repository** ke folder `htdocs`
   ```bash
   cd C:\xampp\htdocs
   git clone [repository-url] kpu-monasmuda
   cd kpu-monasmuda
   ```
3. **Setup database otomatis**
   ```bash
   # Via browser
   http://localhost/kpu-monasmuda/deploy.php?deploy=true

   # Atau via command line
   php deploy.php
   ```
4. **Akses aplikasi**
   - Main site: `http://localhost/kpu-monasmuda`
   - Admin panel: `http://localhost/kpu-monasmuda/admin-login.html`

### Metode 2: Manual Setup
1. **Install XAMPP** dan jalankan Apache + MySQL
2. **Clone repository** ke folder `htdocs`
3. **Setup database manual**
   - Buka phpMyAdmin: `http://localhost/phpmyadmin`
   - Import file: `database/setup.sql`
   - Atau jalankan: `mysql -u root -p < database/setup.sql`
4. **Konfigurasi database** (opsional)
   - Edit `database/config.php` untuk custom settings
5. **Test koneksi**
   - Akses: `http://localhost/kpu-monasmuda/api/index.php?action=health_check`

### Metode 3: Node.js Development Server
1. **Install dependencies**
   ```bash
   npm install
   ```
2. **Setup database** (gunakan Metode 1 atau 2)
3. **Jalankan development server**
   ```bash
   npm start
   ```
4. **Akses melalui** `http://localhost:3000`

## 💾 Database

### Struktur Database
- **users**: Data pemilih dan kredensial
- **candidates**: Data kandidat dan foto
- **votes**: Record suara yang masuk
- **activity_log**: Log aktivitas sistem
- **admin_users**: Data administrator
- **election_settings**: Pengaturan pemilihan

### Default Login
- **Admin**: username=`admin`, password=`admin123`
- **Sample Users**: username=`ahmad001`, password=`password123`

### Database Management
```bash
# Cek status migrasi
php database/migrate.php status

# Jalankan migrasi
php database/migrate.php migrate

# Reset database (HATI-HATI!)
php database/migrate.php reset
```

## 🔐 Keamanan

- Validasi input pada semua form
- Konfirmasi sebelum submit voting
- Admin panel dengan akses terbatas
- Audit trail untuk tracking aktivitas
- Enkripsi data sensitif
- Session management yang aman

## 📱 Responsive Design

Fully responsive untuk semua perangkat:
- Mobile: < 768px
- Tablet: 768px - 1024px
- Desktop: > 1024px

## � Struktur Project

```
kpu-monasmuda/
├── index.html              # Landing page
├── login.html              # Login pemilih
├── dashboard.html          # Dashboard voting
├── admin.html              # Panel admin
├── help.html               # Halaman bantuan
├── thank-you.html          # Konfirmasi voting
├── pengumuman.html         # Pengumuman hasil
├── js/                     # JavaScript files
├── database/               # Database & API
├── api/                    # API endpoints
├── kandidat/               # Foto kandidat
└── package.json            # Dependencies
```

## 🎯 Penggunaan

### Untuk Pemilih
1. Akses halaman utama
2. Login dengan kredensial yang diberikan
3. Distribusikan 20 suara per kategori
4. Review dan submit voting

### Untuk Admin
1. Akses panel admin (`/admin.html`)
2. Monitor hasil real-time
3. Kelola user dan pemilihan
4. Export data hasil

## 📋 Checklist Implementasi

✅ Landing page dengan branding KPU Monasmuda
✅ Dashboard pemilih dengan voting interface
✅ Admin panel (hidden dari navigasi)
✅ Halaman thank you dengan konfirmasi
✅ Pusat bantuan dengan FAQ
✅ Responsive design untuk semua device
✅ Navigasi yang konsisten
✅ Validasi form dan user experience
✅ Animasi dan interaktivitas

## 🔧 API Endpoints

Base URL: `/api/index.php`

### User Management
- `GET ?action=get_users` - Ambil semua data user
- `POST ?action=add_user` - Tambah user baru
- `PUT ?action=update_user` - Update data user

### Candidate Management
- `GET ?action=get_candidates` - Ambil data kandidat
- `PUT ?action=update_candidate` - Update data kandidat

### Voting Operations
- `POST ?action=cast_vote` - Submit suara
- `GET ?action=get_vote_results` - Ambil hasil voting

### System
- `GET ?action=health_check` - Cek status sistem
- `GET ?action=get_statistics` - Ambil statistik

## 🐛 Troubleshooting

### Database Connection Error
```bash
# Cek status MySQL
# Windows (XAMPP)
http://localhost/phpmyadmin

# Cek konfigurasi
cat database/config.php
```

### Permission Issues
```bash
# Set permission untuk folder kandidat
chmod 755 kandidat/
chmod 644 kandidat/*

# Set permission untuk database
chmod 755 database/
chmod 644 database/*
```

### API Not Working
1. Pastikan Apache mod_rewrite aktif
2. Cek file `.htaccess` jika diperlukan
3. Test endpoint: `/api/index.php?action=health_check`

## 🔮 Pengembangan Selanjutnya

- ✅ Backend integration untuk data persistence
- ✅ Real database untuk kandidat dan suara
- ✅ Authentication system
- Email notifications
- Advanced analytics dashboard
- Multi-language support
- Real-time notifications
- Mobile app integration

## 🚀 Production Deployment

### Server Requirements
- PHP 7.4+ dengan PDO MySQL
- MySQL 5.7+ atau MariaDB 10.3+
- Apache/Nginx dengan mod_rewrite
- SSL Certificate (recommended)

### Production Setup
1. **Upload files** ke server
2. **Update database config**
   ```php
   // database/config.php
   define('DB_HOST', 'your-production-host');
   define('DB_NAME', 'your-production-database');
   define('DB_USER', 'your-production-username');
   define('DB_PASS', 'your-production-password');
   define('ENVIRONMENT', 'production');
   ```
3. **Run deployment script**
   ```bash
   php deploy.php
   ```
4. **Change default passwords**
5. **Setup SSL certificate**
6. **Configure backup schedule**


## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

© 2025 KPU Monasmuda Institute. Semua hak dilindungi.
