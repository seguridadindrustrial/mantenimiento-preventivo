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

let ayudasTecnicosLista = [];
let ayudasTecnicosCargando = false;

function toggleAyudaToggle(btn, prefix) {
    const pre = prefix || "ayuda";
    const group = btn.parentElement;
    group.querySelectorAll(".toggle-btn").forEach(b => {
        b.classList.remove("active-si", "active-no");
    });
    btn.classList.add(btn.dataset.value === "Si" ? "active-si" : "active-no");

    const ayudaGroup = document.getElementById(pre + "Group");
    ayudaGroup.style.display = btn.dataset.value === "Si" ? "block" : "none";
    if (btn.dataset.value === "No") {
        document.getElementById(pre + "Cantidad").value = "";
        document.getElementById(pre + "TecnicosRows").innerHTML = "";
    }
}

function opcionesAyudaTecnicos(valorActual) {
    if (ayudasTecnicosLista.length === 0) {
        return ['<option value="" selected>Cargando tecnicos...</option>'].join("");
    }
    const opciones = ['<option value="" disabled' + (valorActual ? "" : " selected") + '>Seleccionar tecnico...</option>'];
    ayudasTecnicosLista.forEach(function (nombre) {
        opciones.push('<option value="' + nombre + '"' + (valorActual === nombre ? " selected" : "") + '>' + nombre + '</option>');
    });
    return opciones.join("");
}

function aplicarOpcionesAyudaTecnicos() {
    document.querySelectorAll(".ayuda-tecnico-row .ayuda-tecnico-nombre").forEach(function (sel) {
        const actual = sel.value;
        sel.innerHTML = opcionesAyudaTecnicos(actual);
    });
}

function cargarTecnicosParaAyuda(callback) {
    if (ayudasTecnicosCargando) return;
    if (ayudasTecnicosLista.length > 0) {
        if (callback) callback();
        return;
    }
    ayudasTecnicosCargando = true;
    fetch(APPS_SCRIPT_URL + "?accion=personal")
        .then(function (r) { return r.json(); })
        .then(function (personal) {
            ayudasTecnicosCargando = false;
            ayudasTecnicosLista = [];
            (personal || []).forEach(function (p) {
                if (p.tipo !== "Tecnico" || !p.nombre) return;
                const nombre = String(p.nombre).trim();
                if (!nombre || nombre === tecnicoNombre) return;
                if (ayudasTecnicosLista.indexOf(nombre) === -1) ayudasTecnicosLista.push(nombre);
            });
            if (callback) callback();
        })
        .catch(function () {
            ayudasTecnicosCargando = false;
            if (callback) callback();
        });
}

function renderAyudaTecnicos(prefix) {
    const pre = prefix || "ayuda";
    const cantEl = document.getElementById(pre + "Cantidad");
    let cant = parseInt(cantEl.value, 10);
    if (isNaN(cant) || cant < 1) {
        cantEl.value = "";
        document.getElementById(pre + "TecnicosRows").innerHTML = "";
        return;
    }
    if (cant > 10) {
        cant = 10;
        cantEl.value = 10;
    }
    if (ayudasTecnicosLista.length === 0) {
        cargarTecnicosParaAyuda(aplicarOpcionesAyudaTecnicos);
    }
    const container = document.getElementById(pre + "TecnicosRows");
    container.innerHTML = "";
    for (let i = 0; i < cant; i++) {
        const row = document.createElement("div");
        row.className = "repuesto-row ayuda-tecnico-row";
        row.innerHTML = `
            <select class="ayuda-tecnico-nombre">${opcionesAyudaTecnicos("")}</select>
            <button type="button" class="repuesto-remove" onclick="this.parentElement.remove()">✕</button>
        `;
        container.appendChild(row);
    }
}

function getAyudaTecnicos(prefix) {
    const pre = prefix || "ayuda";
    const container = document.getElementById(pre + "TecnicosRows");
    const nombres = [];
    if (!container) return nombres;
    container.querySelectorAll(".ayuda-tecnico-row").forEach(row => {
        const sel = row.querySelector(".ayuda-tecnico-nombre");
        const v = sel ? sel.value.trim() : "";
        if (v) nombres.push(v);
    });
    return nombres;
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
    document.getElementById("ayudaGroup").style.display = "none";
    document.getElementById("ayudaCantidad").value = "";
    document.getElementById("ayudaTecnicosRows").innerHTML = "";
    document.querySelectorAll("#ayudaSi, #ayudaNo").forEach(b => {
        b.classList.remove("active-si", "active-no");
    });
}
