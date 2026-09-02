// app.js - Estado global, arranque, login y asignacion

let rutinaActual = [];
let nombreRutinaActual = "";
let tecnicoNombre = "";
let esTaller = false;
let esSemanarioRuices = false;
let parteSemanarioActual = 0;
let esDinamica = false;
let rutinaYaRenderizada = false;
let empleadoNombre = "";
let averiaImagenes = [];
let averiaEnviando = false;
let resolucionEnviando = false;
let equipoDinamicoActual = "";
let esCreadorDinamica = true;
let rutinasDinamicasGuardadas = {};
let averiasDisponibles = [];
let averiasCargadas = false;
let resolucionActualNumero = "";
let resolucionImagenes = [];
let cisternaDeudas = [];
let cisternaTotal = 0;

function cargarAverias() {
    return fetch(APPS_SCRIPT_URL + "?accion=averias")
        .then(function (r) { return r.json(); })
        .then(function (data) {
            if (Array.isArray(data)) {
                averiasDisponibles = data;
                averiasCargadas = true;
            } else if (data && Array.isArray(data.averias)) {
                averiasDisponibles = data.averias;
                averiasCargadas = true;
            }
        })
        .catch(function () { averiasCargadas = false; });
}

function buscarAveriaLocal(codigo) {
    const num = String(codigo || "").trim().toLowerCase();
    if (!num) return null;
    const buscar = function () {
        for (const a of averiasDisponibles) {
            if (String(a.numero || "").trim().toLowerCase() === num) return a;
        }
        return null;
    };
    if (averiasDisponibles.length > 0) return buscar();
    if (!averiasCargadas) return cargarAverias().then(buscar);
    return buscar();
}

function guardarRutinaDinamica(equipo, pasos) {
    if (!equipo) return;
    const actual = getRutinaDinamicaGuardada(equipo);
    const creadoPor = (actual && actual.creadoPor) || tecnicoNombre || "";
    const dato = { pasos: pasos.slice(), creadoPor: creadoPor };
    rutinasDinamicasGuardadas[equipo] = dato;
    try {
        const stored = JSON.parse(localStorage.getItem("rutinasDinamicas") || "{}");
        stored[equipo] = dato;
        localStorage.setItem("rutinasDinamicas", JSON.stringify(stored));
    } catch (err) {}
    try {
        fetch(APPS_SCRIPT_URL, {
            method: "POST",
            mode: "no-cors",
            body: JSON.stringify({ tipo: "rutina", equipo: equipo, pasos: pasos, creadoPor: creadoPor })
        }).catch(() => {});
    } catch (err) {}
}

function getRutinaDinamicaGuardada(equipo) {
    let dato = rutinasDinamicasGuardadas[equipo];
    if (dato && dato.pasos && dato.pasos.length > 0) return dato;
    try {
        const stored = JSON.parse(localStorage.getItem("rutinasDinamicas") || "{}");
        const v = stored[equipo];
        if (v) {
            dato = Array.isArray(v)
                ? { pasos: v.slice(), creadoPor: "" }
                : { pasos: (v.pasos || []).slice(), creadoPor: v.creadoPor || "" };
            if (dato.pasos.length > 0) {
                rutinasDinamicasGuardadas[equipo] = dato;
                return dato;
            }
        }
    } catch (err) {}
    return null;
}

function cargarRutinasDinamicas() {
    return fetch(APPS_SCRIPT_URL + "?accion=rutinas")
        .then(r => r.json())
        .then(data => {
            if (!data) return;
            let stored = {};
            try {
                stored = JSON.parse(localStorage.getItem("rutinasDinamicas") || "{}");
            } catch (err) {}
            const cambios = {};
            for (const eq in data) {
                const v = data[eq];
                const bPasos = Array.isArray(v) ? v.slice() : (v.pasos || []).slice();
                if (bPasos.length === 0) continue;
                const bCreado = Array.isArray(v) ? "" : (v.creadoPor || "");
                const local = stored[eq];
                const lPasos = local && (Array.isArray(local) ? local.slice() : (local.pasos || []).slice());
                const lCreado = local && !Array.isArray(local) ? (local.creadoPor || "") : "";
                const creadoPor = bCreado || lCreado;
                const pasos = bPasos.length >= (lPasos || []).length ? bPasos : lPasos;
                const dato = { pasos: pasos.slice(), creadoPor: creadoPor };
                cambios[eq] = dato;
                stored[eq] = dato;
            }
            for (const eq in cambios) {
                rutinasDinamicasGuardadas[eq] = cambios[eq];
            }
            try {
                localStorage.setItem("rutinasDinamicas", JSON.stringify(stored));
            } catch (err) {}
        })
        .catch(() => {});
}

