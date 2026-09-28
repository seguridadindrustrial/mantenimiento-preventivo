// resolucion.js - Resolucion de averias

var resolucionEsOrden = false;

function finalizarResolucion() {
    if (usuarioActual && typeof navegar === "function") {
        document.getElementById("resolucionForm").style.display = "none";
        document.getElementById("loginSection").style.display = "none";
        if (typeof actualizarBotonAtras === "function") actualizarBotonAtras();
        navegar(moduloActivo);
    } else {
        volverAlLogin();
    }
}

function toggleRepuestosResolucion(btn) {
    const group = btn.parentElement;
    group.querySelectorAll(".toggle-btn").forEach(b => {
        b.classList.remove("active-si", "active-no");
    });
    btn.classList.add(btn.dataset.value === "Si" ? "active-si" : "active-no");

    const repuestosGroup = document.getElementById("rRepuestosGroup");
    repuestosGroup.style.display = btn.dataset.value === "Si" ? "block" : "none";
    if (btn.dataset.value === "No") {
        document.getElementById("rRepuestosRows").innerHTML = "";
    }
}

function abrirResolucion(av) {
    if (!av) { alert("Datos de la averia invalidos."); return; }
    resolucionActualNumero = String(av.numero || "");
    if (typeof historialModulos !== "undefined" && usuarioActual) {
        if (historialModulos[historialModulos.length - 1] !== moduloActivo) {
            historialModulos.push(moduloActivo);
            if (historialModulos.length > 20) historialModulos.shift();
        }
    }
    document.getElementById("loginSection").style.display = "none";
    document.getElementById("resolucionForm").style.display = "block";
    document.getElementById("resolucionInfo").textContent =
        "Averia " + resolucionActualNumero + " | Sede: " + (av.sede || "") +
        (av.zona ? " | Zona: " + av.zona : "") +
        " | Descripcion: " + (av.descripcion || "");
    document.getElementById("resolucionEquipo").textContent = "Equipo: " + (av.equipo || "No especificado");
    var fotosCont = document.getElementById("resolucionFotos");
    if (fotosCont) {
        var htmlF = (typeof htmlFotosAveria === "function") ? htmlFotosAveria(av) : "";
        fotosCont.style.display = htmlF ? "" : "none";
        if (htmlF) fotosCont.innerHTML = '<div style="font-weight:700;color:#333;font-size:.85rem;margin-bottom:4px;">Fotos de la averia</div>' + htmlF;
    }
    limpiarHora("r");
    clearResolucionForm();
    configurarTecnicoResolucion(av.asignado || "");

    document.getElementById("resolucionForm").style.display = "block";
    if (typeof mostrarMiniNav === "function") mostrarMiniNav();
    if (typeof actualizarBotonAtras === "function") actualizarBotonAtras();
}

function configurarTecnicoResolucion(asignado) {
    var select = document.getElementById("rTecnico");
    if (asignado) {
        select.innerHTML = '<option value="" disabled>Seleccionar tecnico...</option>';
        var opt = document.createElement("option");
        opt.value = asignado;
        opt.textContent = asignado;
        select.appendChild(opt);
        select.value = asignado;
        select.disabled = true;
    } else {
        select.disabled = false;
        select.innerHTML = '<option value="">Cargando tecnicos...</option>';
        fetch(APPS_SCRIPT_URL + "?accion=personal")
            .then(function (r) { return r.json(); })
            .then(function (personal) {
                var nombres = (personal || [])
                    .filter(function (p) { return p.tipo === "Tecnico"; })
                    .map(function (p) { return p.nombre; });
                populateSelect("rTecnico", nombres);
            })
            .catch(function () {
                select.innerHTML = '<option value="">Error cargando tecnicos</option>';
            });
    }
}

function toggleRealizado(el) {
    const container = el.parentElement;
    if (container && container.querySelectorAll) {
        container.querySelectorAll(".toggle-btn").forEach(b => {
            b.classList.remove("active-si", "active-no");
        });
    }
    el.classList.add(el.dataset.value === "Si" ? "active-si" : "active-no");
    const grupo = document.getElementById("rDescripcionGroup");
    const descripcion = document.getElementById("rDescripcion");
    grupo.style.display = "block";
    if (el.dataset.value === "Si") {
        descripcion.placeholder = "Describe brevemente el trabajo realizado...";
    } else {
        descripcion.placeholder = "Por que no se realizo / en que quedo...";
    }
}

async function agregarImagenesResolucion(files) {
    if (files.length > 2) {
        alert("Puedes adjuntar un maximo de 2 fotos.");
    }
    for (const file of files.slice(0, 2)) {
        if (resolucionImagenes.length >= 2) break;
        try {
            resolucionImagenes.push(await fileToImagen(file));
        } catch (err) {
            alert(err.message);
        }
    }
    renderResolucionImagenesPreview();
}

function renderResolucionImagenesPreview() {
    const container = document.getElementById("rImagenesPreview");
    container.innerHTML = "";
    resolucionImagenes.forEach(function (img, i) {
        const div = document.createElement("div");
        div.className = "imagen-preview";
        const nombre = document.createElement("span");
        nombre.textContent = (i + 1) + ". " + (img.nombre || "foto");
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "btn-remove";
        btn.textContent = "x";
        btn.onclick = function () {
            resolucionImagenes.splice(i, 1);
            renderResolucionImagenesPreview();
        };
        div.appendChild(nombre);
        div.appendChild(btn);
        container.appendChild(div);
    });
}

