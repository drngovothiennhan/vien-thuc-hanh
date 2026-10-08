(function () {
  var cases = window.VTH_CASES || [];
  var select = document.getElementById("case-select");
  var body = document.getElementById("cbc-body");
  var unitToggle = document.getElementById("unit-toggle");
  var caseMeta = document.getElementById("case-meta");

  function fmt(n) {
    return Number.isInteger(n) ? String(n) : n.toFixed(1);
  }

  function inRange(value, range) {
    return value >= range[0] && value <= range[1];
  }

  function renderCase(id) {
    var c = cases.find(function (x) { return x.id === id; });
    if (!c) return;
    var sexKey = c.patient.sex === "nam" ? "nam" : "nu";
    var useDl = unitToggle.checked;

    caseMeta.textContent =
      c.title + " · " + c.patient.age + " tuổi · " +
      (sexKey === "nam" ? "nam" : "nữ") + " · " + c.patient.note;

    body.innerHTML = "";
    c.tests.forEach(function (t) {
      var isHb = t.name === "Hemoglobin";
      var value = t.value;
      var unit = t.unit;
      if (isHb && useDl) {
        value = t.value / 10;
        unit = "g/dL";
      }
      var range = t.ref[sexKey];
      var rangeText = isHb && useDl
        ? fmt(range[0] / 10) + "–" + fmt(range[1] / 10)
        : range[0] + "–" + range[1];
      var ok = inRange(t.value, range);

      var tr = document.createElement("tr");
      tr.innerHTML =
        "<td>" + t.name + "</td>" +
        "<td>" + fmt(value) + "</td>" +
        "<td>" + unit + "</td>" +
        "<td>" + rangeText + "</td>" +
        "<td class=\"" + (ok ? "ok" : "flag") + "\">" + (ok ? "Trong khoảng" : "Ngoài khoảng") + "</td>";
      body.appendChild(tr);
    });
  }

  cases.forEach(function (c) {
    var opt = document.createElement("option");
    opt.value = c.id;
    opt.textContent = c.title;
    select.appendChild(opt);
  });

  select.addEventListener("change", function () { renderCase(select.value); });
  unitToggle.addEventListener("change", function () { renderCase(select.value); });

  if (cases.length) renderCase(cases[0].id);
})();