document.addEventListener("DOMContentLoaded", () => {
    inicializarDatosEquipos();
    cargarRutinasDinamicas();
    cargarAverias();
    document.getElementById("btnLogin").addEventListener("click", loginTecnico);
    document.getElementById("codigoTecnico").addEventListener("keydown", function (e) {
        if (e.key === "Enter") loginTecnico();
    });

    document.getElementById("btnPaso3").addEventListener("click", function () {
        if (esTaller && esSemanarioRuices) {
            semanarioSiguiente();
        } else {
            irAlPaso3();
        }
        actualizarMiniNav();
    });

    document.getElementById("btnAtras3").addEventListener("click", function () {
        document.getElementById("paso3").style.display = "none";
        document.getElementById("paso2").style.display = "block";
        actualizarMiniNav();
    });

    document.getElementById("averiaForm").addEventListener("submit", enviarAveria);

    document.getElementById("resolucionForm").addEventListener("submit", enviarResolucion);
    document.getElementById("btnAtrasResolucion").addEventListener("click", volverAlLogin);
    document.getElementById("btnAsignarTecnico").addEventListener("click", function() { asignarTecnicoWeb(); });
    document.getElementById("rImagenes").addEventListener("change", async function () {
        await agregarImagenesResolucion(Array.from(this.files));
        this.value = "";
    });
    document.getElementById("rImagenesUpload").addEventListener("change", async function () {
        await agregarImagenesResolucion(Array.from(this.files));
        this.value = "";
    });

    document.getElementById("aSedes").addEventListener("change", function () {
        const sede = this.value;
        const zonas = getAveriaZonas(sede);
        const zonaGroup = document.getElementById("aZonaGroup");
        const zonaSelect = document.getElementById("aZona");
        const equipoGroup = document.getElementById("aEquipoGroup");
        const equipoLibreGroup = document.getElementById("aEquipoLibreGroup");
        const equipoExteriorGroup = document.getElementById("aEquipoExteriorGroup");
        const equipoOtroGroup = document.getElementById("aEquipoOtroGroup");

        equipoExteriorGroup.style.display = "none";
        document.getElementById("aEquipoExterior").value = "";
        equipoOtroGroup.style.display = "none";
        document.getElementById("aEquipoOtro").value = "";

        if (sede === "EVENTO") {
            zonaGroup.style.display = "none";
            zonaSelect.value = "";
            equipoGroup.style.display = "none";
            resetCombobox("aEquipo", "Seleccionar equipo...");
            equipoLibreGroup.style.display = "block";
            document.getElementById("aEquipoLibre").value = "";
            document.getElementById("aEventoLibre").value = "";
            actualizarLabelFotos();
            return;
        }

        equipoGroup.style.display = "block";
        equipoLibreGroup.style.display = "none";
        document.getElementById("aEquipoLibre").value = "";
        document.getElementById("aEventoLibre").value = "";

        if (zonas.length > 0) {
            zonaGroup.style.display = "block";
            populateSelect("aZona", zonas);
            resetCombobox("aEquipo", "Seleccionar equipo...");
        } else {
            zonaGroup.style.display = "none";
            zonaSelect.value = "";
            const equipos = SEDE_EQUIPOS[sede] || [];
            populateSelect("aEquipo", equipos, true);
        }
        actualizarLabelFotos();
    });

    document.getElementById("aZona").addEventListener("change", function () {
        const sede = document.getElementById("aSedes").value;
        const zona = this.value;
        const equipoGroup = document.getElementById("aEquipoGroup");
        const equipoExteriorGroup = document.getElementById("aEquipoExteriorGroup");
        const equipoOtroGroup = document.getElementById("aEquipoOtroGroup");

        equipoOtroGroup.style.display = "none";
        document.getElementById("aEquipoOtro").value = "";

        if (zona === "EXTERIOR") {
            equipoGroup.style.display = "none";
            equipoExteriorGroup.style.display = "block";
            document.getElementById("aEquipoExterior").value = "";
            return;
        }
        equipoExteriorGroup.style.display = "none";
        equipoGroup.style.display = "block";
        if (zona === "OTROS") {
            populateSelect("aEquipo", SEDE_EQUIPOS[sede] || [], true);
            return;
        }
        const zonaData = ZONA_EQUIPOS[sede]?.[zona] || [];
        if (zonaData.length > 0) {
            populateSelect("aEquipo", zonaData, true);
        } else {
            populateSelect("aEquipo", SEDE_EQUIPOS[sede] || [], true);
        }
    });

    document.getElementById("aEquipo").addEventListener("change", function () {
        const equipoOtroGroup = document.getElementById("aEquipoOtroGroup");
        if (this.value === "__OTRO__") {
            equipoOtroGroup.style.display = "block";
            document.getElementById("aEquipoOtro").value = "";
            document.getElementById("aEquipoOtro").focus();
        } else {
            equipoOtroGroup.style.display = "none";
            document.getElementById("aEquipoOtro").value = "";
        }
        actualizarLabelFotos();
    });

    document.getElementById("aImagenes").addEventListener("change", async function () {
        const files = Array.from(this.files);
        if (files.length > 2) {
            alert("Puedes adjuntar un maximo de 2 fotos.");
        }
        for (const file of files.slice(0, 2)) {
            if (averiaImagenes.length >= 2) break;
            try {
                averiaImagenes.push(await fileToImagen(file));
            } catch (err) {
                alert(err.message);
            }
        }
        this.value = "";
        renderImagenesPreview();
    });

    document.getElementById("aImagenesUpload").addEventListener("change", async function () {
        const files = Array.from(this.files);
        if (files.length > 2) {
            alert("Puedes adjuntar un maximo de 2 fotos.");
        }
        for (const file of files.slice(0, 2)) {
            if (averiaImagenes.length >= 2) break;
            try {
                averiaImagenes.push(await fileToImagen(file));
            } catch (err) {
                alert(err.message);
            }
        }
        this.value = "";
        renderImagenesPreview();
    });

    document.getElementById("mantenimiento").addEventListener("change", function () {
        rutinaYaRenderizada = false;
        document.getElementById("otroMantenimientoGroup").style.display = this.value === "OTRO" ? "block" : "none";
        if (this.value !== "OTRO") {
            document.getElementById("otroDescripcion").value = "";
            document.getElementById("otroRepuestosGroup").style.display = "none";
            document.getElementById("otroRepuestosRows").innerHTML = "";
            document.getElementById("otroRepSi").classList.remove("active-si", "active-no");
            document.getElementById("otroRepNo").classList.remove("active-si", "active-no");
        }
    });

    document.getElementById("sedes").addEventListener("change", function () {
        const sede = this.value;
        const zonas = SEDE_ZONAS[sede] || [];
        const zonaGroup = document.getElementById("zonaGroup");
        const zonaSelect = document.getElementById("zona");
        const eqExteriorGroup = document.getElementById("equipoExteriorGroup");

        eqExteriorGroup.style.display = "none";
        document.getElementById("equipoExterior").value = "";
        document.getElementById("equipo").required = true;

        if (zonas.length > 0) {
            zonaGroup.style.display = "block";
            populateSelect("zona", zonas);
            resetCombobox("equipo", "Seleccionar equipo...");
        } else {
            zonaGroup.style.display = "none";
            zonaSelect.value = "";
            const equipos = SEDE_EQUIPOS[sede] || [];
            populateSelect("equipo", equipos, true);
        }
        document.getElementById("equipo").required = true;
        document.getElementById("mantenimiento").required = true;
        document.getElementById("checkinsContainer").innerHTML = "";
        rutinaActual = [];
        nombreRutinaActual = "";
        esTaller = false;
        esSemanarioRuices = false;
        parteSemanarioActual = 0;
        esDinamica = false;
        rutinaYaRenderizada = false;
        resetPaso3();
        document.getElementById("paso2").style.display = "none";
        document.getElementById("paso1").style.display = "block";
    });

    document.getElementById("zona").addEventListener("change", function () {
        const sede = document.getElementById("sedes").value;
        const zona = this.value;
        const eqGroup = document.getElementById("equipoGroup");
        const eqExteriorGroup = document.getElementById("equipoExteriorGroup");

        rutinaYaRenderizada = false;

        if (zona && zona.toUpperCase().indexOf("SEMANERO") === 0) {
            eqExteriorGroup.style.display = "none";
            eqGroup.style.display = "none";
            document.getElementById("mantenimientoGroup").style.display = "none";
            document.getElementById("formActions").style.display = "flex";
            document.getElementById("equipo").required = false;
            document.getElementById("mantenimiento").required = false;
            esTaller = true;
            esSemanarioRuices = sede === "RUICES";
        } else if (zona === "EXTERIOR") {
            eqGroup.style.display = "none";
            eqExteriorGroup.style.display = "block";
            document.getElementById("equipoExterior").value = "";
            document.getElementById("mantenimientoGroup").style.display = "block";
            document.getElementById("equipo").required = false;
            document.getElementById("mantenimiento").required = true;
            esTaller = false;
            esSemanarioRuices = false;
        } else {
            eqExteriorGroup.style.display = "none";
            eqGroup.style.display = "block";
            document.getElementById("mantenimientoGroup").style.display = "block";
            document.getElementById("equipo").required = true;
            document.getElementById("mantenimiento").required = true;
            esTaller = false;
            esSemanarioRuices = false;
            if (zona === "OTROS") {
                populateSelect("equipo", SEDE_EQUIPOS[sede] || [], true);
            } else {
            const zonaData = ZONA_EQUIPOS[sede]?.[zona] || [];
            if (zonaData.length > 0) {
                    populateSelect("equipo", zonaData, true);
            } else {
                    populateSelect("equipo", SEDE_EQUIPOS[sede] || [], true);
                }
            }
        }
        document.getElementById("checkinsContainer").innerHTML = "";
        rutinaActual = [];
        nombreRutinaActual = "";
        esDinamica = false;
        resetPaso3();
        document.getElementById("paso2").style.display = "none";
        document.getElementById("paso1").style.display = "block";
    });

    document.getElementById("equipo").addEventListener("change", function () {
        rutinaYaRenderizada = false;
        const equipoOtroGroup = document.getElementById("equipoOtroGroup");
        if (this.value === "__OTRO__") {
            equipoOtroGroup.style.display = "block";
            document.getElementById("equipoOtro").value = "";
            document.getElementById("equipoOtro").focus();
        } else {
            equipoOtroGroup.style.display = "none";
            document.getElementById("equipoOtro").value = "";
        }
    });

    document.getElementById("btnSiguiente").addEventListener("click", irAlPaso2);

    document.getElementById("btnAtras").addEventListener("click", function () {
        if (esTaller && esSemanarioRuices && parteSemanarioActual > 0) {
            parteSemanarioActual--;
            mostrarParteSemanario();
            setPaso2Buttons();
            actualizarMiniNav();
            return;
        }
        document.getElementById("paso2").style.display = "none";
        document.getElementById("paso1").style.display = "block";
        actualizarMiniNav();
    });

    document.getElementById("checkinForm").addEventListener("submit", enviarFormulario);

    var urlParams = new URLSearchParams(window.location.search);
    var avParam = urlParams.get("av");
    if (avParam) {
        mostrarInterfazAsignar(avParam);
    }
    var cisternaPagoParam = urlParams.get("cisterna_pago");
    if (cisternaPagoParam) {
        mostrarInterfazPagoCisterna();
    }
    var calendarioParam = urlParams.get("calendario");
    if (calendarioParam) {
        mostrarInterfazCalendario();
    }

    mostrarMiniNav();
});

