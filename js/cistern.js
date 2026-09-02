// cistern.js - Interfaz de pago de cisterna

function mostrarInterfazPagoCisterna() {
    document.getElementById("loginSection").style.display = "none";
    document.getElementById("checkinForm").style.display = "none";
    document.getElementById("averiaForm").style.display = "none";
    document.getElementById("resolucionForm").style.display = "none";
    document.getElementById("asignarSection").style.display = "none";
    document.getElementById("cisternaPagoSection").style.display = "block";

    document.getElementById("cisternaPagoInfo").textContent = "Cargando deudas pendientes...";
    document.getElementById("cisternaTablaDeudas").innerHTML = "";
    document.getElementById("cisternaTotalMonto").textContent = "$0";
    document.getElementById("cisternaPagoMsg").innerHTML = "";

    fetch(APPS_SCRIPT_URL + "?accion=deudas_cisterna")
        .then(function (r) { return r.json(); })
        .then(function (data) {
            cisternaDeudas = Array.isArray(data) ? data : [];
            cisternaTotal = 0;
            var pendientes = [];
            for (var i = 0; i < cisternaDeudas.length; i++) {
                if (cisternaDeudas[i].estado !== "Pagado") {
                    cisternaTotal += cisternaDeudas[i].monto;
                    pendientes.push(cisternaDeudas[i]);
                }
            }
            document.getElementById("cisternaPagoInfo").textContent =
                pendientes.length + " solicitud(es) pendiente(s) por pagar";
            document.getElementById("cisternaTotalMonto").textContent = "$" + cisternaTotal;

            var html = "<table class='cisterna-deuda-tabla'>" +
                "<tr><th>Fecha</th><th>Hora</th><th>Sede</th><th>Tecnico</th><th>Monto</th><th>Estado</th></tr>";
            for (var j = 0; j < cisternaDeudas.length; j++) {
                var d = cisternaDeudas[j];
                var cls = d.estado === "Pagado" ? "fila-pagada" : "fila-pendiente";
                html += "<tr class='" + cls + "'>" +
                    "<td>" + d.fecha + "</td>" +
                    "<td>" + d.hora + "</td>" +
                    "<td>" + d.sede + "</td>" +
                    "<td>" + d.tecnico + "</td>" +
                    "<td>$" + d.monto + "</td>" +
                    "<td>" + d.estado + "</td>" +
                    "</tr>";
            }
            html += "</table>";
            document.getElementById("cisternaTablaDeudas").innerHTML = html;

            if (pendientes.length === 0) {
                document.getElementById("btnConfirmarPagoCisterna").disabled = true;
                document.getElementById("cisternaPagoInfo").textContent = "No hay deudas pendientes.";
            }
        })
        .catch(function () {
            document.getElementById("cisternaPagoInfo").textContent = "Error al cargar las deudas.";
        });
    mostrarMiniNav();
}

function toggleCisternaPago(btn) {
    var group = btn.parentElement;
    group.querySelectorAll(".toggle-btn").forEach(function (b) {
        b.classList.remove("active-si", "active-no");
    });
    btn.classList.add(btn.dataset.value === "Pago total" ? "active-si" : "active-no");

    var aporteGroup = document.getElementById("cisternaAporteGroup");
    if (btn.dataset.value === "Aporte") {
        aporteGroup.style.display = "block";
    } else {
        aporteGroup.style.display = "none";
        document.getElementById("cisternaAporteMonto").value = "";
    }
}

function confirmarPagoCisterna() {
    var btnActivo = document.querySelector("#cisternaPagoSection .toggle-group .active-si, #cisternaPagoSection .toggle-group .active-no");
    if (!btnActivo) {
        alert("Selecciona el tipo de pago.");
        return;
    }

    var tipo = btnActivo.dataset.value;
    var monto = 0;
    if (tipo === "Aporte") {
        monto = parseFloat(document.getElementById("cisternaAporteMonto").value) || 0;
        if (monto <= 0) {
            alert("Ingresa un monto valido para el aporte.");
            return;
        }
        if (monto >= cisternaTotal) {
            if (!confirm("El aporte ($" + monto + ") es igual o mayor al total ($" + cisternaTotal + "). Se marcara como Pago total. Continuar?")) {
                return;
            }
            tipo = "Pago total";
        }
    }

    if (!confirm("Confirmar " + (tipo === "Pago total" ? "pago total" : "aporte de $" + monto) + "?")) {
        return;
    }

    var btnConfirmar = document.getElementById("btnConfirmarPagoCisterna");
    btnConfirmar.disabled = true;
    btnConfirmar.textContent = "Procesando...";

    fetch(APPS_SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
        body: JSON.stringify({
            tipo: "pagar_cisterna",
            tipo: tipo,
            monto: monto
        })
    }).then(function () {
        var msg = document.getElementById("cisternaPagoMsg");
        if (tipo === "Pago total") {
            msg.innerHTML = '<div style="color:#2e7d32;font-weight:600;">Pago total registrado. Se ha enviado un correo de confirmacion.</div>';
        } else {
            msg.innerHTML = '<div style="color:#2e7d32;font-weight:600;">Aporte de $' + monto + ' registrado. Se ha enviado un correo con las deudas restantes.</div>';
        }
        btnConfirmar.textContent = "Pago registrado";
        document.querySelectorAll("#cisternaPagoSection .toggle-group .toggle-btn").forEach(function (b) {
            b.classList.remove("active-si", "active-no");
        });
        document.getElementById("cisternaAporteGroup").style.display = "none";
        document.getElementById("cisternaAporteMonto").value = "";
    }).catch(function () {
        btnConfirmar.disabled = false;
        btnConfirmar.textContent = "Confirmar pago";
        document.getElementById("cisternaPagoMsg").innerHTML = '<div style="color:#d32f2f;font-weight:600;">Error al procesar el pago. Intenta de nuevo.</div>';
    });
}
