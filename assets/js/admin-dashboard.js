(async function () {
  var R = window.RS; if (!(await R.requireAdmin("dashboard"))) return;
  var sb = R.sb, esc = R.esc;
  function cnt(q) { return q.then(function (r) { return r.count || 0; }); }
  var head = { count: "exact", head: true };
  var res = await Promise.all([
    cnt(sb.from("responden").select("*", head)),
    cnt(sb.from("responden").select("*", head).eq("jenis_kelamin", "Laki-laki")),
    cnt(sb.from("responden").select("*", head).eq("jenis_kelamin", "Perempuan")),
    sb.rpc("public_stats"),
    sb.from("survey_jawaban").select("platform_utama,durasi_harian,pengaruh_kehidupan,created_at,responden(nama,jenis_kelamin)").order("created_at", { ascending: false }).limit(6)
  ]);
  document.getElementById("sTotal").textContent = res[0];
  document.getElementById("sL").textContent = res[1];
  document.getElementById("sP").textContent = res[2];
  document.getElementById("sPlat").textContent = res[3].data ? res[3].data.popular : "-";
  var rows = res[4].data || [];
  document.getElementById("rows").innerHTML = rows.length ? rows.map(function (r) {
    var o = r.responden || {};
    return "<tr><td>" + esc(o.nama || "-") + "</td><td>" + esc(o.jenis_kelamin) + "</td><td>" + esc(r.platform_utama) + "</td><td>" +
      esc(r.durasi_harian) + "</td><td>" + esc(r.pengaruh_kehidupan) + "</td><td>" + R.fmtDate(r.created_at, true) + "</td></tr>";
  }).join("") : '<tr><td colspan="6" class="text-center text-muted py-4">Belum ada data survey.</td></tr>';
})();