function mostrarInterfazAsignar(numeroAv) {
    document.getElementById("loginSection").style.display = "none";
    document.getElementById("checkinForm").style.display = "none";
    document.getElementById("averiaForm").style.display = "none";
    document.getElementById("resolucionForm").style.display = "none";
    document.getElementById("asignarSection").style.display = "block";
    document.getElementById("asignarInfo").textContent = "Averia: " + numeroAv;
    window._avAsignar = numeroAv;

    var sel = document.getElementById("selTecnicoAsignar");
    sel.innerHTML = '<option value="">Cargando tecnicos...</option>';
    document.getElementById("btnAsignarTecnico").disabled = true;

    fetch(APPS_SCRIPT_URL + "?accion=personal")
        .then(function (r) { return r.json(); })
        .then(function (personal) {
            sel.innerHTML = '<option value="">Seleccionar tecnico...</option>';
            var found = false;
            (personal || []).forEach(function (p) {
                if (p.tipo === "Tecnico") {
                    var opt = document.createElement("option");
                    opt.value = p.nombre;
                    opt.textContent = p.nombre;
                    sel.appendChild(opt);
                    found = true;
                }
            });
            if (found) {
                document.getElementById("btnAsignarTecnico").disabled = false;
            } else {
                sel.innerHTML = '<option value="">No hay tecnicos disponibles</option>';
            }
        })
        .catch(function () {
            sel.innerHTML = '<option value="">Error cargando tecnicos</option>';
        });

    mostrarMiniNav();
}