function enviarResolucion(e) {
    e.preventDefault();
    if (resolucionEnviando) return;

    const numero = resolucionActualNumero;
    const toggles = ["rSi", "rNo", "rProceso"].map(id => document.getElementById(id));
    const activo = toggles.find(b => b.classList.contains("active-si") || b.classList.contains("active-no"));
    const realizado = activo ? activo.dataset.value : "";
    const fh = fechaHoraAhora();
    const fecha = fh.fecha;
    const hora = fh.hora;
    const tecnico = document.getElementById("rTecnico").value;
    const descripcion = document.getElementById("rDescripcion").value.trim();

    if (!numero) {
        alert("No hay averia en curso.");
        return;
    }
    if (!realizado) {
        alert("Indica el estado de la averia (Si/En proceso/No).");
        return;
    }
    if (!tecnico) {
        alert("Selecciona el tecnico.");
        return;
    }
    if (!descripcion) {
        alert(realizado === "Si" ? "Describe el trabajo realizado." : "Escribe una descripcion.");
        return;
    }

    const repuestoToggle = document.querySelector("#rRepSi.active-si, #rRepNo.active-si, #rRepSi.active-no, #rRepNo.active-no");
    let repuestos = [];
    if (repuestoToggle && repuestoToggle.dataset.value === "Si") {
        repuestos = getRepuestos("rRepuestosRows");
        if (repuestos.length === 0) {
            alert("Agrega al menos un repuesto.");
            return;
        }
    }

    const enviadas = getImagenesEnviadas(numero);
    const imagenesNuevas = [];
    const huellasNuevas = [];
    resolucionImagenes.forEach(img => {
        const h = huellaImagen(img);
        if (enviadas.indexOf(h) === -1) {
            imagenesNuevas.push(img);
            huellasNuevas.push(h);
        }
    });

    if (imagenesNuevas.length === 0 && enviadas.length === 0) {
        alert("Debes adjuntar al menos 1 foto.");
        return;
    }

    const registro = {
        tipo: "resolucion",
        numero: numero,
        fecha: fecha,
        hora: hora,
        tecnico: tecnico,
        realizado: realizado,
        descripcion: descripcion,
        repuestos: repuestos,
        imagenes: imagenesNuevas
    };

    resolucionEnviando = true;
    const btnEnviar = document.getElementById("enviarResolucionBtn");
    btnEnviar.disabled = true;

    const esOrden = resolucionEsOrden && String(numero).indexOf("OT-") === 0;

    postJSON(registro)
        .then(() => {
            huellasNuevas.forEach(h => guardarImagenEnviada(numero, h));
            resolucionEnviando = false;
            btnEnviar.disabled = false;
            if (typeof notiRefrescar === "function") notiRefrescar(true);
            if (esOrden) borrarCacheV("ordenes_trabajo");
            const cerrada = averiaCerrada(realizado);
            if (cerrada) {
                alert((esOrden ? "Orden " : "Averia ") + numero + " cerrada correctamente.");
                if (!esOrden) marcarAveriaResuelta(numero);
                clearResolucionForm();
                finalizarResolucion();
            } else {
                alert(esOrden
                    ? "Resolucion registrada. La orden " + numero + " queda en proceso."
                    : "Resolucion enviada. Podras reingresar el codigo para volver a llenar el formulario.");
                clearResolucionForm();
                finalizarResolucion();
            }
        })
        .catch(() => {
            resolucionEnviando = false;
            btnEnviar.disabled = false;
            alert("Error al enviar. Intenta de nuevo.");
        });
}

function marcarAveriaResuelta(numero) {
    averiasDisponibles = averiasDisponibles.map(a => {
        if (String(a.numero || "") === String(numero)) {
            return Object.assign({}, a, { resuelto: true });
        }
        return a;
    });
    if (typeof borrarCacheV === "function") borrarCacheV("averias");
}

function clearResolucionForm() {
    var rTecnicoSelect = document.getElementById("rTecnico");
    rTecnicoSelect.disabled = false;
    rTecnicoSelect.value = "";
    document.getElementById("rDescripcion").value = "";
    document.getElementById("rImagenes").value = "";
    document.getElementById("rImagenesUpload").value = "";
    document.getElementById("rImagenesPreview").innerHTML = "";
    document.getElementById("rDescripcionGroup").style.display = "none";
    document.getElementById("rRepuestosGroup").style.display = "none";
    document.getElementById("rRepuestosRows").innerHTML = "";
    ["rSi", "rNo", "rProceso"].forEach(id => {
        var b = document.getElementById(id);
        if (b) b.classList.remove("active-si", "active-no");
    });
    var botonFalsa = document.getElementById("rFalsa");
    if (botonFalsa) botonFalsa.textContent = "Falsa averia";
    var rPregunta = document.getElementById("rPregunta");
    if (rPregunta) rPregunta.textContent = "¿Se arreglo la averia?";
    resolucionEsOrden = false;
    ["rRepSi", "rRepNo"].forEach(id => {
        document.getElementById(id).classList.remove("active-si", "active-no");
    });
    resolucionImagenes = [];
    limpiarHora("r");
}

function volverAlLogin() {
    resolucionActualNumero = "";
    resolucionImagenes = [];
    document.getElementById("resolucionEquipo").textContent = "";
    document.getElementById("resolucionForm").style.display = "none";
    document.getElementById("cisternaPagoSection").style.display = "none";
    document.getElementById("loginSection").style.display = "block";
    document.getElementById("codigoTecnico").value = "";
    const errorEl = document.getElementById("loginError");
    errorEl.style.display = "none";
    if (typeof ocultarMiniNav === "function") ocultarMiniNav();
}
