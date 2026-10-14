(async function () {
  var R = window.RS; if (!(await R.requireAdmin("kontak"))) return;
  var sb = R.sb, esc = R.esc, cache = {}, current = null;
  var modal = new bootstrap.Modal(document.getElementById("detailModal"));
  function badge(s) { return s === "baru" ? '<span class="badge bg-warning text-dark">Baru</span>' : s === "dibaca" ? '<span class="badge bg-info">Dibaca</span>' : '<span class="badge bg-success">Dibalas</span>'; }

  async function load() {
    var r = await sb.from("kontak").select("*").order("created_at", { ascending: false });
    if (r.error) return R.notice("#pesan", "danger", "Gagal memuat: " + r.error.message);
    cache = {}; document.getElementById("total").textContent = r.data.length + " Pesan";
    var n = 1;
    document.getElementById("rows").innerHTML = r.data.length ? r.data.map(function (x) {
      cache[x.id_kontak] = x;
      return "<tr" + (x.status === "baru" ? ' class="table-warning"' : "") + "><td>" + n++ + "</td><td>" + esc(x.nama) + "</td><td>" + esc(x.email) + "</td><td>" + esc(x.subjek) +
        "</td><td>" + badge(x.status) + "</td><td>" + R.fmtDate(x.created_at, true) + '</td><td class="text-end">' +
        '<button class="btn btn-sm btn-outline-primary" data-view="' + x.id_kontak + '"><i class="bi bi-eye"></i></button> ' +
        '<button class="btn btn-sm btn-outline-danger" data-del="' + x.id_kontak + '"><i class="bi bi-trash"></i></button></td></tr>';
    }).join("") : '<tr><td colspan="7" class="text-center text-muted py-4"><i class="bi bi-inbox fs-1 d-block mb-2"></i>Belum ada pesan masuk.</td></tr>';
  }
  async function setStatus(id, s) { var r = await sb.from("kontak").update({ status: s }).eq("id_kontak", id); if (r.error) R.notice("#pesan", "danger", r.error.message); }

  document.addEventListener("click", async function (e) {
    var t = e.target.closest("[data-view],[data-del]"); if (!t) return;
    if (t.dataset.view) {
      var x = cache[t.dataset.view]; current = x;
      document.getElementById("detailBody").innerHTML =
        "<div class='mb-2'><strong>Nama:</strong> " + esc(x.nama) + "</div><div class='mb-2'><strong>Email:</strong> " + esc(x.email) + "</div>" +
        "<div class='mb-2'><strong>Subjek:</strong> " + esc(x.subjek) + "</div><hr><p>" + esc(x.isi).replace(/\n/g, "<br>") + "</p>" +
        "<div class='text-muted small'>Dikirim: " + R.fmtDate(x.created_at, true) + "</div>";
      document.getElementById("btnMail").href = "mailto:" + encodeURIComponent(x.email) + "?subject=" + encodeURIComponent("Re: " + x.subjek);
      modal.show();
      if (x.status === "baru") { await setStatus(x.id_kontak, "dibaca"); load(); }   // otomatis jadi "dibaca"
    } else if (confirm("Yakin hapus pesan ini?")) {
      var r = await sb.from("kontak").delete().eq("id_kontak", t.dataset.del);
      if (r.error) return R.notice("#pesan", "danger", r.error.message);
      R.notice("#pesan", "success", "Pesan berhasil dihapus!"); load();
    }
  });
  document.getElementById("btnReplied").addEventListener("click", async function () {
    if (!current) return; await setStatus(current.id_kontak, "dibalas"); modal.hide(); R.notice("#pesan", "success", "Pesan ditandai sebagai dibalas!"); load();
  });
  load();
})();