function asignarTecnicoWeb() {
    var sel = document.getElementById("selTecnicoAsignar");
    var tecnicoNombre = sel.value;
    if (!tecnicoNombre) {
        alert("Selecciona un tecnico");
        return;
    }
    var numeroAv = window._avAsignar;
    var btn = document.getElementById("btnAsignarTecnico");
    var msg = document.getElementById("asignarMsg");
    var waDiv = document.getElementById("whatsappLink");

    btn.disabled = true;
    btn.textContent = "Asignando...";

    fetch(APPS_SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
        body: JSON.stringify({ tipo: "asignar_averia", numero: numeroAv, tecnicoNombre: tecnicoNombre })
    }).then(function() {
        return fetch(APPS_SCRIPT_URL + "?accion=tecnico_contacto&nombre=" + encodeURIComponent(tecnicoNombre))
            .then(function (r) { return r.json(); })
            .catch(function () { return null; });
    }).then(function (contacto) {
        msg.innerHTML = '<div style="color:#2e7d32;font-weight:600;">Tecnico asignado correctamente</div>';
        if (contacto && contacto.whatsapp) {
            var waUrl = "https://wa.me/" + contacto.whatsapp.replace(/[^0-9]/g, "") + "?text=" + encodeURIComponent("Hola " + tecnicoNombre + ", se te ha asignado la averia " + numeroAv);
            waDiv.style.display = "block";
            waDiv.innerHTML = '<a href="' + waUrl + '" target="_blank" style="display:inline-block;background:#25d366;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;width:100%;text-align:center;">Abrir WhatsApp y notificar</a>';
        }
        btn.disabled = false;
        btn.textContent = "Asignar y Notificar";
    }).catch(function() {
        msg.innerHTML = '<div style="color:#d32f2f;font-weight:600;">Error de conexion</div>';
        btn.disabled = false;
        btn.textContent = "Asignar y Notificar";
    });
}

