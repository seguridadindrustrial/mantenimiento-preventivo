// averia.js - Formulario y envio de averias

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
    const descripcion = document.getElementById("aDescripcion").value.trim();

    const equipo = descripcion;

    if (!sedes || !fecha || !hora) {
        alert("Completa sede, fecha y hora.");
        return;
    }
    const zonas = getAveriaZonas(sedes);
    if (zonas.length > 0 && !zona) {
        alert("Selecciona una zona.");
        return;
    }
    if (!descripcion) {
        alert("Escribe una descripcion de la averia.");
        return;
    }
    if (descripcion.length < 10) {
        alert("La descripcion debe tener minimo 10 caracteres.");
        return;
    }
    if (averiaImagenes.length === 0) {
        alert("Debes tomar al menos 1 foto.");
        return;
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
    document.getElementById("aImagenesPreview").innerHTML = "";
    averiaImagenes = [];
    var label = document.getElementById("aFotosLabel");
    label.textContent = "Fotos - Obligatoria (maximo 2)";
    limpiarHora("a");
}
