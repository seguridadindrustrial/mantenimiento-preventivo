// calendario.js - Interfaz de asignacion de mantenimiento preventivo semanal

let asignacionesCalendario = [];
let semanaCalendarioActual = "";

function diasSemana() {
    return ["Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado", "Domingo"];
}

function salirDeCalendario() {
    document.getElementById("calendarioSection").style.display = "none";
    document.getElementById("loginSection").style.display = "block";
}

function mostrarInterfazCalendario() {
    document.getElementById("loginSection").style.display = "none";
    document.getElementById("checkinForm").style.display = "none";
    document.getElementById("averiaForm").style.display = "none";
    document.getElementById("resolucionForm").style.display = "none";
    document.getElementById("asignarSection").style.display = "none";
    document.getElementById("cisternaPagoSection").style.display = "none";
    document.getElementById("calendarioSection").style.display = "block";

    document.getElementById("calendarioInfo").textContent = "Cargando asignaciones de la semana...";
    document.getElementById("calendarioTabla").innerHTML = "";
    document.getElementById("calendarioMsg").innerHTML = "";

    obtenerSemanaActualYAsignaciones();
}

function obtenerSemanaISOActual() {
    var ahora = new Date();
    var d = new Date(ahora);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
    var week1 = new Date(d.getFullYear(), 0, 4);
    return d.getFullYear() + "-W" + String(Math.ceil((((d - week1) / 86400000) + 1) / 7)).padStart(2, "0");
}

function obtenerSemanaActualYAsignaciones() {
    var semana = obtenerSemanaISOActual();
    semanaCalendarioActual = semana;
    document.getElementById("calendarioInfo").textContent = "Semana: " + semana;

    fetch(APPS_SCRIPT_URL + "?accion=asignaciones_calendario")
        .then(function (r) { return r.json(); })
        .then(function (data) {
            if (data && data.status === "ok" && Array.isArray(data.asignaciones)) {
                var semanales = data.asignaciones.filter(function (a) {
                    return String(a.semana || "") === semana;
                });
                if (semanales.length > 0) {
                    asignacionesCalendario = semanales;
                    renderTablaAsignaciones();
                } else {
                    // no hay asignaciones para esta semana aun, vacio
                    asignacionesCalendario = [];
                    renderTablaAsignacionesVacia();
                }
            } else {
                renderTablaAsignacionesVacia();
            }
        })
        .catch(function () {
            renderTablaAsignacionesVacia();
        });
}

function renderTablaAsignacionesVacia() {
    document.getElementById("calendarioInfo").textContent =
        "Semana " + semanaCalendarioActual + " - No hay asignaciones aun. Genera la semana para cargar los equipos.";
    document.getElementById("calendarioTabla").innerHTML = "";
    var t = document.createElement("table");
    t.className = "cisterna-deuda-tabla";
    var thead = document.createElement("thead");
    var filaEnc = document.createElement("tr");
    ["Equipo", "Sede"].concat(diasSemana()).forEach(function (h) {
        var th = document.createElement("th");
        th.textContent = h;
        filaEnc.appendChild(th);
    });
    thead.appendChild(filaEnc);
    t.appendChild(thead);
    document.getElementById("calendarioTabla").appendChild(t);
}

function renderTablaAsignaciones() {
    var dias = diasSemana();
    document.getElementById("calendarioInfo").textContent =
        "Semana " + semanaCalendarioActual + " - Asigna el tecnico a cada equipo segun el dia.";
    document.getElementById("calendarioTabla").innerHTML = "";

    var t = document.createElement("table");
    t.className = "cisterna-deuda-tabla";
    t.setAttribute("data-semana", semanaCalendarioActual);

    var thead = document.createElement("thead");
    var filaEnc = document.createElement("tr");
    ["Equipo", "Sede"].concat(dias).forEach(function (h) {
        var th = document.createElement("th");
        th.textContent = h;
        filaEnc.appendChild(th);
    });
    thead.appendChild(filaEnc);
    t.appendChild(thead);

    var tbody = document.createElement("tbody");
    asignacionesCalendario.forEach(function (a) {
        var tr = document.createElement("tr");
        tr.setAttribute("data-equipo", a.equipo);

        var tdEq = document.createElement("td");
        tdEq.textContent = a.equipo;
        tr.appendChild(tdEq);

        var tdSede = document.createElement("td");
        tdSede.textContent = a.sede || "";
        tr.appendChild(tdSede);

        dias.forEach(function (dia) {
            var td = document.createElement("td");
            var sel = document.createElement("select");
            sel.className = "calendario-select";
            sel.setAttribute("data-equipo", a.equipo);
            sel.setAttribute("data-dia", dia);
            sel.appendChild(opcionVacia());
            getTecnicosCalendario().forEach(function (t) {
                var op = document.createElement("option");
                op.value = t;
                op.textContent = t;
                sel.appendChild(op);
            });
            var actual = a[dia] || "";
            if (actual) sel.value = actual;
            td.appendChild(sel);
            tr.appendChild(td);
        });

        tbody.appendChild(tr);
    });
    t.appendChild(tbody);
    document.getElementById("calendarioTabla").appendChild(t);
}

function opcionVacia() {
    var op = document.createElement("option");
    op.value = "";
    op.textContent = "--";
    return op;
}

function getTecnicosCalendario() {
    var lista = [];
    datosPersonal.forEach(function (p) {
        if (p.tipo === "Tecnico" && lista.indexOf(p.nombre) === -1) {
            lista.push(p.nombre);
        }
    });
    return lista;
}

function generarSemanaDesdeCalendario() {
    var btn = document.getElementById("btnGenerarSemana");
    btn.disabled = true;
    btn.textContent = "Generando...";
    document.getElementById("calendarioMsg").innerHTML = "";

    postJSON({ tipo: "generar_semana", semana: semanaCalendarioActual });
    borrarCacheV("tareas_semanales");
    setTimeout(function () {
        obtenerSemanaActualYAsignaciones();
        btn.disabled = false;
        btn.textContent = "Generar/Actualizar Semana";
        document.getElementById("calendarioMsg").innerHTML =
            '<div style="color:#2e7d32;font-weight:600;">Semana generada. Completa las asignaciones y guarda.</div>';
    }, 3000);
}

function guardarAsignacionesWeb() {
    var tabla = document.querySelector("#calendarioTabla table");
    if (!tabla) {
        document.getElementById("calendarioMsg").innerHTML =
            '<div style="color:#d32f2f;font-weight:600;">Primero genera/actualiza la semana.</div>';
        return;
    }

    var lista = [];
    var selects = tabla.querySelectorAll(".calendario-select");
    var mapa = {};
    selects.forEach(function (sel) {
        var eq = sel.getAttribute("data-equipo");
        var dia = sel.getAttribute("data-dia");
        if (!mapa[eq]) mapa[eq] = { equipo: eq };
        mapa[eq][dia] = sel.value;
    });
    for (var eq in mapa) {
        lista.push(mapa[eq]);
    }

    var btn = document.getElementById("btnGuardarAsignaciones");
    btn.disabled = true;
    btn.textContent = "Guardando...";

    postJSON({ tipo: "guardar_asignaciones", semana: semanaCalendarioActual, asignaciones: lista });
    borrarCacheV("tareas_semanales");
    setTimeout(function () {
        btn.disabled = false;
        btn.textContent = "Guardar Asignaciones";
        document.getElementById("calendarioMsg").innerHTML =
            '<div style="color:#2e7d32;font-weight:600;">Asignaciones guardadas correctamente.</div>';
    }, 2500);
}