function loginTecnico() {
    const codigo = document.getElementById("codigoTecnico").value.trim();
    const errorEl = document.getElementById("loginError");

    const continuarConPersonal = function (personal, esMantenimiento) {
        if (personal && personal.tipo === "Tecnico" && esMantenimiento) {
            tecnicoNombre = personal.nombre;
            errorEl.style.display = "none";
            document.getElementById("loginSection").style.display = "none";
            document.getElementById("checkinForm").style.display = "block";
            document.getElementById("tecnicoInfo").textContent = "Tecnico: " + tecnicoNombre;
            populateSelect("sedes", SEDES_CHECKIN);
            populateSelect("mantenimiento", MANTENIMIENTOS);
            limpiarHora();
            mostrarMiniNav();
            return;
        }
        if (personal && personal.tipo === "Tecnico" && !esMantenimiento) {
            tecnicoNombre = personal.nombre;
            empleadoNombre = personal.nombre;
            errorEl.style.display = "none";
            document.getElementById("loginSection").style.display = "none";
            document.getElementById("averiaForm").style.display = "block";
            document.getElementById("empleadoInfo").textContent = "Tecnico: " + tecnicoNombre;
            populateSelect("aSedes", SEDES);
            limpiarHora("a");
            mostrarMiniNav();
            return;
        }
        if (personal && personal.tipo === "Empleado") {
            empleadoNombre = personal.nombre;
            errorEl.style.display = "none";
            document.getElementById("loginSection").style.display = "none";
            document.getElementById("averiaForm").style.display = "block";
            document.getElementById("empleadoInfo").textContent = "Usuario: " + empleadoNombre;
            populateSelect("aSedes", SEDES);
            limpiarHora("a");
            mostrarMiniNav();
            return;
        }
        errorEl.textContent = "Credencial o codigo de averia no valido. Solicita tu registro al administrador.";
        errorEl.style.display = "block";
        document.getElementById("codigoTecnico").value = "";
    };

    const procesarLogin = function (av) {
        if (av) {
            if (av.resuelto) {
                errorEl.textContent = "La averia " + av.numero + " ya fue resuelta.";
                errorEl.style.display = "block";
                document.getElementById("codigoTecnico").value = "";
                return;
            }
            if (av.asignado) {
                tecnicoNombre = av.asignado;
                abrirResolucion(av);
                return;
            }
            abrirResolucion(av);
            return;
        }

        var esMantenimiento = /2$/.test(codigo) && /^\d+$/.test(codigo);
        var cedulaBusqueda = esMantenimiento ? codigo.slice(0, -1) : codigo;

        fetch(APPS_SCRIPT_URL + "?accion=login&cedula=" + encodeURIComponent(cedulaBusqueda))
            .then(function (r) { return r.json(); })
            .then(function (resultado) {
                var personal = resultado && resultado.status === "ok" ? resultado : null;
                continuarConPersonal(personal, esMantenimiento);
            })
            .catch(function () {
                errorEl.textContent = "Error de conexion. Intenta de nuevo.";
                errorEl.style.display = "block";
            });
    };

    if (/^av/i.test(codigo)) {
        Promise.resolve(buscarAveriaLocal(codigo)).then(function(av) {
            if (av && !av.asignado) {
                fetch(APPS_SCRIPT_URL, {
                    method: "POST",
                    mode: "no-cors",
                    body: JSON.stringify({ tipo: "obtener_asignacion", numero: codigo.toUpperCase() })
                }).catch(function() {});
                procesarLogin(av);
            } else {
                procesarLogin(av);
            }
        });
        return;
    }

    procesarLogin(null);
}

