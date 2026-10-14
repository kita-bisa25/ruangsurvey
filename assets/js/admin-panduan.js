(async function () {
  var R = window.RS; if (!(await R.requireAdmin("panduan"))) return;
  var sb = R.sb, esc = R.esc, MAX = 10 * 1024 * 1024, EXT = ["pdf","doc","docx","ppt","pptx","xls","xlsx"], cache = {};
  var $ = function (i) { return document.getElementById(i); };
  $("tipe").addEventListener("change", function () {
    $("bagianLink").classList.toggle("d-none", $("tipe").value !== "link");
    $("bagianFile").classList.toggle("d-none", $("tipe").value !== "file");
  });
  async function load() {
    var r = await sb.from("artikel").select("*").order("id_artikel", { ascending: false });
    if (r.error) return R.notice("#pesan", "danger", "Gagal memuat: " + r.error.message);
    cache = {}; $("total").textContent = r.data.length + " Item"; var n = 1;
    $("rows").innerHTML = r.data.length ? r.data.map(function (x) {
      cache[x.id_artikel] = x;
      var open = x.tipe === "link"
        ? '<a href="' + esc(x.link) + '" target="_blank" rel="noopener" class="btn btn-sm btn-outline-primary"><i class="bi bi-box-arrow-up-right"></i> Buka</a>'
        : '<a href="' + esc(R.pubUrl("artikel", x.file)) + '" target="_blank" rel="noopener" class="btn btn-sm btn-outline-success"><i class="bi bi-file-earmark-arrow-up"></i> Buka File</a>';
      return "<tr><td>" + n++ + "</td><td>" + esc(x.judul) + "</td><td>" + (x.tipe === "link" ? '<span class="badge bg-primary">Link</span>' : '<span class="badge bg-success">File</span>') +
        "</td><td>" + open + ' <button class="btn btn-sm btn-outline-danger" data-del="' + x.id_artikel + '"><i class="bi bi-trash"></i></button></td></tr>';
    }).join("") : '<tr><td colspan="4" class="text-center text-muted py-4"><i class="bi bi-inbox fs-1 d-block mb-2"></i>Belum ada materi atau referensi.</td></tr>';
  }
  $("form").addEventListener("submit", async function (e) {
    e.preventDefault();
    var judul = $("judul").value.trim(), tipe = $("tipe").value, row, name = null;
    if (!judul) return R.notice("#pesan", "danger", "Judul wajib diisi.");
    if (tipe === "link") {
      var link = $("link").value.trim();
      if (!/^https?:\/\/.+/i.test(link)) return R.notice("#pesan", "danger", "URL tidak valid (harus diawali http:// atau https://).");
      row = { judul: judul, tipe: "link", link: link };
    } else if (tipe === "file") {
      var file = $("file").files[0];
      if (!file) return R.notice("#pesan", "danger", "Silakan pilih file.");
      var ext = file.name.split(".").pop().toLowerCase();
      if (EXT.indexOf(ext) === -1) return R.notice("#pesan", "danger", "Format file tidak diperbolehkan.");
      if (file.size > MAX) return R.notice("#pesan", "danger", "Ukuran file maksimal 10 MB.");
      name = R.randomName(file);
      $("btnSave").disabled = true;
      var up = await sb.storage.from("artikel").upload(name, file, { contentType: file.type || undefined });
      if (up.error) { $("btnSave").disabled = false; return R.notice("#pesan", "danger", "Gagal mengupload file: " + up.error.message); }
      row = { judul: judul, tipe: "file", file: name };
    } else return R.notice("#pesan", "danger", "Pilih jenis terlebih dahulu.");
    $("btnSave").disabled = true;
    var q = await sb.from("artikel").insert(row);
    $("btnSave").disabled = false;
    if (q.error) { if (name) await sb.storage.from("artikel").remove([name]); return R.notice("#pesan", "danger", "Gagal menyimpan: " + q.error.message); }
    R.notice("#pesan", "success", tipe === "link" ? "Link berhasil ditambahkan!" : "File berhasil diupload!");
    $("form").reset(); $("tipe").dispatchEvent(new Event("change")); load();
  });
  document.addEventListener("click", async function (e) {
    var t = e.target.closest("[data-del]"); if (!t || !confirm("Yakin hapus item ini?")) return;
    var x = cache[t.dataset.del], r = await sb.from("artikel").delete().eq("id_artikel", x.id_artikel);
    if (r.error) return R.notice("#pesan", "danger", r.error.message);
    if (x.tipe === "file" && x.file) await sb.storage.from("artikel").remove([x.file]);
    R.notice("#pesan", "success", "Item berhasil dihapus."); load();
  });
  load();
})();
