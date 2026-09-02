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
    const fecha = document.getElementById("aFecha").value;
    const hora = obtenerHora("a");
    const esEvento = sedes === "EVENTO";
    const esExterior = !esEvento && zona === "EXTERIOR";
    const equipoLibre = esEvento ? document.getElementById("aEquipoLibre").value.trim() : "";
    const eventoNombre = esEvento ? document.getElementById("aEventoLibre").value.trim() : "";
    const equipoExterior = esExterior ? document.getElementById("aEquipoExterior").value.trim() : "";
    const equipoSelect = document.getElementById("aEquipo").value;
    const esOtro = equipoSelect === "__OTRO__";
    const equipoOtro = esOtro ? document.getElementById("aEquipoOtro").value.trim() : "";
    const equipo = esEvento
        ? (equipoLibre + (eventoNombre ? " / Evento: " + eventoNombre : ""))
        : esExterior
        ? equipoExterior
        : esOtro
        ? equipoOtro
        : equipoSelect;
    const averia = document.querySelector("#aAvSi.active-si, #aAvNo.active-si, #aAvSi.active-no, #aAvNo.active-no");
    const descripcion = document.getElementById("aDescripcion").value.trim();

    if (!sedes || !fecha || !hora) {
        alert("Completa sede, fecha y hora.");
        return;
    }
    const zonas = getAveriaZonas(sedes);
    if (!esEvento && zonas.length > 0 && !zona) {
        alert("Selecciona una zona.");
        return;
    }
    if (!equipo) {
        alert(esEvento ? "Escribe el equipo del evento." : esExterior ? "Escribe el nombre del equipo." : esOtro ? "Escribe el nombre del equipo." : "Selecciona un equipo.");
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
    if ((esEvento || esOtro) && averiaImagenes.length === 0) {
        alert("Debes adjuntar al menos 1 foto.");
        return;
    }

    if (esOtro && equipo) {
        postJSON({ tipo: "nuevo_equipo", equipo: equipo, sede: sedes, zona: zona }).catch(function() {});
    }

    const idUnico = generarIdUnico(fecha, hora, sedes, equipo, empleadoNombre);
    if (yaEnviado(idUnico)) {
        alert("Este registro ya fue enviado anteriormente.");
        clearAveriaForm();
        mostrarSoloSeccion("loginSection");
        document.getElementById("codigoTecnico").value = "";
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
        alert("Averia reportada correctamente.");
        clearAveriaForm();
        mostrarSoloSeccion("loginSection");
        document.getElementById("codigoTecnico").value = "";
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
    document.getElementById("aEquipoLibreGroup").style.display = "none";
    document.getElementById("aEquipoLibre").value = "";
    document.getElementById("aEventoLibre").value = "";
    document.getElementById("aEquipoExteriorGroup").style.display = "none";
    document.getElementById("aEquipoExterior").value = "";
    document.getElementById("aEquipoOtroGroup").style.display = "none";
    document.getElementById("aEquipoOtro").value = "";
    resetCombobox("aEquipo", "Seleccionar equipo...");
    document.getElementById("aAveriaDetalle").style.display = "none";
    document.getElementById("aImagenesPreview").innerHTML = "";
    document.querySelectorAll("#aAvSi, #aAvNo").forEach(b => {
        b.classList.remove("active-si", "active-no");
    });
    averiaImagenes = [];
    var label = document.getElementById("aFotosLabel");
    label.textContent = "Fotos (maximo 2) - Opcional";
    label.style.color = "";
    label.style.fontWeight = "";
    limpiarHora("a");
}
