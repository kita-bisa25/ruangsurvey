(async function () {
  var R = window.RS; if (!(await R.requireAdmin("galeri"))) return;
  var sb = R.sb, esc = R.esc, MAX = 5 * 1024 * 1024, TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"], cache = {}, editing = null;
  var $ = function (i) { return document.getElementById(i); };

  function reset() {
    editing = null; $("form").reset(); $("formTitle").textContent = "Tambah Galeri"; $("preview").innerHTML = "";
    $("btnSave").innerHTML = '<i class="bi bi-save me-2"></i>Upload'; $("btnCancel").classList.add("d-none");
    $("lblGambar").innerHTML = 'Gambar <span class="text-danger">*</span>';
  }
  async function load() {
    var r = await sb.from("galeri").select("*").order("id_galeri", { ascending: false });
    if (r.error) return R.notice("#pesan", "danger", "Gagal memuat: " + r.error.message);
    cache = {}; $("total").textContent = r.data.length + " Foto";
    $("list").innerHTML = r.data.length ? r.data.map(function (x) {
      cache[x.id_galeri] = x;
      return '<div class="col-md-4 col-lg-3"><div class="card h-100"><img src="' + esc(R.pubUrl("galeri", x.gambar)) + '" class="card-img-top" style="height:180px;object-fit:cover" alt="">' +
        '<div class="card-body"><h6 class="card-title">' + esc(x.judul) + '</h6></div><div class="card-footer bg-transparent d-flex gap-1">' +
        '<button class="btn btn-sm btn-outline-primary" data-edit="' + x.id_galeri + '"><i class="bi bi-pencil"></i></button>' +
        '<button class="btn btn-sm btn-outline-danger" data-del="' + x.id_galeri + '"><i class="bi bi-trash"></i></button>' +
        '<a href="../galeri.html" target="_blank" class="btn btn-sm btn-outline-success ms-auto"><i class="bi bi-eye"></i></a></div></div></div>';
    }).join("") : '<div class="col-12 text-center py-4"><i class="bi bi-images fs-1 text-muted"></i><p class="text-muted">Belum ada foto.</p></div>';
  }

  $("form").addEventListener("submit", async function (e) {
    e.preventDefault();
    var file = $("gambar").files[0], judul = $("judul").value.trim(), desk = $("deskripsi").value.trim();
    if (!judul) return R.notice("#pesan", "danger", "Judul wajib diisi.");
    if (!file && !editing) return R.notice("#pesan", "danger", "Silakan pilih gambar.");
    if (file && TYPES.indexOf(file.type) === -1) return R.notice("#pesan", "danger", "Format gambar tidak diizinkan.");
    if (file && file.size > MAX) return R.notice("#pesan", "danger", "Ukuran maksimal 5 MB.");
    $("btnSave").disabled = true;
    try {
      var name = null;
      if (file) {
        name = R.randomName(file);
        var up = await sb.storage.from("galeri").upload(name, file, { contentType: file.type, upsert: false });
        if (up.error) throw up.error;
      }
      var q;
      if (editing) { var upd = { judul: judul, deskripsi: desk || null }; if (name) upd.gambar = name; q = await sb.from("galeri").update(upd).eq("id_galeri", editing.id_galeri); }
      else q = await sb.from("galeri").insert({ judul: judul, deskripsi: desk || null, gambar: name });
      if (q.error) { if (name) await sb.storage.from("galeri").remove([name]); throw q.error; }
      if (editing && name) await sb.storage.from("galeri").remove([editing.gambar]);   // hapus foto lama SETELAH update sukses
      R.notice("#pesan", "success", "Data disimpan!"); reset(); load();
    } catch (err) { R.notice("#pesan", "danger", "Gagal menyimpan: " + err.message); }
    $("btnSave").disabled = false;
  });
  $("btnCancel").addEventListener("click", reset);

  document.addEventListener("click", async function (e) {
    var t = e.target.closest("[data-edit],[data-del]"); if (!t) return;
    if (t.dataset.edit) {
      var x = cache[t.dataset.edit]; editing = x;
      $("judul").value = x.judul; $("deskripsi").value = x.deskripsi || ""; $("gambar").value = "";
      $("formTitle").textContent = "Edit Galeri"; $("lblGambar").textContent = "Ganti Gambar (opsional)";
      $("btnSave").innerHTML = '<i class="bi bi-save me-2"></i>Update'; $("btnCancel").classList.remove("d-none");
      $("preview").innerHTML = '<img class="img-thumb" src="' + esc(R.pubUrl("galeri", x.gambar)) + '" alt="">'; window.scrollTo(0, 0);
    } else if (confirm("Hapus foto ini?")) {
      var y = cache[t.dataset.del];
      var r = await sb.from("galeri").delete().eq("id_galeri", y.id_galeri);
      if (r.error) return R.notice("#pesan", "danger", r.error.message);
      await sb.storage.from("galeri").remove([y.gambar]);
      R.notice("#pesan", "success", "Data dihapus!"); load();
    }
  });
  load();
})();