function actualizarLabelFotos() {
    var sede = document.getElementById("aSedes").value;
    var equipoSelect = document.getElementById("aEquipo").value;
    var esEvento = sede === "EVENTO";
    var esOtro = equipoSelect === "__OTRO__";
    var label = document.getElementById("aFotosLabel");
    if (esEvento || esOtro) {
        label.textContent = "Fotos (maximo 2) - Obligatoria";
        label.style.color = "#d32f2f";
        label.style.fontWeight = "700";
    } else {
        label.textContent = "Fotos (maximo 2) - Opcional";
        label.style.color = "";
        label.style.fontWeight = "";
    }
}

function mostrarMiniNav() {
    var nav = document.getElementById("miniNav");
    if (!nav) return;
    var login = document.getElementById("loginSection");
    if (login && login.style.display !== "none") {
        nav.style.display = "none";
        return;
    }
    nav.style.display = "block";
    window.removeEventListener("scroll", actualizarMiniNav);
    window.addEventListener("scroll", actualizarMiniNav);
    actualizarMiniNav();
}

function ocultarMiniNav() {
    var nav = document.getElementById("miniNav");
    if (nav) nav.style.display = "none";
    window.removeEventListener("scroll", actualizarMiniNav);
}

function esElementoVisible(el) {
    if (!el) return false;
    var node = el;
    while (node && node !== document) {
        if (node.style && node.style.display === "none") return false;
        if (node.hidden) return false;
        node = node.parentElement;
    }
    return true;
}

