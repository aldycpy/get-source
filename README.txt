SOURCE CODE & DEPLOY HTML TOOLS - by AlzDevz

FITUR
1. Ambil source website (HTML/CSS/JS) + download ZIP
2. Deploy ke Vercel: upload file HTML atau ZIP (multi-file), pilih nama project,
   hasilnya link https://nama-project.vercel.app. Pengunjung tidak perlu token.

CARA PASANG (paling gampang: website di Vercel)
1. Upload seluruh folder ini ke GitHub, lalu import di vercel.com/new -> Deploy.
2. Fungsi api/deploy.js otomatis aktif di domain yang sama (tanpa Worker).
3. Token Vercel ada di api/deploy.js (FALLBACK_TOKEN). Lebih aman: Vercel >
   Project > Settings > Environment Variables > VERCEL_TOKEN.
   Akun Team: isi TEAM_ID atau env VERCEL_TEAM_ID.

CADANGAN: Cloudflare Worker
Kalau website tidak di Vercel, tempel worker.js ke Cloudflare Worker dan samakan
alamatnya dengan variabel W di app.js. app.js mencoba /api/deploy dulu, lalu Worker.

BATAS
- ZIP maks 3 MB (ukuran setelah diekstrak juga maks 3 MB), maks 300 file.
- Nama project: 3-52 karakter, huruf kecil/angka/-, unik (tidak boleh sudah dipakai).
- Jangan taruh token di app.js atau index.html (bisa dilihat semua orang).
