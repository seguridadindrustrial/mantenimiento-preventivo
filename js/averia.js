// averia.js - Formulario y envio de averias

function toggleAveriaToggle(btn) {
    const group = btn.parentElement;
    group.querySelectorAll(".toggle-btn").forEach(b => {
        b.classList.remove("active-si", "active-no");
    });
    btn.classList.add(btn.dataset.value === "Si" ? "active-si" : "active-no");

    document.getElementById("aAveriaDetalle").style.display = btn.dataset.value === "Si" ? "block" : "none";
    if (btn.dataset.value === "No") {
        document.getElementById("aDescripcion").value = "";
        document.getElementById("aImagenes").value = "";
    document.getElementById("aImagenesPreview").innerHTML = "";
    document.getElementById("aImagenes").value = "";
    document.getElementById("aImagenesUpload").value = "";
        averiaImagenes = [];
    }
}

function renderImagenesPreview() {
    const preview = document.getElementById("aImagenesPreview");
    preview.innerHTML = "";
    averiaImagenes.forEach(img => {
        const thumb = document.createElement("img");
        thumb.src = "data:" + img.mimeType + ";base64," + img.data;
        thumb.className = "imagen-thumb";
        thumb.title = img.nombre;
        preview.appendChild(thumb);
    });
}

function enviarAveria(e) {
    e.preventDefault();
    if (averiaEnviando) return;

    const sedes = document.getElementById("aSedes").value;
    const zona = document.getElementById("aZona").value;
    const fh = fechaHoraAhora();
    const fecha = fh.fecha;
    const hora = fh.hora;
    const esEvento = sedes === "EVENTO";
    // El equipo se escribe a mano, no se elige de una lista.
    const equipoTexto = document.getElementById("aEquipo").value.trim();
    const eventoNombre = esEvento ? document.getElementById("aEventoLibre").value.trim() : "";
    const equipo = eventoNombre ? (equipoTexto + " / Evento: " + eventoNombre) : equipoTexto;
    const averia = document.querySelector("#aAvSi.active-si, #aAvNo.active-si, #aAvSi.active-no, #aAvNo.active-no");
    const descripcion = document.getElementById("aDescripcion").value.trim();

    if (!sedes) {
        alert("Completa la sede.");
        return;
    }
    const zonas = getAveriaZonas(sedes);
    if (!esEvento && zonas.length > 0 && !zona) {
        alert("Selecciona una zona.");
        return;
    }
    if (!equipoTexto) {
        alert("Escribe el nombre del equipo.");
        return;
    }
    if (esEvento && !eventoNombre) {
        alert("Escribe el nombre del evento.");
        return;
    }
    if (!averia) {
        alert("Indica si el equipo presenta una averia (Si/No).");
        return;
    }
    if (averia.dataset.value === "No") {
        alert("No hay averia que reportar.");
        return;
    }
    if (!descripcion) {
        alert("Escribe una descripcion de la averia.");
        return;
    }
    if (averiaImagenes.length === 0) {
        alert("Debes adjuntar al menos 1 foto.");
        return;
    }

    const idUnico = generarIdUnico(fecha, hora, sedes, equipo, empleadoNombre);
    if (yaEnviado(idUnico)) {
        alert("Este registro ya fue enviado anteriormente.");
        clearAveriaForm();
        if (typeof irAlInicio === "function" && usuarioActual) irAlInicio();
        else {
            document.getElementById("averiaForm").style.display = "none";
            document.getElementById("loginSection").style.display = "block";
            document.getElementById("codigoTecnico").value = "";
        }
        return;
    }

    if (!confirm("Confirmar envio de la averia?\n\nSede: " + sedes + "\nEquipo: " + equipo + "\nDescripcion: " + descripcion)) {
        return;
    }

    const registro = {
        tipo: "averia",
        id: idUnico,
        fecha: fecha,
        hora: hora,
        sedes: sedes,
        zona: zona,
        equipo: equipo,
        averia: "Si",
        descripcion: descripcion,
        empleado: empleadoNombre,
        imagenes: averiaImagenes
    };

    averiaEnviando = true;
    const btnEnviar = document.getElementById("enviarAveriaBtn");
    btnEnviar.disabled = true;

    fetch(APPS_SCRIPT_URL, {
        method: "POST",
        body: JSON.stringify(registro)
    }).then(function (r) { return r.json(); }).catch(function () { return null; })
    .then(function (respuesta) {
        if (respuesta && respuesta.status === "duplicate") {
            averiaEnviando = false;
            btnEnviar.disabled = false;
            alert("No puedes reportar la misma averia dos veces para el mismo equipo en esta fecha.");
            return;
        }
        marcarEnviado(idUnico);
        borrarCacheV("averias");
        alert("Averia reportada correctamente.");
        clearAveriaForm();
        if (typeof notiRefrescar === "function") notiRefrescar(true);
        if (typeof irAlInicio === "function" && usuarioActual) irAlInicio();
        else {
            document.getElementById("averiaForm").style.display = "none";
            document.getElementById("loginSection").style.display = "block";
            document.getElementById("codigoTecnico").value = "";
        }
        averiaEnviando = false;
        btnEnviar.disabled = false;
    })
    .catch(() => {
        averiaEnviando = false;
        btnEnviar.disabled = false;
        alert("Error al enviar. Intenta de nuevo.");
    });
}

function clearAveriaForm() {
    document.getElementById("averiaForm").reset();
    document.getElementById("aZonaGroup").style.display = "none";
    document.getElementById("aEquipoGroup").style.display = "block";
    document.getElementById("aEventoGroup").style.display = "none";
    document.getElementById("aEventoLibre").value = "";
    document.getElementById("aAveriaDetalle").style.display = "none";
    document.getElementById("aImagenesPreview").innerHTML = "";
    document.querySelectorAll("#aAvSi, #aAvNo").forEach(b => {
        b.classList.remove("active-si", "active-no");
    });
    averiaImagenes = [];
    var label = document.getElementById("aFotosLabel");
    if (label) {
        label.textContent = "Fotos (maximo 2) - Obligatoria";
        label.style.color = "#d32f2f";
        label.style.fontWeight = "700";
    }
    limpiarHora("a");
}