function obtenerObjetivoMiniNav() {
    var checkinForm = document.getElementById("checkinForm");
    if (checkinForm && checkinForm.style.display !== "none") {
        var btnS = document.getElementById("btnSiguiente");
        if (btnS && esElementoVisible(btnS)) return btnS;
        var btnP3 = document.getElementById("btnPaso3");
        if (btnP3 && esElementoVisible(btnP3)) return btnP3;
        var btnEnviar = checkinForm.querySelector("button[type='submit']");
        if (btnEnviar && esElementoVisible(btnEnviar)) return btnEnviar;
        return checkinForm;
    }

    var secciones = ["loginSection", "averiaForm", "resolucionForm", "asignarSection", "cisternaPagoSection"];
    for (var i = 0; i < secciones.length; i++) {
        var el = document.getElementById(secciones[i]);
        if (el && el.style.display !== "none") {
            var botones = el.querySelectorAll("button");
            var btn = null;
            for (var b = 0; b < botones.length; b++) {
                var tipo = botones[b].getAttribute("type");
                var esToggle = botones[b].classList.contains("toggle-btn") || botones[b].classList.contains("mini-nav-btn");
                if (esToggle) continue;
                if ((tipo === "submit" || botones[b].textContent.indexOf("Enviar") !== -1) && esElementoVisible(botones[b])) { btn = botones[b]; break; }
            }
            return btn || el;
        }
    }
    return null;
}

function actualizarMiniNav() {
    var nav = document.getElementById("miniNav");
    var btnMini = document.getElementById("btnMiniNav");
    if (!nav || !btnMini || nav.style.display === "none") return;

    var objetivo = obtenerObjetivoMiniNav();
    if (!objetivo) return;

    var rect = objetivo.getBoundingClientRect();
    var visibleObjetivo = (rect.top > 0 && rect.top < window.innerHeight * 0.75);

    nav.style.display = "block";
    if (visibleObjetivo) {
        btnMini.textContent = "↑";
        btnMini.title = "Volver arriba";
        btnMini.setAttribute("data-dir", "up");
    } else {
        btnMini.textContent = "↓";
        btnMini.title = "Bajar";
        btnMini.setAttribute("data-dir", "down");
    }
}

function irMiniNav() {
    var btnMini = document.getElementById("btnMiniNav");
    var dir = btnMini ? btnMini.getAttribute("data-dir") : "down";
    if (dir === "up") {
        var contenedor = document.getElementById("checkinForm");
        if (!contenedor || contenedor.style.display === "none") {
            contenedor = null;
            var secciones = ["loginSection", "averiaForm", "resolucionForm", "asignarSection", "cisternaPagoSection"];
            for (var i = 0; i < secciones.length; i++) {
                var el = document.getElementById(secciones[i]);
                if (el && el.style.display !== "none") { contenedor = el; break; }
            }
        }
        if (!contenedor) contenedor = document.body;
        contenedor.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
        var objetivo = obtenerObjetivoMiniNav();
        if (objetivo) objetivo.scrollIntoView({ behavior: "smooth", block: "center" });
    }
}
