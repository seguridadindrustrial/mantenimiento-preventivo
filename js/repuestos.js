// repuestos.js - Gestion de repuestos (spare parts)

function toggleOtroRepuestos(btn) {
    const group = btn.parentElement;
    group.querySelectorAll(".toggle-btn").forEach(b => {
        b.classList.remove("active-si", "active-no");
    });
    btn.classList.add(btn.dataset.value === "Si" ? "active-si" : "active-no");
    const repuestosGroup = document.getElementById("otroRepuestosGroup");
    repuestosGroup.style.display = btn.dataset.value === "Si" ? "block" : "none";
    if (btn.dataset.value === "No") {
        document.getElementById("otroRepuestosRows").innerHTML = "";
    }
}

function toggleRepuestosToggle(btn) {
    const group = btn.parentElement;
    group.querySelectorAll(".toggle-btn").forEach(b => {
        b.classList.remove("active-si", "active-no");
    });
    btn.classList.add(btn.dataset.value === "Si" ? "active-si" : "active-no");

    const repuestosGroup = document.getElementById("repuestosGroup");
    repuestosGroup.style.display = btn.dataset.value === "Si" ? "block" : "none";
    if (btn.dataset.value === "No") {
        document.getElementById("repuestosRows").innerHTML = "";
    }
}

function agregarRepuestoRow(containerId) {
    const rows = document.getElementById(containerId || "repuestosRows");
    const row = document.createElement("div");
    row.className = "repuesto-row";
    row.innerHTML = `
        <input type="text" class="repuesto-nombre" placeholder="Nombre del repuesto">
        <input type="number" class="repuesto-cantidad" placeholder="Cant." min="1">
        <button type="button" class="repuesto-remove" onclick="this.parentElement.remove()">✕</button>
    `;
    rows.appendChild(row);
    row.querySelector(".repuesto-nombre").focus();
}

function getRepuestos(containerId) {
    const rowsEl = document.getElementById(containerId || "repuestosRows");
    const repuestos = [];
    rowsEl.querySelectorAll(".repuesto-row").forEach(row => {
        const nombre = row.querySelector(".repuesto-nombre").value.trim();
        const cantidad = row.querySelector(".repuesto-cantidad").value.trim();
        if (nombre) repuestos.push({ nombre: nombre, cantidad: cantidad });
    });
    return repuestos;
}

function resetPaso3() {
    document.getElementById("paso3").style.display = "none";
    document.getElementById("repuestosGroup").style.display = "none";
    document.getElementById("repuestosRows").innerHTML = "";
    document.querySelectorAll("#repSi, #repNo").forEach(b => {
        b.classList.remove("active-si", "active-no");
    });
}
