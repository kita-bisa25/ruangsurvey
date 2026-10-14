/* Logika halaman publik: index, survey, kontak, galeri, login */
(function () {
  var R = window.RS, esc = R.esc, sb = R.sb;
  var page = document.body.dataset.page;
  if (!R.checkConfig()) return;

  function $(s) { return document.querySelector(s); }
  function busy(btn, on, label) {
    if (!btn) return;
    if (on) { btn.dataset.html = btn.innerHTML; btn.disabled = true; btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>' + label; }
    else { btn.disabled = false; btn.innerHTML = btn.dataset.html; }
  }

  var pages = {
    async index() {
      var st = await sb.rpc("public_stats");
      if (!st.error && st.data) {
        $("#statTotal").textContent = Number(st.data.total).toLocaleString("id-ID");
        $("#statPlatform").textContent = st.data.popular;
        $("#statPositif").textContent = st.data.positive_percent + "%";
        $("#statHarian").textContent = Number(st.data.daily).toLocaleString("id-ID");
      }
      var a = await sb.from("artikel").select("judul,tipe,link,file").order("id_artikel", { ascending: false });
      var ul = $("#listArtikel");
      if (a.data && a.data.length) {
        ul.innerHTML = a.data.map(function (x) {
          var href = x.tipe === "link" ? x.link : R.pubUrl("artikel", x.file);
          return '<li><a href="' + esc(href) + '" target="_blank" rel="noopener noreferrer"><i class="bi bi-file-earmark-text me-1"></i>' + esc(x.judul) + "</a></li>";
        }).join("");
      } else ul.innerHTML = '<li><span class="text-muted small">Belum ada artikel</span></li>';

      var g = await sb.from("galeri").select("judul,deskripsi,gambar").order("id_galeri", { ascending: false }).limit(3);
      var box = $("#galeriHome");
      if (g.data && g.data.length) {
        box.innerHTML = '<div class="galeri-grid">' + g.data.map(function (f) {
          return '<div class="galeri-item"><img src="' + esc(R.pubUrl("galeri", f.gambar)) + '" alt="' + esc(f.judul) + '" loading="lazy">' +
                 '<div class="galeri-overlay"><h6>' + esc(f.judul) + "</h6><small>" + esc(f.deskripsi || "") + "</small></div></div>";
        }).join("") + '</div><div class="galeri-view-all"><a href="galeri.html"><i class="bi bi-arrow-right"></i> Lihat Semua Galeri</a></div>';
      } else box.innerHTML = '<div class="alert alert-info"><i class="bi bi-info-circle me-2"></i> Belum ada foto galeri.</div>';
    },

    survey() {
      var f = $("#formSurvey");
      f.addEventListener("submit", async function (e) {
        e.preventDefault();
        var d = Object.fromEntries(new FormData(f).entries());
        var btn = f.querySelector('[type="submit"]');
        busy(btn, true, "Mengirim...");
        var r = await sb.rpc("submit_survey", {
          p_nama: d.nama || "", p_umur: parseInt(d.umur, 10), p_jk: d.jenis_kelamin, p_pekerjaan: d.pekerjaan,
          p_platform: d.platform_utama, p_durasi: d.durasi_harian, p_tujuan: d.tujuan_utama, p_frekuensi: d.frekuensi,
          p_bantu: d.bantu_informasi, p_ganggu: d.ganggu_produktivitas, p_pengaruh: d.pengaruh_kehidupan, p_saran: d.saran || ""
        });
        busy(btn, false);
        if (r.error) { console.error(r.error); R.notice("#pesan", "danger", "Gagal mengirim survey. Periksa isian Anda lalu coba lagi."); window.scrollTo(0, 0); return; }
        f.classList.add("d-none");
        $("#sukses").classList.remove("d-none");
        window.scrollTo(0, 0);
      });
      var again = $("#isiLagi");
      if (again) again.addEventListener("click", function () { f.reset(); f.classList.remove("d-none"); $("#sukses").classList.add("d-none"); $("#pesan").innerHTML = ""; });
    },

    kontak() {
      var f = $("#formKontak");
      f.addEventListener("submit", async function (e) {
        e.preventDefault();
        var d = Object.fromEntries(new FormData(f).entries());
        var btn = f.querySelector('[type="submit"]');
        busy(btn, true, "Mengirim...");
        var r = await sb.from("kontak").insert({ nama: d.nama.trim(), email: d.email.trim(), subjek: d.subjek.trim(), isi: d.isi.trim() });
        busy(btn, false);
        if (r.error) { console.error(r.error); R.notice("#pesan", "danger", "Gagal mengirim pesan. Silakan coba lagi."); return; }
        f.reset();
        R.notice("#pesan", "success", "Pesan berhasil dikirim! Kami akan segera merespon.");
      });
    },

    async galeri() {
      var g = await sb.from("galeri").select("*").order("id_galeri", { ascending: false });
      var box = $("#galeriList");
      if (g.error) { box.innerHTML = '<div class="col-12 text-center text-danger py-5">Gagal memuat galeri.</div>'; return; }
      if (!g.data.length) { box.innerHTML = '<div class="col-12 text-center py-5"><i class="bi bi-images fs-1" style="color:#087f79"></i><p class="text-muted mt-3">Belum ada dokumentasi kegiatan.</p></div>'; return; }
      box.innerHTML = g.data.map(function (x) {
        return '<div class="col-md-6 col-lg-4"><div class="card h-100"><img src="' + esc(R.pubUrl("galeri", x.gambar)) + '" class="card-img-top" alt="' + esc(x.judul) + '" loading="lazy">' +
          '<div class="card-body"><h5 class="card-title">' + esc(x.judul) + '</h5><p class="card-text">' + esc(x.deskripsi || "") + "</p></div>" +
          '<div class="card-footer"><small><i class="bi bi-calendar3 me-1"></i>' + R.fmtDate(x.created_at) + "</small></div></div></div>";
      }).join("");
    },

    async login() {
      var s = await sb.auth.getSession();
      if (s.data.session) { location.replace("admin/dashboard.html"); return; }
      $("#formLogin").addEventListener("submit", async function (e) {
        e.preventDefault();
        var btn = e.target.querySelector('[type="submit"]');
        busy(btn, true, "Masuk...");
        var r = await sb.auth.signInWithPassword({ email: $("#email").value.trim(), password: $("#password").value });
        busy(btn, false);
        if (r.error) { R.notice("#pesan", "danger", "Email atau password salah."); return; }
        location.replace("admin/dashboard.html");
      });
    }
  };

  if (pages[page]) pages[page]();
})();
