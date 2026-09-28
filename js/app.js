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
let mantenimientosHistorial = [];
let mantenimientosHistorialCargados = false;
let resolucionActualNumero = "";
let resolucionImagenes = [];
let cisternaDeudas = [];
let cisternaTotal = 0;
let usuarioActual = null;
// El PIN vive solo en memoria mientras la sesion esta abierta: se usa para
// pedirle al servidor el ticket de asistencia y no se guarda en ningun sitio.
let pinEnMemoria = "";
let moduloActivo = "inicio";
let menuAbierto = false;
let tipoMantenimientoActual = "";
let historialModulos = [];
let tareasInicioFiltro = "todas";
let tareasInicioCtx = null;
let modulosCompartidos = false;
let compartirAdmin = { Admin: [], Admin2: [] };
let compartirPaso = "inicio";
let compartirVerificado = false;
let compartirModo = "todos";

const LOGIN_MAX_INTENTOS = 5;
const LOGIN_BLOQUEO_MS = 60 * 60 * 1000;
const LOGIN_STORAGE_KEY = "loginAttempts";
const DEVICE_ID_KEY = "deviceId";
let loginCountdownInterval = null;

function getDeviceId() {
    try {
        var id = localStorage.getItem(DEVICE_ID_KEY);
        if (id) return id;
        id = "dev-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 12);
        localStorage.setItem(DEVICE_ID_KEY, id);
        return id;
    } catch (e) {
        return "dev-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 12);
    }
}

function getLoginAttempts() {
    try {
        return JSON.parse(localStorage.getItem(LOGIN_STORAGE_KEY) || '{"count":0,"blockedUntil":0}');
    } catch (e) {
        return { count: 0, blockedUntil: 0 };
    }
}

function saveLoginAttempts(data) {
    try {
        localStorage.setItem(LOGIN_STORAGE_KEY, JSON.stringify(data));
    } catch (e) {}
}

function isLoginBlocked() {
    var data = getLoginAttempts();
    if (data.blockedUntil && Date.now() < data.blockedUntil) return true;
    if (data.blockedUntil && Date.now() >= data.blockedUntil) {
        saveLoginAttempts({ count: 0, blockedUntil: 0 });
    }
    return false;
}

function registerLoginFailure() {
    var data = getLoginAttempts();
    data.count++;
    if (data.count >= LOGIN_MAX_INTENTOS) {
        data.blockedUntil = Date.now() + LOGIN_BLOQUEO_MS;
        data.count = LOGIN_MAX_INTENTOS;
    }
    saveLoginAttempts(data);
    return data;
}

function resetLoginAttempts() {
    saveLoginAttempts({ count: 0, blockedUntil: 0 });
}

function mostrarBloqueoLogin(bloqueadoHastaUnix) {
    var info = document.getElementById("loginBlockInfo");
    var data = getLoginAttempts();
    if (bloqueadoHastaUnix) {
        data.blockedUntil = bloqueadoHastaUnix;
        data.count = LOGIN_MAX_INTENTOS;
        saveLoginAttempts(data);
    }
    if (!data.blockedUntil || Date.now() >= data.blockedUntil) {
        info.style.display = "none";
        return;
    }
    var btn = document.getElementById("btnLogin");
    var input = document.getElementById("codigoTecnico");
    btn.disabled = true;
    input.disabled = true;
    info.className = "blocked";
    info.style.display = "block";

    if (loginCountdownInterval) clearInterval(loginCountdownInterval);
    loginCountdownInterval = setInterval(function () {
        var restante = data.blockedUntil - Date.now();
        if (restante <= 0) {
            clearInterval(loginCountdownInterval);
            loginCountdownInterval = null;
            info.style.display = "none";
            btn.disabled = false;
            input.disabled = false;
            saveLoginAttempts({ count: 0, blockedUntil: 0 });
            return;
        }
        var mins = Math.floor(restante / 60000);
        var secs = Math.floor((restante % 60000) / 1000);
        info.innerHTML = "Demasiados intentos fallidos.<br>Dispositivo bloqueado temporalmente.<span class='countdown'>" + mins + "m " + (secs < 10 ? "0" : "") + secs + "s</span>";
    }, 1000);
    var restante = data.blockedUntil - Date.now();
    var mins = Math.floor(restante / 60000);
    var secs = Math.floor((restante % 60000) / 1000);
    info.innerHTML = "Demasiados intentos fallidos.<br>Dispositivo bloqueado temporalmente.<span class='countdown'>" + mins + "m " + (secs < 10 ? "0" : "") + secs + "s</span>";
}

// El PIN solo aparece si el servidor lo pide: asi quien todavia no lo tiene
// entra igual (cedula) y quien ya lo tiene lo escribe.
function mostrarCampoPin() {
    var grupo = document.getElementById("loginPinGroup");
    if (grupo) grupo.style.display = "block";
    var input = document.getElementById("pinTecnico");
    if (input) {
        input.value = "";
        input.focus();
    }
}

function mostrarIntentosRestantes(restantes) {
    var info = document.getElementById("loginBlockInfo");
    if (restantes > 0 && restantes < LOGIN_MAX_INTENTOS) {
        info.className = "warning";
        info.style.display = "block";
        info.innerHTML = "Te quedan <strong>" + restantes + "</strong> intento" + (restantes > 1 ? "s" : "") + " antes de ser bloqueado.";
    } else {
        info.style.display = "none";
    }
}

const NUESTROS_ROLES = {
    ADMIN: "Admin",
    ADMIN2: "Admin2",
    TECNICO: "Tecnico",
    GERENTE: "Gerente",
    USUARIO: "Usuario",
    PORTERO: "Portero"
};

function esRolAdmin(rol) {
    return rol === NUESTROS_ROLES.ADMIN || rol === NUESTROS_ROLES.ADMIN2;
}

const MODULOS_OPCIONALES_ADMIN = [
    { id: "aseo", label: "Aseo", icono: "🧹" },
    { id: "documentos", label: "Documentos", icono: "📄" },
    { id: "cuentas", label: "Cuentas", icono: "💰" }
];

const MODULOS_ADMIN_EXTRA_KEY = "modulosAdminExtraV2";

function claveModulosAdminExtra(nombre) {
    return MODULOS_ADMIN_EXTRA_KEY + "_" + String(nombre || "").trim().toUpperCase();
}

function modulosAdminHabilitados(rol, nombre) {
    var stored = null;
    try {
        var raw = localStorage.getItem(claveModulosAdminExtra(nombre));
        if (raw) stored = JSON.parse(raw);
    } catch (e) { stored = null; }
    var out = {};
    MODULOS_OPCIONALES_ADMIN.forEach(function (m) {
        if (stored === null) out[m.id] = false;
        else out[m.id] = stored.indexOf(m.id) !== -1;
    });
    return out;
}

function modulosAdminCompleto(rol, nombre) {
    var base = MODULOS_POR_ROL[rol] || MODULOS_POR_ROL[NUESTROS_ROLES.USUARIO];
    var baseIds = base.map(function (m) { return m.id; });
    var hab = modulosAdminHabilitados(rol, nombre);
    var final = base.filter(function (m) {
        var opcional = MODULOS_OPCIONALES_ADMIN.some(function (o) { return o.id === m.id; });
        return !opcional || hab[m.id];
    });
    var extras = MODULOS_OPCIONALES_ADMIN.filter(function (m) {
        return hab[m.id] && baseIds.indexOf(m.id) === -1;
    }).map(function (m) { return { id: m.id, label: m.label }; });
    if (final.length && final[final.length - 1].id === "perfil") {
        final = final.slice(0, final.length - 1).concat(extras, [final[final.length - 1]]);
    } else {
        final = final.concat(extras);
    }
    return final;
}

function catalogoModulosAdmin() {
    var out = [], visto = {};
    [NUESTROS_ROLES.ADMIN, NUESTROS_ROLES.ADMIN2].forEach(function (rol) {
        (MODULOS_POR_ROL[rol] || []).forEach(function (m) {
            if (!visto[m.id]) { visto[m.id] = true; out.push(m.id); }
        });
    });
    MODULOS_OPCIONALES_ADMIN.forEach(function (m) {
        if (!visto[m.id]) { visto[m.id] = true; out.push(m.id); }
    });
    return out;
}

function modulosExclusivosAdmin(rol) {
    var otro = rol === NUESTROS_ROLES.ADMIN ? NUESTROS_ROLES.ADMIN2 : NUESTROS_ROLES.ADMIN;
    var baseOtro = (MODULOS_POR_ROL[otro] || []).map(function (m) { return m.id; });
    return catalogoModulosAdmin().filter(function (id) { return baseOtro.indexOf(id) === -1; });
}

function etiquetaModuloAdmin(id) {
    var base = MODULOS_POR_ROL[NUESTROS_ROLES.ADMIN] || [];
    for (var i = 0; i < base.length; i++) {
        if (base[i].id === id) return base[i].label;
    }
    for (var j = 0; j < MODULOS_OPCIONALES_ADMIN.length; j++) {
        if (MODULOS_OPCIONALES_ADMIN[j].id === id) return MODULOS_OPCIONALES_ADMIN[j].label;
    }
    return id;
}

function modulosAdminPara(rol, nombre) {
    if (rol === NUESTROS_ROLES.ADMIN) {
        var mios = modulosAdminCompleto(NUESTROS_ROLES.ADMIN, nombre);
        var idsMios = {};
        mios.forEach(function (m) { idsMios[m.id] = true; });
        (compartirAdmin[NUESTROS_ROLES.ADMIN2] || []).forEach(function (id) {
            if (!idsMios[id]) {
                mios.push({ id: id, label: etiquetaModuloAdmin(id) });
                idsMios[id] = true;
            }
        });
        return mios;
    }
    var base = (MODULOS_POR_ROL[NUESTROS_ROLES.ADMIN2] || []).slice();
    var idsBase = {};
    base.forEach(function (m) { idsBase[m.id] = true; });
    var mapaAdmin = {};
    modulosAdminCompleto(NUESTROS_ROLES.ADMIN, nombre).forEach(function (m) { mapaAdmin[m.id] = m; });
    (compartirAdmin[NUESTROS_ROLES.ADMIN] || []).forEach(function (id) {
        if (!idsBase[id] && mapaAdmin[id]) {
            base.push(mapaAdmin[id]);
            idsBase[id] = true;
        }
    });
    return base;
}

function toggleModuloAdmin(id) {
    if (!usuarioActual || !esRolAdmin(usuarioActual.rol)) return;
    if (!MODULOS_OPCIONALES_ADMIN.some(function (o) { return o.id === id; })) return;
    var nombre = usuarioActual.nombre;
    var hab = modulosAdminHabilitados(usuarioActual.rol, nombre);
    hab[id] = !hab[id];
    var lista = [];
    MODULOS_OPCIONALES_ADMIN.forEach(function (m) { if (hab[m.id]) lista.push(m.id); });
    localStorage.setItem(claveModulosAdminExtra(nombre), JSON.stringify(lista));
    reconstruirMenuAdmin();
}

function reconstruirMenuAdmin() {
    if (!usuarioActual || !esRolAdmin(usuarioActual.rol)) return;
    var rol = usuarioActual.rol;
    construirMenu(rol);
    var panel = document.getElementById("mainMenu");
    var btn = document.getElementById("btnHamburguesa");
    if (panel) {
        panel.classList.add("abierto");
        panel.style.display = "flex";
    }
    if (btn) {
        btn.classList.add("abierto");
        btn.textContent = "✕";
    }
    menuAbierto = true;
    var disponible = modulosAdminPara(rol, usuarioActual.nombre).some(function (m) { return m.id === moduloActivo; });
    if (!disponible) {
        navegar("inicio");
        return;
    }
    var botones = document.querySelectorAll(".main-menu .menu-btn[data-modulo]");
    botones.forEach(function (b) {
        b.classList.toggle("active", b.getAttribute("data-modulo") === moduloActivo);
    });
}

function crearSelectorModulosAdmin(rol, nombre) {
    var cont = document.createElement("div");
    cont.className = "menu-modulos-extra";
    var titulo = document.createElement("div");
    titulo.className = "menu-modulos-extra-titulo";
    titulo.textContent = "Modulos opcionales";
    cont.appendChild(titulo);
    var hab = modulosAdminHabilitados(rol, nombre);
    MODULOS_OPCIONALES_ADMIN.forEach(function (m) {
        var chip = document.createElement("button");
        chip.type = "button";
        chip.className = "menu-modulo-chip" + (hab[m.id] ? " activo" : "");
        chip.textContent = m.icono + " " + m.label;
        chip.addEventListener("click", function () { toggleModuloAdmin(m.id); });
        cont.appendChild(chip);
    });
    return cont;
}

const MODULOS_POR_ROL = {
    [NUESTROS_ROLES.ADMIN]: [
        { id: "inicio", label: "Inicio" },
        { id: "mantenimiento", label: "Mantenimiento" },
        { id: "averias", label: "Averias" },
        { id: "ordenes", label: "Orden de trabajo" },
        { id: "solicitudes", label: "Solicitudes" },
        { id: "repuestos", label: "Repuestos" },
        { id: "preventivos", label: "Preventivos" },
        { id: "empleados", label: "Empleados" },
        { id: "asistencia", label: "Asistencia" },
        { id: "historial", label: "Historial" },
        { id: "it", label: "IT" }
    ],
    [NUESTROS_ROLES.ADMIN2]: [
        { id: "inicio", label: "Inicio" },
        { id: "averias", label: "Averias" },
        { id: "solicitudes", label: "Solicitudes" },
        { id: "it", label: "IT" },
        { id: "aseo", label: "Aseo" },
        { id: "documentos", label: "Documentos" },
        { id: "cuentas", label: "Cuentas" }
    ],
    [NUESTROS_ROLES.TECNICO]: [
        { id: "inicio", label: "Inicio" },
        { id: "averias", label: "Averias" },
        { id: "mantenimiento", label: "Mantenimiento" },
        { id: "repuestos", label: "Repuestos" },
        { id: "asistencia", label: "Asistencia" }
    ],
    [NUESTROS_ROLES.GERENTE]: [
        { id: "inicio", label: "Inicio" },
        { id: "averias", label: "Averias" },
        { id: "solicitudes", label: "Solicitudes" }
    ],
    [NUESTROS_ROLES.PORTERO]: [
        { id: "inicio", label: "Inicio" },
        { id: "averias", label: "Averias" },
        { id: "aseo", label: "Aseo" },
        { id: "asistencia", label: "Asistencia" }
    ],
    [NUESTROS_ROLES.USUARIO]: [
        { id: "inicio", label: "Inicio" },
        { id: "averias", label: "Averias" }
    ]
};

// Personas que maneja la app de asistencia (las 16 de su lista).
// El backend cruza por cedula y manda la bandera `asistencia` en el login,
// que es lo que manda. Esta lista es solo el respaldo para cuando el backend
// todavia no se ha desplegado; incluye los nombres alternos que hay en esta app
// para las mismas personas (7992727 ALEXIS/DIONICIO, 19684951 ENRIQUE JOSE,
// 31604422 CASTILLO AUDIVET LUIYER, 6516060 RAFAEL LEAL CARMONA, 27535304 BENYI).
var ASISTENCIA_PERSONAS = [
    "LEONEL LOPEZ",
    "CAROLINA BLANCO",
    "ALBERTO BLANCO",
    "DIONICIO PENALOZA",
    "ALEXIS PENALOZA",
    "ANGEL MARTINEZ",
    "SANDRY FUENMAYOR",
    "ENRIQUE MARIN",
    "ENRIQUE JOSE MARIN",
    "LUINYER CASTILLO",
    "CASTILLO AUDIVET LUIYER",
    "RAFAEL LEAL",
    "RAFAEL LEAL CARMONA",
    "YASIRIS PABON",
    "MARBELYS ALVARADO",
    "LILLYS AUDIVET",
    "LUCRECIA ALVARADO",
    "MILENIS PEREIRA",
    "RONALD ALVILLARE",
    "BENGY CADET",
    "BENYI CADET"
];

function sinAcentosMayus(s) {
    return String(s || "").toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();
}

// La bandera del backend tiene prioridad. Si no viene (backend sin desplegar)
// se cae al respaldo por nombre.
function esPersonaAsistencia(nombre) {
    if (usuarioActual && usuarioActual.asistencia === true) return true;
    if (usuarioActual && usuarioActual.asistencia === false) return false;
    var n = sinAcentosMayus(nombre || (usuarioActual ? usuarioActual.nombre : ""));
    if (!n) return false;
    return ASISTENCIA_PERSONAS.some(function (p) { return sinAcentosMayus(p) === n; });
}

// El modulo de asistencia no depende del rol: se muestra a quien este en la
// lista de la app de asistencia y se esconde a los demas.
function ajustarModuloAsistencia(modulos, nombre) {
    var lista = (modulos || []).slice();
    var tiene = lista.some(function (m) { return m.id === "asistencia"; });
    if (esPersonaAsistencia(nombre)) {
        if (!tiene) lista.push({ id: "asistencia", label: "Asistencia" });
        return lista;
    }
    return lista.filter(function (m) { return m.id !== "asistencia"; });
}

function aplicarTema(tema) {
    var oscuro = tema === "oscuro";
    document.body.classList.toggle("tema-oscuro", oscuro);
    localStorage.setItem("tema", oscuro ? "oscuro" : "claro");
    var bO = document.getElementById("btnTemaOscuro");
    var bC = document.getElementById("btnTemaClaro");
    if (bO) bO.classList.toggle("btn-tema-activo", oscuro);
    if (bC) bC.classList.toggle("btn-tema-activo", !oscuro);
    var icono = document.getElementById("userTemaIcon");
    var etiqueta = document.getElementById("userTemaLabel");
    if (icono) icono.textContent = oscuro ? "☀️" : "🌙";
    if (etiqueta) etiqueta.textContent = oscuro ? "Modo claro" : "Modo oscuro";
}

function toggleTema() {
    aplicarTema(document.body.classList.contains("tema-oscuro") ? "claro" : "oscuro");
}

function refrescarAverias(forzar) {
    var prom = fetchJSON("averias", {}, (forzar === false ? {} : { refresh: true }));
    return prom.then(function (data) {
        var arr = Array.isArray(data) ? data : (data && Array.isArray(data.averias) ? data.averias : []);
        averiasDisponibles = arr;
        averiasCargadas = true;
        return arr;
    });
}

function cargarAverias() {
    return refrescarAverias().catch(function () { averiasCargadas = false; });
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
    conectarAsistencia();
    aplicarTema(localStorage.getItem("tema") || "claro");
    inicializarDatosEquipos();
    cargarRutinasDinamicas();
    cargarAverias();
    var panelContent = document.getElementById("panelContent");
    if (panelContent) panelContent.style.display = "none";
    document.getElementById("btnLogin").addEventListener("click", loginTecnico);
    document.getElementById("codigoTecnico").addEventListener("keydown", function (e) {
        if (e.key === "Enter") loginTecnico();
    });
    var pinCampo = document.getElementById("pinTecnico");
    if (pinCampo) pinCampo.addEventListener("keydown", function (e) {
        if (e.key === "Enter") loginTecnico();
    });
    if (isLoginBlocked()) mostrarBloqueoLogin();

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
            document.getElementById("otroAyudaGroup").style.display = "none";
            document.getElementById("otroAyudaCantidad").value = "";
            document.getElementById("otroAyudaTecnicosRows").innerHTML = "";
            document.getElementById("otroAyudaSi").classList.remove("active-si", "active-no");
            document.getElementById("otroAyudaNo").classList.remove("active-si", "active-no");
        }
    });

    document.getElementById("sedes").addEventListener("change", function () {
        const sede = this.value;
        const zonas = SEDE_ZONAS[sede] || [];
        const zonaGroup = document.getElementById("zonaGroup");
        const zonaSelect = document.getElementById("zona");
        const eqExteriorGroup = document.getElementById("equipoExteriorGroup");

        if (tipoMantenimientoActual === "SEMANERO") {
            zonaGroup.style.display = "none";
            zonaSelect.value = "";
            eqExteriorGroup.style.display = "none";
            document.getElementById("equipoGroup").style.display = "none";
            document.getElementById("mantenimientoGroup").style.display = "none";
            document.getElementById("equipo").required = false;
            document.getElementById("mantenimiento").required = false;
            esTaller = true;
            esSemanarioRuices = sede === "RUICES";
            document.getElementById("checkinsContainer").innerHTML = "";
            rutinaActual = [];
            nombreRutinaActual = "";
            esDinamica = false;
            rutinaYaRenderizada = false;
            resetPaso3();
            document.getElementById("paso2").style.display = "none";
            document.getElementById("paso1").style.display = "block";
            return;
        }

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
        document.getElementById("mantenimientoGroup").style.display = "none";
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

        if (!tipoMantenimientoActual && zona && zona.toUpperCase().indexOf("SEMANERO") === 0) {
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
            document.getElementById("mantenimientoGroup").style.display = "none";
            document.getElementById("equipo").required = false;
            document.getElementById("mantenimiento").required = true;
            esTaller = false;
            esSemanarioRuices = false;
        } else {
            eqExteriorGroup.style.display = "none";
            eqGroup.style.display = "block";
            document.getElementById("mantenimientoGroup").style.display = "none";
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
        if (prevAsignadoActivo) return;
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

    var elMenuPrincipal = document.getElementById("mainMenu");
    if (elMenuPrincipal) elMenuPrincipal.addEventListener("mouseleave", cerrarMenuPanel);
    var elMenuUsuario = document.getElementById("userMenu");
    if (elMenuUsuario) elMenuUsuario.addEventListener("mouseleave", cerrarUserMenu);
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
    const pinInput = document.getElementById("pinTecnico");
    const pin = pinInput ? pinInput.value.trim() : "";
    const errorEl = document.getElementById("loginError");

    if (isLoginBlocked()) {
        mostrarBloqueoLogin();
        return;
    }

    const iniciarPanel = function (personal) {
        var tipo = String(personal.tipo || "").trim();
        var rol = personal.rol
            || (tipo === "Tecnico" ? NUESTROS_ROLES.TECNICO
                : tipo === "Portero" ? NUESTROS_ROLES.PORTERO
                : tipo === "Gerente" ? NUESTROS_ROLES.GERENTE
                : (tipo === "Admin" || tipo === "Admin2") ? tipo
                : NUESTROS_ROLES.USUARIO);
        tecnicoNombre = personal.nombre;
        empleadoNombre = personal.nombre;
        // Si el backend no manda la bandera se deja en undefined para que
        // esPersonaAsistencia() use el respaldo por nombre.
        usuarioActual = { nombre: personal.nombre, tipo: personal.tipo, rol: rol, cedula: personal.cedula || null, asistencia: personal.asistencia === true ? true : (personal.asistencia === false ? false : undefined) };
        compartirAdmin = {
            Admin: (personal && personal.compartir && personal.compartir.Admin) || [],
            Admin2: (personal && personal.compartir && personal.compartir.Admin2) || []
        };
        modulosCompartidos = (compartirAdmin[NUESTROS_ROLES.ADMIN] || []).length > 0;
        errorEl.style.display = "none";
        document.getElementById("loginBlockInfo").style.display = "none";
        resetLoginAttempts();
        document.getElementById("loginSection").style.display = "none";
        document.getElementById("codigoTecnico").value = "";
        construirMenu(rol);
        document.getElementById("appBar").style.display = "flex";
        document.getElementById("btnHamburguesa").style.display = "flex";
        document.getElementById("appBarNombre").textContent = personal.nombre;
        navegar("inicio");
        if (typeof notiIniciar === "function") notiIniciar();
        iniciarRefrescoVivo();
        if (typeof fetchJSON === "function") {
            fetchJSON("personal", {}, { cacheMs: 300000 }).catch(function () {});
        }
    };

    const fallarLogin = function (mensaje, contarFallos) {
        errorEl.textContent = mensaje || "Credencial o codigo de averia no valido. Solicita tu registro al administrador.";
        errorEl.style.display = "block";
        document.getElementById("codigoTecnico").value = "";
        if (contarFallos === false) return;
        var intentos = registerLoginFailure();
        if (isLoginBlocked()) {
            mostrarBloqueoLogin();
        } else {
            mostrarIntentosRestantes(LOGIN_MAX_INTENTOS - intentos.count);
        }
    };

    const procesarLogin = function (av) {
        if (av) {
            if (av.resuelto) {
                fallarLogin("La averia " + av.numero + " ya fue resuelta.", false);
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

        var cedulaBusqueda = codigo;
        var deviceId = getDeviceId();
        var askLogin = function (ced) {
            return fetch(APPS_SCRIPT_URL + "?accion=login&cedula=" + encodeURIComponent(ced)
                + "&pin=" + encodeURIComponent(pin) + "&deviceId=" + encodeURIComponent(deviceId))
                .then(function (r) { return r.json(); });
        };
        askLogin(cedulaBusqueda)
            .then(function (resultado) {
                if (resultado && resultado.status === "bloqueado") {
                    var bloqueadoHasta = Date.now() + (resultado.restanteMs || LOGIN_BLOQUEO_MS);
                    document.getElementById("codigoTecnico").value = "";
                    mostrarBloqueoLogin(bloqueadoHasta);
                    return;
                }
                if (resultado && resultado.status === "pin_invalido") {
                    mostrarCampoPin();
                    var infoPin = document.getElementById("loginBlockInfo");
                    if (infoPin) infoPin.style.display = "none";
                    errorEl.textContent = resultado.mensaje || "PIN incorrecto.";
                    errorEl.style.display = "block";
                    return;
                }
                if (resultado && resultado.status === "ok") {
                    pinEnMemoria = pin;
                    iniciarPanel(resultado);
                    return;
                }
                if (/^\d+2$/.test(cedulaBusqueda)) {
                    var cedulaSin2 = cedulaBusqueda.slice(0, -1);
                    return askLogin(cedulaSin2)
                        .then(function (res2) {
                            if (res2 && res2.status === "bloqueado") {
                                var bloqueadoHasta2 = Date.now() + (res2.restanteMs || LOGIN_BLOQUEO_MS);
                                document.getElementById("codigoTecnico").value = "";
                                mostrarBloqueoLogin(bloqueadoHasta2);
                            } else if (res2 && res2.status === "pin_invalido") {
                                mostrarCampoPin();
                                errorEl.textContent = res2.mensaje || "PIN incorrecto.";
                                errorEl.style.display = "block";
                            } else if (res2 && res2.status === "ok") {
                                pinEnMemoria = pin;
                                iniciarPanel(res2);
                            } else {
                                fallarLogin();
                            }
                        });
                }
                fallarLogin();
            })
            .catch(function () {
                fallarLogin("Error de conexion. Intenta de nuevo.");
            });
    };

    if (/^av/i.test(codigo)) {
        Promise.resolve(buscarAveriaLocal(codigo)).then(function (av) {
            if (av && !av.asignado) {
                fetch(APPS_SCRIPT_URL, {
                    method: "POST",
                    mode: "no-cors",
                    body: JSON.stringify({ tipo: "obtener_asignacion", numero: codigo.toUpperCase() })
                }).catch(function () {});
                procesarLogin(av);
            } else {
                procesarLogin(av);
            }
        });
        return;
    }

    procesarLogin(null);
}

function construirMenu(rol) {
    var menuContainer = document.getElementById("mainMenu");
    if (!menuContainer) return;
    menuContainer.innerHTML = "";
    var nombre = usuarioActual ? usuarioActual.nombre : "";
    var modulos = esRolAdmin(rol) ? modulosAdminPara(rol, nombre) : (MODULOS_POR_ROL[rol] || MODULOS_POR_ROL[NUESTROS_ROLES.USUARIO]);
    modulos = ajustarModuloAsistencia(modulos, nombre);
    modulos.forEach(function (m) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "menu-btn";
        btn.textContent = m.label;
        btn.setAttribute("data-modulo", m.id);
        btn.addEventListener("click", function () { navegar(m.id); });
        menuContainer.appendChild(btn);
    });
    if (rol === NUESTROS_ROLES.ADMIN) menuContainer.appendChild(crearSelectorModulosAdmin(rol, nombre));
    cerrarMenuPanel();
}

const MODULOS_FORMULARIOS = {
    averias: "averiaForm",
    mantenimiento: null
};

const MODULOS_SECCIONES = {
    inicio: "inicioSection",
    ordenes: "ordenesSection",
    repuestos: "repuestosSection",
    historial: "historialSection",
    perfil: "perfilSection",
    solicitudes: "solicitudesSection",
    preventivos: "preventivosSection",
empleados: "empleadosSection",
    asistencia: "asistenciaSection",
    aseo: "aseoSection",
    it: "itSection",
    documentos: "documentosSection",
    cuentas: "cuentasSection"
};

function ocultarTodoPanel() {
    var secciones = ["inicioSection", "mantenimientoSection", "averiasSection", "ordenesSection", "repuestosSection",
        "historialSection", "perfilSection", "solicitudesSection", "preventivosSection", "empleadosSection",
        "asistenciaSection", "aseoSection", "itSection", "documentosSection", "cuentasSection"];
    secciones.forEach(function (id) {
        var el = document.getElementById(id);
        if (el) el.style.display = "none";
    });
    ["checkinForm", "averiaForm", "resolucionForm", "asignarSection", "cisternaPagoSection", "calendarioSection"].forEach(function (id) {
        var el = document.getElementById(id);
        if (el) el.style.display = "none";
    });
}

function mostrarSeccionModulo(modulo) {
    ocultarTodoPanel();
    var sec = document.getElementById(MODULOS_SECCIONES[modulo]);
    if (!sec) return;
    sec.style.display = "block";
    document.getElementById("panelContent").style.display = "block";
    if (modulo === "asistencia") {
        conectarAsistencia();
        vigilarMarcoAsistencia();
    }
}

var ASISTENCIA_URL = "https://asistencia-kappa-nine.vercel.app/";
var ASISTENCIA_ORIGEN = "https://asistencia-kappa-nine.vercel.app";
var asistenciaVigilia = null;

// La app de asistencia solo arranca si esta embebida aqui: por eso hay que
// contestar su saludo con un mensaje que venga de este origen.
function conectarAsistencia() {
    if (window.__conectadoAsistencia) return;
    window.__conectadoAsistencia = true;
    window.addEventListener("message", function (ev) {
        if (ev.origin !== ASISTENCIA_ORIGEN) return;
        var d = ev.data || {};
        if (d.tipo === "asis-hello" || d.tipo === "asis-ping") {
            try {
                ev.source.postMessage({ tipo: "asis-manutenimiento" }, ASISTENCIA_ORIGEN);
            } catch (e) {}
            return;
        }
        // La app de asistencia pide un ticket para poder marcar. Se le pide al
        // servidor con el PIN de esta sesion; el PIN nunca sale de aqui.
        if (d.tipo === "asistencia:solicitaTicket") {
            var motivo = "";
            if (!usuarioActual) motivo = "sin_sesion";
            else if (!usuarioActual.cedula) motivo = "sin_cedula";
            else if (!pinEnMemoria) motivo = "sin_pin";
            if (motivo) {
                try { ev.source.postMessage({ tipo: "asistencia:ticket", motivo: motivo }, ASISTENCIA_ORIGEN); } catch (e) {}
                return;
            }
            entregarTicketAsistencia(ev.source);
        }
    });
}

function entregarTicketAsistencia(destino) {
    if (!destino || !pinEnMemoria || !usuarioActual) {
        return;
    }
    fetch(APPS_SCRIPT_URL, {
        method: "POST",
        mode: "cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
            accion: "asistencia_ticket",
            cedula: usuarioActual.cedula,
            pin: pinEnMemoria
        })
    })
        .then(function (r) { return r.json(); })
        .then(function (j) {
            var msg = j && j.status === "ok"
                ? { tipo: "asistencia:ticket", ticket: j.ticket, expira: j.expira }
                : { tipo: "asistencia:ticket", motivo: (j && j.mensaje) || "no_autorizado" };
            try { destino.postMessage(msg, ASISTENCIA_ORIGEN); } catch (e) {}
        })
        .catch(function () {
            try { destino.postMessage({ tipo: "asistencia:ticket", motivo: "sin_conexion" }, ASISTENCIA_ORIGEN); } catch (e) {}
        });
}

function vigilarMarcoAsistencia() {
    var frame = document.getElementById("asistenciaFrame");
    if (!frame) return;
    var aviso = document.getElementById("asistenciaAviso");
    if (aviso) aviso.style.display = "none";
    if (frame.dataset.cargado === "1") return;
    if (asistenciaVigilia) clearTimeout(asistenciaVigilia);
    if (!frame.dataset.oyente) {
        frame.dataset.oyente = "1";
        frame.addEventListener("load", function () {
            frame.dataset.cargado = "1";
            if (asistenciaVigilia) clearTimeout(asistenciaVigilia);
            var av = document.getElementById("asistenciaAviso");
            if (av) av.style.display = "none";
        });
    }
    asistenciaVigilia = setTimeout(function () {
        if (frame.dataset.cargado === "1") return;
        if (aviso) aviso.style.display = "flex";
    }, 12000);
}

function recargarAsistencia() {
    var frame = document.getElementById("asistenciaFrame");
    var aviso = document.getElementById("asistenciaAviso");
    if (aviso) aviso.style.display = "none";
    if (!frame) return;
    frame.dataset.cargado = "";
    frame.src = ASISTENCIA_URL;
    vigilarMarcoAsistencia();
}

function navegar(modulo, desdeAtras) {
    if (modulo === "asistencia" && usuarioActual && !esPersonaAsistencia(usuarioActual.nombre)) {
        alert("El modulo Asistencia no esta disponible para tu usuario.");
        return;
    }
    if (!desdeAtras) {
        if (modulo === "inicio") {
            historialModulos = [];
        } else if (modulo !== moduloActivo) {
            historialModulos.push(moduloActivo);
            if (historialModulos.length > 20) historialModulos.shift();
        }
    }
    moduloActivo = modulo;
    cerrarMenuPanel();
    cerrarUserMenu();
    actualizarBotonAtras();

    var botones = document.querySelectorAll(".main-menu .menu-btn[data-modulo]");
    botones.forEach(function (b) {
        b.classList.toggle("active", b.getAttribute("data-modulo") === modulo);
    });

    if (modulo === "averias") {
        ocultarTodoPanel();
        document.getElementById("panelContent").style.display = "block";
        var secAverias = document.getElementById("averiasSection");
        if (secAverias) secAverias.style.display = "block";
        ocultarMiniNav();
        renderAverias();
        return;
    }

    if (modulo === "mantenimiento") {
        ocultarTodoPanel();
        document.getElementById("panelContent").style.display = "block";
        document.getElementById("mantenimientoSection").style.display = "block";
        ocultarMiniNav();
        restablecerMantSub();
        return;
    }

    if (modulo === "inicio") {
        mostrarSeccionModulo("inicio");
        ocultarMiniNav();
        actualizarBotonAtras();
        renderInicio();
        return;
    }

    mostrarSeccionModulo(modulo);

    if (modulo === "perfil") renderPerfil();
    else if (modulo === "historial") cargarHistorial();
    else if (modulo === "ordenes") renderOrdenes();
    else if (modulo === "repuestos") renderRepuestosModulo();
    else if (modulo === "solicitudes") renderSolicitudes();
    else if (modulo === "preventivos") renderPreventivos();
    else if (modulo === "empleados") renderEmpleados();

    ocultarMiniNav();
}

function navegarAForm(formId, mantenimientoPreset) {
    var subRestore = null;
    var sub = document.getElementById("mantSubContent");
    if (sub && sub.offsetParent !== null) {
        if (sub.dataset.mantSub === "preventivos") {
            subRestore = {
                texto: "Volver a Mis preventivos",
                accion: function () {
                    ocultarTodoPanel();
                    document.getElementById("panelContent").style.display = "block";
                    document.getElementById("mantenimientoSection").style.display = "block";
                    document.getElementById("mantCards").style.display = "none";
                    var s = document.getElementById("mantSubContent");
                    if (s) { s.dataset.mantSub = "preventivos"; s.style.display = "block"; }
                    renderMisPreventivosSub(document.getElementById("mantSubContent"));
                    actualizarBotonAtras();
                }
            };
        } else if (sub.dataset.mantSub === "ordenes") {
            subRestore = {
                texto: "Volver a Orden de trabajo",
                accion: function () {
                    ocultarTodoPanel();
                    document.getElementById("panelContent").style.display = "block";
                    document.getElementById("mantenimientoSection").style.display = "block";
                    document.getElementById("mantCards").style.display = "none";
                    var s = document.getElementById("mantSubContent");
                    if (s) { s.dataset.mantSub = "ordenes"; s.style.display = "block"; }
                    renderTecOrdenesSubVistaCards();
                    actualizarBotonAtras();
                }
            };
        }
    }
    ocultarTodoPanel();
    document.getElementById("panelContent").style.display = "block";
    var form = document.getElementById(formId);
    if (!form) return;
    if (!subRestore) {
        if (historialModulos[historialModulos.length - 1] !== moduloActivo) {
            historialModulos.push(moduloActivo);
            if (historialModulos.length > 20) historialModulos.shift();
        }
    }
    form.style.display = "block";
    actualizarBotonAtras();
    if (subRestore) pushSubVolver(subRestore.texto, subRestore.accion);
    if (formId === "checkinForm") {
        clearForm();
        tipoMantenimientoActual = mantenimientoPreset || "";
        document.getElementById("tecnicoInfo").textContent = "Tecnico: " + tecnicoNombre;
        populateSelect("sedes", mantenimientoPreset === "SEMANERO" ? SEDES_SEMANERO : SEDES_CHECKIN);
        if (mantenimientoPreset === "PREVENTIVO" || mantenimientoPreset === "CORRECTIVO" || mantenimientoPreset === "OTRO") {
            populateSelect("mantenimiento", MANTENIMIENTOS);
            document.getElementById("mantenimiento").value = mantenimientoPreset;
        }
        aplicarConfiguracionTipo();
        document.getElementById("mantenimientoGroup").style.display = "none";
        limpiarHora();
        if (mantenimientoPreset === "PREVENTIVO" && usuarioActual && usuarioActual.rol === NUESTROS_ROLES.TECNICO) {
            renderVistaEquiposAsignados();
            blindarPreventivoAsignado();
        }
    }
    mostrarMiniNav();
}

function aplicarConfiguracionTipo() {
    var zonaGroup = document.getElementById("zonaGroup");
    var eqGroup = document.getElementById("equipoGroup");
    var eqExterior = document.getElementById("equipoExteriorGroup");
    var eqOtro = document.getElementById("equipoOtroGroup");
    var mantGroup = document.getElementById("mantenimientoGroup");
    var otroGroup = document.getElementById("otroMantenimientoGroup");

    mantGroup.style.display = "none";
    document.getElementById("mantenimiento").required = false;

    if (tipoMantenimientoActual === "SEMANERO") {
        esTaller = true;
        esSemanarioRuices = document.getElementById("sedes").value === "RUICES";
        zonaGroup.style.display = "none";
        eqGroup.style.display = "none";
        eqExterior.style.display = "none";
        eqOtro.style.display = "none";
        otroGroup.style.display = "none";
        document.getElementById("equipo").required = false;
        return;
    }

    esTaller = false;
    esSemanarioRuices = false;
    eqExterior.style.display = "none";
    eqOtro.style.display = "none";
    document.getElementById("equipo").required = true;

    if (tipoMantenimientoActual === "OTRO") {
        otroGroup.style.display = "block";
    } else {
        otroGroup.style.display = "none";
        document.getElementById("otroDescripcion").value = "";
        document.getElementById("otroRepuestosGroup").style.display = "none";
        document.getElementById("otroRepuestosRows").innerHTML = "";
        document.getElementById("otroRepSi").classList.remove("active-si", "active-no");
        document.getElementById("otroRepNo").classList.remove("active-si", "active-no");
    }
}

function volverModuloAnterior() {
    var prev = historialModulos.pop() || "inicio";
    navegar(prev, true);
}

function irAtras() {
    if (subVolverStack.length > 0) {
        volverSubModulo();
        return;
    }
    volverModuloAnterior();
}

function posicionarBotonVolver() {
    var wrap = document.getElementById("btnAtrasPanelWrap");
    if (!wrap) return;
    var header = document.querySelector(".image");
    var h = header && header.offsetHeight ? header.offsetHeight : 96;
    wrap.style.top = (h + 10) + "px";
}

window.addEventListener("resize", function () {
    posicionarBotonVolver();
});

var subVolverStack = [];

function setSubVolver(texto, accion) {
    subVolverStack = (texto && accion) ? [{ texto: texto, accion: accion }] : [];
    renderSubVolver();
}

function pushSubVolver(texto, accion) {
    subVolverStack.push({ texto: texto, accion: accion });
    renderSubVolver();
}

function renderSubVolver() {
    var btn = document.getElementById("btnAtrasPanel");
    if (!btn) return;
    if (subVolverStack.length > 0) {
        var top = subVolverStack[subVolverStack.length - 1];
        btn.textContent = top.texto;
        btn.style.display = "inline-flex";
        document.getElementById("btnAtrasPanelWrap").style.display = "block";
    } else {
        btn.textContent = "Volver";
    }
    posicionarBotonVolver();
}

function volverSubModulo() {
    var top = subVolverStack.pop();
    renderSubVolver();
    if (top && typeof top.accion === "function") top.accion();
}

function actualizarBotonAtras() {
    var wrap = document.getElementById("btnAtrasPanelWrap");
    if (!wrap) return;
    var btn = document.getElementById("btnAtrasPanel");
    if (btn) {
        btn.textContent = "Volver";
        btn.style.display = "inline-flex";
    }
    subVolverStack = [];
    var auxVisibles = ["resolucionForm", "checkinForm", "averiaForm"].some(function (id) {
        var el = document.getElementById(id);
        return el && el.style.display === "block";
    });
    wrap.style.display = (!!usuarioActual && (moduloActivo !== "inicio" || auxVisibles)) ? "block" : "none";
    posicionarBotonVolver();
}

function empujarModuloHistorial(m) {
    if (historialModulos[historialModulos.length - 1] !== m) {
        historialModulos.push(m);
        if (historialModulos.length > 20) historialModulos.shift();
    }
}

function cerrarSesion() {
    usuarioActual = null;
    pinEnMemoria = "";
    const pinSalida = document.getElementById("pinTecnico");
    if (pinSalida) pinSalida.value = "";
    const grupoPin = document.getElementById("loginPinGroup");
    if (grupoPin) grupoPin.style.display = "none";
    moduloActivo = "inicio";
    tecnicoNombre = "";
    empleadoNombre = "";
    document.getElementById("appBar").style.display = "none";
    document.getElementById("btnHamburguesa").style.display = "none";
    cerrarMenuPanel();
    cerrarUserMenu();
    document.getElementById("mainMenu").innerHTML = "";
    document.getElementById("panelContent").style.display = "none";
    historialModulos = [];
    ocultarTodoPanel();
    ocultarMiniNav();
    document.getElementById("loginSection").style.display = "block";
    document.getElementById("codigoTecnico").value = "";
    var errorEl = document.getElementById("loginError");
    errorEl.style.display = "none";
    if (typeof notiDetener === "function") notiDetener();
}

function toggleMenuPanel() {
    menuAbierto = !menuAbierto;
    var panel = document.getElementById("mainMenu");
    var btn = document.getElementById("btnHamburguesa");
    if (panel) {
        panel.classList.toggle("abierto", menuAbierto);
        panel.style.display = menuAbierto ? "flex" : "none";
    }
    if (btn) {
        btn.classList.toggle("abierto", menuAbierto);
        btn.textContent = menuAbierto ? "✕" : "☰";
    }
}

function cerrarMenuPanel() {
    menuAbierto = false;
    var panel = document.getElementById("mainMenu");
    var btn = document.getElementById("btnHamburguesa");
    if (panel) {
        panel.classList.remove("abierto");
        panel.style.display = "none";
    }
    if (btn) {
        btn.classList.remove("abierto");
        btn.textContent = "☰";
    }
}

function navegarSubAseo(sub) {
    var cont = document.getElementById("aseoContenido");
    if (cont) {
        var t = sub === "emergencias" ? "Emergencias de aseo" : "Historial de aseo";
        cont.innerHTML = '<div style="font-size:3rem;margin-bottom:8px;">👷</div><p>' + t + ': modulo en construccion.</p>';
    }
}

function toggleUserMenu() {
    var m = document.getElementById("userMenu");
    if (m) m.classList.toggle("abierto");
}

function cerrarUserMenu() {
    var m = document.getElementById("userMenu");
    if (m) m.classList.remove("abierto");
}

function irAlInicio() {
    if (usuarioActual) navegar("inicio");
    else {
        ocultarTodoPanel();
        document.getElementById("loginSection").style.display = "block";
    }
}

function addStat(container, valor, label, clase, modulo) {
    var div = document.createElement("div");
    div.className = "stat-card" + (clase ? " " + clase : "");
    div.innerHTML = '<div class="stat-card-value">' + valor + '</div>' +
        '<div class="stat-card-label">' + label + '</div>';
    if (modulo) {
        div.classList.add("clickable");
        div.setAttribute("title", "Ir a: " + label);
        div.setAttribute("onclick", "navegar('" + modulo + "')");
    }
    container.appendChild(div);
}

function renderBarras(container, titulo, items, modulo) {
    var wrap = document.createElement("div");
    wrap.className = "dashboard-charts";
    wrap.innerHTML = '<div class="chart-section-label">' + titulo +
        (modulo ? ' <span class="chart-ir">Ver &gt;</span>' : '') + '</div>';
    items.forEach(function (it) {
        var row = document.createElement("div");
        row.className = "chart-bar-row";
        var max = it.max > 0 ? it.max : 1;
        var pct = Math.max(3, Math.min(100, Math.round((it.value / max) * 100)));
        row.innerHTML =
            '<span class="chart-bar-label">' + it.label + '</span>' +
            '<div class="chart-bar-track"><div class="chart-bar-fill ' + it.color + '" style="width:' + pct + '%"></div></div>' +
            '<span class="chart-bar-num">' + it.value + '</span>';
        wrap.appendChild(row);
    });
    if (modulo) {
        wrap.classList.add("clickable");
        wrap.setAttribute("onclick", "navegar('" + modulo + "')");
    }
    container.appendChild(wrap);
}

function renderTendencia(container, titulo, actual, anterior, modulo) {
    var wrap = document.createElement("div");
    wrap.className = "dashboard-charts";
    var trend = anterior > 0 && actual >= anterior
        ? '<span class="trend-box trend-up">^ ' + Math.round(((actual - anterior) / anterior) * 100) + '%</span>'
        : anterior > 0
        ? '<span class="trend-box trend-down">v ' + Math.round(((anterior - actual) / anterior) * 100) + '%</span>'
        : '<span class="trend-box trend-flat">- 0%</span>';
    wrap.innerHTML = '<div class="chart-section-label">' + titulo +
        (modulo ? ' <span class="chart-ir">Ver &gt;</span>' : '') + '</div>' +
        '<div class="form-group" style="margin:0;">' +
        '<div class="chart-bar-row">' +
        '<span class="chart-bar-label">Esta semana</span>' +
        '<span class="chart-bar-num" style="width:auto;">' + actual + '</span>' +
        '</div>' +
        '<div class="chart-bar-row">' +
        '<span class="chart-bar-label">Semana anterior</span>' +
        '<span class="chart-bar-num" style="width:auto;">' + anterior + '</span>' +
        '</div>' +
        '<div class="form-group" style="margin-top:6px;">Tendencia' + trend + '</div>' +
        '</div>';
    if (modulo) {
        wrap.classList.add("clickable");
        wrap.setAttribute("onclick", "navegar('" + modulo + "')");
    }
    container.appendChild(wrap);
}

function renderInicio() {
    if (!usuarioActual) return;
    var statsEl = document.getElementById("dashboardStats");
    var chartsEl = document.getElementById("dashboardCharts");
    if (!statsEl || !chartsEl) return;
    var prevStats = statsEl.innerHTML || "";
    if (!prevStats || prevStats.indexOf("Cargando panel") !== -1) statsEl.innerHTML = '<div class="lista-vacia">Cargando panel...</div>';
    if (!(chartsEl.innerHTML || "").trim()) chartsEl.innerHTML = "";
    var verTareasInicio = usuarioActual.rol === NUESTROS_ROLES.TECNICO ||
        usuarioActual.rol === NUESTROS_ROLES.ADMIN ||
        (usuarioActual.rol === NUESTROS_ROLES.ADMIN2 && (compartirAdmin[NUESTROS_ROLES.ADMIN] || []).indexOf("mantenimiento") !== -1);
    if (verTareasInicio) {
        cargarTareasInicio();
    } else {
        cargarAccesosInicio(usuarioActual.rol, usuarioActual.nombre);
    }

    fetchJSON("dashboard", { nombre: usuarioActual.nombre, rol: usuarioActual.rol })
        .then(function (d) {
            if (!d) throw new Error("Sin datos");
            var averias = d.averias || {};
            var mant = d.mantenimientos || {};
            var semana = d.semana || {};

            var idsInicio = [];
            if (esRolAdmin(usuarioActual.rol)) {
                idsInicio = (modulosAdminPara(usuarioActual.rol, usuarioActual.nombre) || []).map(function (m) { return m.id; });
            } else {
                idsInicio = (MODULOS_POR_ROL[usuarioActual.rol] || MODULOS_POR_ROL[NUESTROS_ROLES.USUARIO]).map(function (m) { return m.id; });
            }
            var tieneModulo = function (mid) { return idsInicio.indexOf(mid) !== -1; };

            chartsEl.innerHTML = "";
            statsEl.innerHTML = "";
            addStat(statsEl, averias.total || 0, "Averias");
            addStat(statsEl, averias.pendientes || 0, "Pendientes", "accent-red", "averias");
            addStat(statsEl, averias.enProceso || 0, "En proceso", "accent-orange", "averias");
            addStat(statsEl, averias.cerradas || 0, "Finalizadas", "accent-green", tieneModulo("historial") ? "historial" : "averias");

            var mantItems = [
                { label: "Preventivo", value: mant.preventivos || 0, color: "green", max: mant.total || 1 },
                { label: "Correctivo", value: mant.correctivos || 0, color: "blue", max: mant.total || 1 },
                { label: "Semanero", value: mant.semanero || 0, color: "orange", max: mant.total || 1 },
                { label: "Otro", value: mant.otro || 0, color: "red", max: mant.total || 1 }
            ];

            if (tieneModulo("mantenimiento")) {
                renderBarras(chartsEl, "Mantenimientos", mantItems, "mantenimiento");
            }
            if (tieneModulo("averias")) {
                renderBarras(chartsEl, "Averias", [
                { label: "Finalizadas", value: averias.cerradas || 0, color: "green", max: averias.total || 1 },
                { label: "En proceso", value: averias.enProceso || 0, color: "orange", max: averias.total || 1 },
                { label: "Pendientes", value: averias.pendientes || 0, color: "red", max: averias.total || 1 }
            ], "averias");
            }
            if (tieneModulo("historial")) {
                renderTendencia(chartsEl, "Trabajos realizados", semana.actual || 0, semana.anterior || 0, "historial");
            }
        })
        .catch(function () {
            statsEl.innerHTML = '<div class="lista-vacia">Sin conexion con el servidor. Los datos apareceran cuando se conecte.</div>';
            chartsEl.innerHTML = "";
        });
}

function cargarTareasInicio() {
    var cont = document.getElementById("tareasInicio");
    if (!cont || !usuarioActual) return;
    var esAdmin = esRolAdmin(usuarioActual.rol);
    if (!cont.querySelector("#tareasInicioCards")) {
        cont.innerHTML = '<div class="module-title" style="font-size:1rem;">' + (esAdmin ? "Tareas de todos los tecnicos (pendientes)" : "Mis tareas pendientes") + '</div>' +
            '<div id="tareasInicioCards" class="lista-vacia">Cargando tareas...</div>';
    }
    var errores = 0;
    var total = 3;
    var resultado = { tareas: [], ordenes: [] };
    var tareasP = fetchJSON("tareas_semanales", { nombre: esAdmin ? "" : tecnicoNombre, pendientes: "1" }, { cacheMs: 15000 })
        .then(function (d) { resultado.tareas = (d && d.tareas) || []; })
        .catch(function () { errores++; });
    var averiasP = refrescarAverias().catch(function () { errores++; return []; });
    var ordenesP = fetchJSON("ordenes_trabajo", {}, { cacheMs: 15000 })
        .then(function (d) { resultado.ordenes = (d && d.ordenes) || []; })
        .catch(function () { errores++; });
    Promise.all([averiasP, tareasP, ordenesP])
        .then(function () {
            var el = cont.querySelector("#tareasInicioCards");
            if (errores >= total) {
                if (el) el.innerHTML = "Sin conexion. No se pudieron cargar las tareas.";
                return;
            }
            ordenesCache = resultado.ordenes;
            pintarTareasInicio(cont, resultado.tareas, esAdmin, resultado.ordenes);
        });
}

function cargarAccesosInicio(rol, nombre) {
    var cont = document.getElementById("tareasInicio");
    if (!cont || !usuarioActual) return;
    var modulos = esRolAdmin(rol) ? modulosAdminPara(rol, nombre) : (MODULOS_POR_ROL[rol] || MODULOS_POR_ROL[NUESTROS_ROLES.USUARIO]);
    var items = [];
    modulos.forEach(function (m) {
        if (m.id === "averias") items.push({ id: "averias", titulo: "Averias", icono: "🔧", desc: "Reportar una averia o ver su estado" });
        if (m.id === "solicitudes") items.push({ id: "solicitudes", titulo: "Solicitudes", icono: "📩", desc: "Ver y crear solicitudes" });
    });
    if (!items.length) {
        cont.innerHTML = "";
        return;
    }
    cont.innerHTML = '<div class="module-title" style="font-size:1rem;">Mis secciones</div>' +
        '<div class="dashboard-cards">' +
        items.map(function (it) {
            return '<div class="dash-card" style="cursor:pointer;" onclick="navegar(\'' + it.id + '\')">' +
                '<div style="font-size:1.6rem;">' + it.icono + '</div>' +
                '<div style="font-weight:700;margin-top:4px;">' + it.titulo + '</div>' +
                '<div style="font-size:0.8rem;color:#777;margin-top:2px;">' + it.desc + '</div>' +
                '</div>';
        }).join("") +
        '</div>';
}

function pintarTareasInicio(cont, tareasPrev, esAdmin, ordenes) {
    var cardsEl = cont ? cont.querySelector("#tareasInicioCards") : null;
    if (!cardsEl) return;
    tareasInicioCtx = { cont: cont, tareasPrev: tareasPrev, esAdmin: esAdmin, ordenes: ordenes };
    var averiasCards = [];
    var prevCards = [];
    var otCards = [];
    var usadosNum = {};
    var usadosEq = {};
    var vistos = {};
    (averiasDisponibles || []).forEach(function (a) {
        if (!a) return;
        var clave = "A:" + String(a.numero || "") + "|" + String(a.equipo || "");
        if (vistos[clave]) return;
        if (usadosNum[a.numero]) return;
        if (esAdmin) {
            if (!String(a.asignado || "").trim() || a.resuelto) return;
        } else {
            if (String(a.asignado || "").trim() !== tecnicoNombre || a.resuelto) return;
        }
        usadosNum[a.numero] = 1;
        usadosEq[a.equipo] = 1;
        vistos[clave] = 1;
        averiasCards.push({
            tipo: "Averia",
            cliente: a.numero,
            numero: String(a.numero || "").replace(/'/g, "&#39;"),
            equipo: a.equipo,
            zona: (a.sede || "") + (a.zona ? " / " + a.zona : ""),
            detalle: a.descripcion,
            asignado: a.asignado,
            btnLabel: esAdmin ? "Ver detalle con foto" : "Ver detalle",
            btnClick: "abrirDetalleTareaModal('" + a.numero.replace(/'/g, "&#39;") + "','Averia')"
        });
    });
    tareasPrev.forEach(function (t) {
        if (usadosEq[t.equipo]) return;
        usadosEq[t.equipo] = 1;
        var prevEq = String(t.equipo || "").replace(/'/g, "&#39;");
        var prevZona = escaparHTML(t.zona || "").replace(/'/g, "&#39;");
        var prevMarca = escaparHTML(t.marca || "").replace(/'/g, "&#39;");
        var prevApoyo = escaparHTML(String(t.ayudante || t.apoyo || "")).replace(/'/g, "&#39;");
        var prevFecha = escaparHTML(t.fechaAsignacion || "").replace(/'/g, "&#39;");
        var prevHora = escaparHTML(t.horaAsignacion || "").replace(/'/g, "&#39;");
        prevCards.push({
            tipo: t.rol === "ayudante" ? "Preventivo (apoyo)" : "Mantenimiento preventivo",
            cliente: "",
            equipo: t.equipo,
            zona: t.zona,
            detalle: t.semanaLabel ? "Semana " + t.semanaLabel : "",
            asignado: t.tecnico + (t.ayudante ? " (apoyo " + t.ayudante + ")" : ""),
            btnLabel: esAdmin ? "Ver en Preventivos" : (t.rol === "principal" ? "Realizar preventivo" : "No reporta"),
            btnClick: esAdmin ? "navegar('preventivos')" : (t.rol === "principal" ? "iniciarPreventivoAsignado('" + prevEq + "','" + prevZona + "','" + prevMarca + "','" + prevApoyo + "','" + prevFecha + "','" + prevHora + "')" : "")
        });
    });
    (ordenes || []).forEach(function (o) {
        var estado = String(o.estado || "").trim();
        if (estado === "Realizada" || estado === "Falsa orden") return;
        if (!esAdmin && String(o.tecnico || "").trim() !== tecnicoNombre) return;
        var num = String(o.numero || "").replace(/'/g, "&#39;");
        otCards.push({
            tipo: "Orden de trabajo",
            cliente: o.numero,
            numero: num,
            estado: estado || "Pendiente",
            equipo: o.equipo,
            zona: (o.sede || "") + (o.zona ? " / " + o.zona : ""),
            detalle: (o.especialidad ? "Especialidad: " + o.especialidad : "") + (o.descripcion ? (o.especialidad ? " - " : "") + o.descripcion : ""),
            asignado: o.tecnico,
            btnLabel: "Resolver orden",
            btnClick: "resolverOrdenInicio('" + num + "')"
        });
    });

    var total = averiasCards.length + prevCards.length + otCards.length;
    var filtro = tareasInicioFiltro;
    var tabs = [
        { id: "todas", label: "Todas", count: total },
        { id: "averias", label: "Averias", count: averiasCards.length },
        { id: "preventivos", label: "Preventivos", count: prevCards.length },
        { id: "ordenes", label: "Ordenes", count: otCards.length }
    ];
    var bar = '<div style="display:flex;gap:6px;flex-wrap:wrap;margin:10px 0 6px;">';
    tabs.forEach(function (t) {
        var activo = filtro === t.id;
        bar += '<button type="button" onclick="cambiarTareasFiltro(\'' + t.id + '\')" style="padding:6px 12px;font-size:.8rem;border-radius:16px;border:1px solid ' + (activo ? "#1976d2" : "#ccc") + ';background:' + (activo ? "#1976d2" : "#fff") + ';color:' + (activo ? "#fff" : "#333") + ';' + (activo ? "font-weight:700;" : "") + 'cursor:pointer;">' + t.label + ' (' + t.count + ')</button>';
    });
    bar += '</div>';
    var html = bar;
    if (total === 0) {
        html += '<div class="lista-vacia" style="margin-top:6px;">' + (esAdmin ? "No hay tareas pendientes de los tecnicos." : "No tienes tareas pendientes.") + '</div>';
        cardsEl.className = "";
        cardsEl.innerHTML = html;
        return;
    }
    var bloques = [];
    if (filtro === "todas" || filtro === "averias") bloques.push({ titulo: "Averias", color: "#1976d2", cards: averiasCards });
    if (filtro === "todas" || filtro === "preventivos") bloques.push({ titulo: "Preventivos", color: "#2e7d32", cards: prevCards });
    if (filtro === "todas" || filtro === "ordenes") bloques.push({ titulo: "Ordenes de trabajo", color: "#f57c00", cards: otCards });
    bloques = bloques.filter(function (b) { return b.cards.length > 0; });
    if (bloques.length === 0) {
        var msgs = { averias: "No hay averias pendientes.", preventivos: "No hay preventivos pendientes.", ordenes: "No hay ordenes de trabajo pendientes." };
        html += '<div class="lista-vacia" style="margin-top:6px;">' + (msgs[filtro] || "No hay tareas pendientes.") + '</div>';
        cardsEl.className = "";
        cardsEl.innerHTML = html;
        return;
    }
    html += bloques.map(function (b) {
        var parte = '<div style="font-weight:700;font-size:.9rem;color:' + b.color + ';margin:14px 0 8px;padding-bottom:4px;border-bottom:2px solid ' + b.color + ';">' + b.titulo + '</div>';
        b.cards.forEach(function (c) {
            var accion = c.btnClick || "";
            var accionTarjeta = "";
            if (c.tipo.indexOf("Averia") !== -1) {
                accionTarjeta = "abrirResolucionPorNumero('" + (c.numero || "") + "')";
            } else if (accion) {
                accionTarjeta = accion;
            }
            var btn = "";
            if (accion) {
                btn = '<button type="button" class="btn-primary" style="margin-top:8px;font-size:0.8rem;padding:8px 12px;" onclick="event.stopPropagation();' + accion + '">' + c.btnLabel + '</button>';
            } else if (c.btnLabel === "No reporta") {
                btn = '<div style="margin-top:8px;font-size:0.8rem;color:#888;">El reporte lo hace el tecnico principal.</div>';
            }
            var extra = "";
            if (c.estado) extra = '<div style="font-size:.8rem;color:#555;">Estado: <b>' + escaparHTML(c.estado) + '</b></div>';
            parte += '<div style="border-top:3px solid ' + b.color + ';text-align:left;align-items:flex-start;width:100%;box-sizing:border-box;margin-bottom:8px;' + (accionTarjeta ? 'cursor:pointer;' : '') + '" class="dash-card"' + (accionTarjeta ? ' onclick="' + accionTarjeta + '"' : '') + '>' +
                '<div style="font-weight:700;font-size:.85rem;color:' + b.color + ';">' + c.tipo + (c.cliente ? ' ' + escaparHTML(c.cliente) : '') + '</div>' +
                '<div style="font-size:.85rem;color:#333;margin-top:3px;">Equipo: <b>' + escaparHTML(c.equipo) + '</b></div>' +
                (c.zona ? '<div style="font-size:.8rem;color:#555;">Sede / Zona: ' + escaparHTML(c.zona) + '</div>' : '') +
                extra +
                (c.detalle ? '<div style="font-size:.8rem;color:#777;">' + escaparHTML(c.detalle) + '</div>' : '') +
                (esAdmin && c.asignado ? '<div style="font-size:.8rem;color:#888;margin-top:2px;">Asignado a: <b>' + escaparHTML(c.asignado) + '</b></div>' : '') +
                btn + '</div>';
        });
        return parte;
    }).join("");
    cardsEl.className = "";
    cardsEl.innerHTML = html;
}

function cambiarTareasFiltro(id) {
    tareasInicioFiltro = id;
    if (tareasInicioCtx) {
        pintarTareasInicio(tareasInicioCtx.cont, tareasInicioCtx.tareasPrev, tareasInicioCtx.esAdmin, tareasInicioCtx.ordenes);
    }
}

function resolverOrdenInicio(numero) {
    numero = String(numero || "").trim();
    var buscar = function () {
        return (ordenesCache || []).find(function (o) { return String(o.numero || "").trim() === numero; });
    };
    var abrir = function (ot) {
        ocultarTodoPanel();
        document.getElementById("panelContent").style.display = "block";
        if (typeof abrirResolucionOrden === "function") {
            abrirResolucionOrden(String(ot.numero || numero));
        }
    };
    var ot = buscar();
    if (ot) { abrir(ot); return; }
    fetchJSON("ordenes_trabajo", {}, { cacheMs: 15000 })
        .then(function (d) {
            ordenesCache = (d && d.ordenes) || [];
            var ot2 = buscar();
            if (ot2) { abrir(ot2); return; }
            alert("No se encontro la orden de trabajo.");
        })
        .catch(function () {
            alert("No se encontro la orden de trabajo. Verifica la conexion.");
        });
}

function abrirDetalleTareaModal(numero, tipo) {
    var modal = document.getElementById("detalleTareaModal");
    if (!modal) return;
    var a = null;
    (averiasDisponibles || []).forEach(function (x) {
        if (a) return;
        if (tipo === "Averia" && String(x.numero) === String(numero)) a = x;
    });
    if (!a) return;
    var titulo = document.getElementById("dtTitulo");
    var info = document.getElementById("dtInfo");
    var fotos = document.getElementById("dtFotos");
    if (titulo) titulo.textContent = "Averia " + a.numero + " - " + a.equipo;
    var infos = "";
    infos += "<b>Equipo:</b> " + escaparHTML(a.equipo) + "<br>";
    if (a.sede || a.zona) infos += "<b>Sede / Zona:</b> " + escaparHTML((a.sede || "") + (a.zona ? " / " + a.zona : "")) + "<br>";
    if (a.descripcion) infos += "<b>Descripcion:</b> " + escaparHTML(a.descripcion);
    if (info) info.innerHTML = infos;
    if (fotos) {
        var fh = (typeof htmlFotosAveria === "function") ? htmlFotosAveria(a) : "";
        fotos.innerHTML = (typeof htmlFotosAveria === "function")
            ? '<div style="font-size:.85rem;color:#333;margin:4px 0 6px;"><b>Foto de la averia:</b></div>' + (fh || '<span style="color:#999;">Sin foto adjunta.</span>')
            : '<span style="color:#999;">Sin foto adjunta.</span>';
    }
    modal.style.display = "flex";
    var btnIr = document.getElementById("dtBtnIr");
    if (btnIr) btnIr.style.display = esAdmin ? "inline-block" : "none";
}

function cerrarDetalleTarea() {
    var modal = document.getElementById("detalleTareaModal");
    if (modal) modal.style.display = "none";
}

function renderTrabajos() {
    var list = document.getElementById("trabajosList");
    if (!list) return;
    if (!document.getElementById("trabBuscador")) {
        var inp = document.createElement("input");
        inp.type = "text";
        inp.id = "trabBuscador";
        inp.placeholder = "Buscar por equipo, sede, zona o numero...";
        inp.style.cssText = "width:100%;box-sizing:border-box;padding:9px;border:1px solid #ccc;border-radius:8px;margin-bottom:10px;";
        inp.oninput = function () { pintarTrabajos(list); };
        list.parentNode.insertBefore(inp, list);
    }
    if (!averiasCargadas && averiasDisponibles.length === 0 && !averiasCargadas) {
        cargarAverias().then(function () { pintarTrabajos(list); }).catch(function () { pintarTrabajos(list); });
    } else {
        pintarTrabajos(list);
    }
}

var trabajosTareasCache = null;

function pintarTrabajos(list) {
    if (!list) list = document.getElementById("trabajosList");
    if (!list) return;
    list.innerHTML = "";
    var q = String((document.getElementById("trabBuscador") || {}).value || "").trim().toLowerCase();
    var mie = (averiasDisponibles || []).filter(function (a) {
        var match = String(a.asignado || "").trim() === tecnicoNombre && !a.resuelto;
        if (!match) return false;
        if (!q) return true;
        return (String(a.numero || "") + " " + String(a.equipo || "") + " " + String(a.sede || "") + " " + String(a.zona || "")).toLowerCase().indexOf(q) !== -1;
    });
    if (mie.length === 0) {
        list.innerHTML = '<div class="lista-vacia">' + (q ? "No hay trabajos que coincidan con la busqueda." : "No tienes trabajos de averias pendientes.") + '</div>';
    }
    mie.forEach(function (a) {
        var card = document.createElement("div");
        card.className = "card";
        card.style.cssText = "margin-bottom:10px;padding:12px;";
        card.innerHTML =
            '<div style="font-weight:700;color:#1976d2;">' + a.numero + '</div>' +
            '<div style="font-size:0.82rem;color:#333;">Equipo: ' + a.equipo + '</div>' +
            '<div style="font-size:0.82rem;color:#333;">Sede: ' + (a.sede || "") + (a.zona ? " | Zona: " + a.zona : "") + '</div>' +
            '<div style="font-size:0.82rem;color:#555;">' + (a.descripcion || "") + '</div>' +
            '<button type="button" class="btn-primary" style="margin-top:8px;font-size:0.8rem;padding:8px 12px;" onclick="abrirResolucionPorNumero(\'' + a.numero + '\')">Resolver</button>';
        list.appendChild(card);
    });
    var renderTareas = function (tareas) {
        var filtradas = q
            ? tareas.filter(function (t) {
                return (String(t.equipo || "") + " " + String(t.zona || "") + " " + String(t.marca || "") + " " + String(t.semana || "")).toLowerCase().indexOf(q) !== -1;
            })
            : tareas;
        if (filtradas.length === 0) return;
        var vacio = list.querySelector(".lista-vacia");
        if (vacio) vacio.remove();
        var principalEquipos = {};
        filtradas.forEach(function (x) { if (x.rol === "principal") principalEquipos[x.equipo] = 1; });
        var vistosEq = {};
        filtradas.forEach(function (t) {
            if (!t.equipo) return;
            if (t.rol === "ayudante" && principalEquipos[t.equipo]) return;
            if (vistosEq[t.equipo]) return;
            vistosEq[t.equipo] = 1;
            var card = document.createElement("div");
            card.className = "card";
            card.style.cssText = "margin-bottom:10px;padding:12px;border-left:4px solid #2e7d32;";
            var encabezado = t.rol === "principal" ? 'Mantenimiento preventivo a tu cargo' : 'Mantenimiento preventivo (apoyo)';
            card.innerHTML =
                '<div style="font-weight:700;color:#2e7d32;">' + encabezado + '</div>' +
                '<div style="font-size:0.82rem;color:#333;">Equipo: <b>' + t.equipo + '</b></div>' +
                '<div style="font-size:0.82rem;color:#333;">Zona: ' + (t.zona || "") + '</div>' +
                '<div style="font-size:0.82rem;color:#555;">Semana: ' + (t.semanaLabel || t.semana || "") + '</div>' +
                (t.rol === "ayudante" ? '<div style="font-size:0.8rem;color:#888;margin-top:4px;">Apoya a <b>' + t.tecnico + '</b>. Esta tarea aparece en tu semana pero el reporte del mantenimiento lo hace el tecnico principal.</div>' : '') +
                (t.rol === "principal" ? '<button type="button" class="btn-primary" style="margin-top:8px;font-size:0.8rem;padding:8px 12px;" onclick="iniciarPreventivoAsignado(\'' + String(t.equipo || "").replace(/'/g, "&#39;") + '\',\'' + escaparHTML(t.zona || "").replace(/'/g, "&#39;") + '\',\'' + escaparHTML(t.marca || "").replace(/'/g, "&#39;") + '\',\'' + escaparHTML(t.ayudante || "").replace(/'/g, "&#39;") + '\',\'' + escaparHTML(t.fechaAsignacion || "").replace(/'/g, "&#39;") + '\',\'' + escaparHTML(t.horaAsignacion || "").replace(/'/g, "&#39;") + '\')">Realizar mantenimiento</button>' : '');
            list.appendChild(card);
        });
    };
    if (trabajosTareasCache === null) {
        fetchJSON("tareas_semanales", { nombre: tecnicoNombre }, { cacheMs: 15000 })
            .then(function (res) {
                trabajosTareasCache = (res && res.tareas) || [];
                pintarTrabajos(list);
            })
            .catch(function () {});
    } else {
        renderTareas(trabajosTareasCache);
    }
}

function setSelectValueDisparar(select, value) {
    if (!select) return;
    var found = null;
    for (var i = 0; i < select.options.length; i++) {
        if (select.options[i].value === value || select.options[i].text === value) { found = i; break; }
    }
    if (found !== null) select.selectedIndex = found;
    select.dispatchEvent(new Event("change", { bubbles: true }));
}

function renderVistaEquiposAsignados() {
    var picker = document.getElementById("prevAsignadoEquipos");
    if (!picker) return;
    if (prevAsignadoEnFlujo) { picker.style.display = "none"; return; }
    picker.style.display = "block";
    picker.innerHTML = '<div class="module-title" style="font-size:1rem;">Tus equipos asignados para preventivo</div>' +
        '<div class="lista-vacia">Cargando equipos asignados...</div>';
    var p1 = document.getElementById("paso1");
    var p2 = document.getElementById("paso2");
    var p3 = document.getElementById("paso3");
    if (p1) p1.style.display = "none";
    if (p2) p2.style.display = "none";
    if (p3) p3.style.display = "none";
    var mini = document.getElementById("miniNav");
    if (mini) mini.style.display = "none";
    fetchJSON("tareas_semanales", { nombre: tecnicoNombre, pendientes: "1" }, { cacheMs: 15000 })
        .then(function (res) {
            if (prevAsignadoActivo) return;
            var tareas = (res && res.tareas) || [];
            var vistos = {};
            var principales = [];
            tareas.forEach(function (t) {
                if (t.rol !== "principal") return;
                if (vistos[t.equipo]) return;
                vistos[t.equipo] = true;
                principales.push(t);
            });
            if (principales.length === 1) {
                var t0 = principales[0];
                picker.innerHTML = '<div class="module-title" style="font-size:1rem;">Tus equipos asignados para preventivo</div>' +
                    '<div class="lista-vacia">Abriendo tu preventivo asignado...</div>';
                iniciarPreventivoAsignado(t0.equipo, t0.zona, t0.marca, t0.ayudante, t0.fechaAsignacion, t0.horaAsignacion);
                return;
            }
            var html = '<div class="module-title" style="font-size:1rem;">Tus equipos asignados para preventivo</div>';
            var n = 0;
            principales.forEach(function (t) {
                n++;
                html += '<div class="dash-card" style="border-top:3px solid #2e7d32;text-align:left;align-items:flex-start;width:100%;box-sizing:border-box;margin-bottom:8px;">' +
                    '<div style="font-weight:700;font-size:.85rem;color:#2e7d32;">Mantenimiento preventivo</div>' +
                    '<div style="font-size:.85rem;color:#333;margin-top:3px;">Equipo: <b>' + escaparHTML(t.equipo) + '</b></div>' +
                    '<div style="font-size:.8rem;color:#555;">Sede / Zona: ' + escaparHTML(t.zona) + (t.marca ? ' | Marca: ' + escaparHTML(t.marca) : '') + '</div>' +
                    (t.fechaAsignacion ? '<div style="font-size:.8rem;color:#888;margin-top:2px;">Asignado: ' + escaparHTML(formatearFechaHora(t.fechaAsignacion, t.horaAsignacion || '')) + '</div>' : '') +
                    '<button type="button" class="btn-primary" style="margin-top:8px;font-size:0.8rem;padding:8px 12px;" onclick="iniciarPreventivoAsignado(\'' + String(t.equipo || "").replace(/'/g, "&#39;") + '\',\'' + escaparHTML(t.zona || "").replace(/'/g, "&#39;") + '\',\'' + escaparHTML(t.marca || "").replace(/'/g, "&#39;") + '\',\'' + escaparHTML(t.ayudante || "").replace(/'/g, "&#39;") + '\',\'' + escaparHTML(t.fechaAsignacion || "").replace(/'/g, "&#39;") + '\',\'' + escaparHTML(t.horaAsignacion || "").replace(/'/g, "&#39;") + '\')">Realizar preventivo</button></div>';
            });
            if (n === 0) {
                html = '<div class="module-title" style="font-size:1rem;">Tus equipos asignados para preventivo</div>' +
                    '<div class="lista-vacia">No tienes equipos asignados para mantenimiento preventivo.<br>El administrador te asigna equipos desde el modulo Preventivos &gt; Semanal.</div>';
            }
            picker.innerHTML = html;
        })
        .catch(function () {
            if (prevAsignadoActivo) return;
            picker.innerHTML = '<div class="module-title" style="font-size:1rem;">Tus equipos asignados para preventivo</div>' +
                '<div class="lista-vacia">Sin conexion. No se pudieron cargar tus equipos asignados.</div>';
        });
}

var prevAsignadoActivo = false;
var prevAsignadoInfo = null;
var prevAsignadoEnFlujo = false;

function blindarPreventivoAsignado() {
    var p1 = document.getElementById("paso1");
    if (p1) p1.style.display = "none";
    var rf = document.getElementById("rowFechaHora");
    if (rf) rf.style.display = "none";
    var atras = document.getElementById("btnAtras");
    if (atras) atras.style.display = "none";
    var selSede = document.getElementById("sedes");
    if (selSede) selSede.setAttribute("disabled", "disabled");
    var selZona = document.getElementById("zona");
    if (selZona) selZona.setAttribute("disabled", "disabled");
    var dispEq = document.getElementById("equipoDisplay");
    if (dispEq) dispEq.style.pointerEvents = "none";
    var ddEq = document.getElementById("equipoDropdown");
    if (ddEq) ddEq.style.display = "none";
}

function iniciarPreventivoAsignado(equipo, zona, marca, ayudante, fechaAsignacion, horaAsignacion) {
    var partes = String(zona || "").split("/");
    var sede = ((partes[0] || "").trim());
    var zonaSel = ((partes[1] || "").trim());
    prevAsignadoEnFlujo = true;
    navegarAForm("checkinForm", "PREVENTIVO");
    prevAsignadoEnFlujo = false;
    var pickerPrev = document.getElementById("prevAsignadoEquipos");
    if (pickerPrev) pickerPrev.style.display = "none";
    prevAsignadoActivo = true;
    prevAsignadoInfo = {
        equipo: equipo || "",
        zona: zona || "",
        marca: marca || "",
        ayudante: ayudante || "",
        fechaAsignacion: fechaAsignacion || "",
        horaAsignacion: horaAsignacion || ""
    };
    blindarPreventivoAsignado();
    setTimeout(function () {
        setSelectValueDisparar(document.getElementById("sedes"), sede);
        setTimeout(function () {
            setSelectValueDisparar(document.getElementById("zona"), zonaSel);
            setTimeout(function () {
                seleccionarCombobox("equipo", equipo || "");
                if (zonaSel === "EXTERIOR") {
                    var eqEx = document.getElementById("equipoExterior");
                    if (eqEx) eqEx.value = equipo || "";
                }
                setTimeout(function () {
                    irAlPaso2();
                    mostrarInfoPreventivoAsignado();
                }, 80);
            }, 80);
        }, 80);
    }, 80);
}

function mostrarInfoPreventivoAsignado() {
    var p2 = document.getElementById("paso2");
    var banner = document.getElementById("prevInfoAsignado");
    if (banner) banner.remove();
    if (!p2 || !prevAsignadoInfo) return;
    var info = prevAsignadoInfo;
    var b = document.createElement("div");
    b.id = "prevInfoAsignado";
    b.style.cssText = "border:1px solid #c8e6c9;background:#f7fdf7;border-radius:10px;padding:10px;margin-bottom:10px;font-size:.82rem;color:#333;";
    b.innerHTML = '<div style="font-weight:700;color:#2e7d32;">Mantenimiento preventivo asignado (solo lectura)</div>' +
        '<div style="margin-top:3px;">Equipo: <b>' + escaparHTML(info.equipo) + '</b></div>' +
        (info.zona ? '<div>Sede / Zona: ' + escaparHTML(info.zona) + '</div>' : '') +
        (info.marca ? '<div>Marca: <b>' + escaparHTML(info.marca) + '</b></div>' : '') +
        (info.ayudante ? '<div>Apoyo asignado: <b>' + escaparHTML(info.ayudante) + '</b></div>' : '') +
        '<div style="color:#888;margin-top:6px;">Marca cada paso de la rutina como realizado (Si/No) y registra si se usaron o se necesitan repuestos. Los datos del equipo no se modifican.</div>' +
        '<div style="color:#1976d2;margin-top:4px;">La fecha y la hora las registra el sistema automaticamente en el momento del envio.</div>';
    p2.insertBefore(b, p2.firstChild);
}

function abrirResolucionPorNumero(numero) {
    numero = String(numero || "").trim();
    var buscar = function () {
        return (averiasDisponibles || []).find(function (a) { return String(a.numero || "").trim() === numero; });
    };
    var abrir = function (av) {
        ocultarTodoPanel();
        document.getElementById("panelContent").style.display = "block";
        abrirResolucion(av);
    };
    var av = buscar();
    if (av) { abrir(av); return; }
    refrescarAverias().then(function () {
        var av2 = buscar();
        if (av2) { abrir(av2); return; }
        alert("No se encontro la averia.");
    }).catch(function () {
        alert("No se encontro la averia. Verifica la conexion.");
    });
}

function cargarHistorial() {
    var cont = document.getElementById("historialTabla");
    if (!cont) return;
    cont.innerHTML = '<div class="lista-vacia">Cargando historial...</div>';
    var proms = [];
    if (!averiasCargadas && averiasDisponibles.length === 0) {
        proms.push(cargarAverias());
    }
    if (!mantenimientosHistorialCargados) {
        proms.push(fetchJSON("historial_mantenimientos", {}, { cacheMs: 20000 })
            .then(function (d) {
                mantenimientosHistorial = (d && d.registros) || [];
                mantenimientosHistorialCargados = true;
            })
            .catch(function () {
                mantenimientosHistorial = [];
                mantenimientosHistorialCargados = true;
            }));
    }
    if (proms.length === 0) { pintarHistorial(); return; }
    Promise.all(proms).then(function () { pintarHistorial(); }).catch(function () { pintarHistorial(); });
}

function pintarHistorial() {
    var cont = document.getElementById("historialTabla");
    if (!cont) return;
    var filtro = document.getElementById("historialFiltro") ? document.getElementById("historialFiltro").value : "todo";
    var esAdminO = usuarioActual && (esRolAdmin(usuarioActual.rol) || usuarioActual.rol === NUESTROS_ROLES.GERENTE);
    var rel = function (a) {
        return esAdminO ||
            (a.empleado === (usuarioActual ? usuarioActual.nombre : "") || a.asignado === (usuarioActual ? usuarioActual.nombre : ""));
    };
    var averias = (averiasDisponibles || []).filter(rel);
    var mant = (mantenimientosHistorial || []).filter(function (m) {
        return esAdminO || m.tecnico === (usuarioActual ? usuarioActual.nombre : "") || m.ayudante === (usuarioActual ? usuarioActual.nombre : "");
    });
    var filas = [];
    if (filtro !== "mantenimientos") {
        averias.forEach(function (a) {
            var estado = a.resuelto ? "Finalizada" : (a.enProceso === true ? "En proceso" : (a.asignado ? "Asignada" : "Pendiente"));
            filas.push({
                tipoFuente: "averia",
                numero: a.numero || "",
                fecha: a.fecha || "",
                hora: a.hora || "",
                sede: a.sede || "",
                equipo: a.equipo || "",
                responsable: a.empleado || "",
                detalle: "Averia",
                estado: estado,
                fotos: a
            });
        });
    }
    if (filtro !== "averias") {
        mant.forEach(function (m) {
            filas.push({
                tipoFuente: "mantenimiento",
                numero: "",
                fecha: m.fecha || "",
                hora: m.hora || "",
                sede: m.sede || "",
                equipo: m.equipo || "",
                responsable: m.tecnico + (m.ayudante ? " (apoyo " + m.ayudante + ")" : ""),
                detalle: m.actividad || "",
                estado: "Registrado",
                fotos: null
            });
        });
    }
    var hq = String((document.getElementById("historialBuscar") || {}).value || "").trim().toLowerCase();
    if (hq) {
        filas = filas.filter(function (f) {
            return (String(f.numero || "") + " " + String(f.fecha || "") + " " + String(f.sede || "") + " " + String(f.equipo || "") + " " + String(f.responsable || "") + " " + String(f.detalle || "") + " " + String(f.estado || "")).toLowerCase().indexOf(hq) !== -1;
        });
    }
    if (filas.length === 0) {
        cont.innerHTML = '<div class="lista-vacia">No hay registros para mostrar.</div>';
        return;
    }
    filas.sort(function (x, y) {
        return String(y.fecha).localeCompare(String(x.fecha)) || String(y.numero).localeCompare(String(x.numero)) || String(y.detalle).localeCompare(String(x.detalle));
    });
    var t = document.createElement("table");
    t.className = "cisterna-deuda-tabla";
    var thead = document.createElement("thead");
    var trh = document.createElement("tr");
    ["Numero", "Fecha", "Sede", "Equipo", "Responsable", "Detalle", "Estado", "Fotos"].forEach(function (h) {
        var th = document.createElement("th");
        th.textContent = h;
        trh.appendChild(th);
    });
    thead.appendChild(trh);
    t.appendChild(thead);
    var tbody = document.createElement("tbody");
    filas.forEach(function (f) {
        var tr = document.createElement("tr");
        var tdNum = document.createElement("td");
        tdNum.textContent = f.numero;
        tr.appendChild(tdNum);
        var tdFecha = document.createElement("td");
        tdFecha.textContent = formatearFechaHora(f.fecha, f.hora);
        tr.appendChild(tdFecha);
        var tdSede = document.createElement("td");
        tdSede.textContent = f.sede;
        tr.appendChild(tdSede);
        var tdEquipo = document.createElement("td");
        tdEquipo.textContent = f.equipo;
        tr.appendChild(tdEquipo);
        var tdResp = document.createElement("td");
        tdResp.textContent = f.responsable;
        tr.appendChild(tdResp);
        var tdDet = document.createElement("td");
        tdDet.textContent = f.detalle;
        tr.appendChild(tdDet);
        var tdEstado = document.createElement("td");
        tdEstado.textContent = f.estado;
        tr.appendChild(tdEstado);
        var tdFotos = document.createElement("td");
        tdFotos.innerHTML = f.fotos ? htmlFotosAveria(f.fotos) : "";
        tr.appendChild(tdFotos);
        tbody.appendChild(tr);
    });
    t.appendChild(tbody);
    cont.innerHTML = "";
    cont.appendChild(t);
}

function renderPerfil() {
    if (!usuarioActual) return;
    document.getElementById("perfilNombre").value = usuarioActual.nombre;
    document.getElementById("perfilRol").value = usuarioActual.rol;
    document.getElementById("perfilWhatsapp").value = "";
    document.getElementById("perfilCorreo").value = "";
    document.getElementById("perfilMsg").innerHTML = "";
    renderCompartirModulosUI();
    fetchJSON("estado_compartido", {}, { cacheMs: 0 })
        .then(function (r) {
            if (r && r.Admin) {
                compartirAdmin = { Admin: r.Admin || [], Admin2: r.Admin2 || [] };
                modulosCompartidos = (compartirAdmin[NUESTROS_ROLES.ADMIN] || []).length > 0;
                renderCompartirModulosUI();
            }
        })
        .catch(function () {});
    fetch(APPS_SCRIPT_URL + "?accion=perfil&nombre=" + encodeURIComponent(usuarioActual.nombre))
        .then(function (r) { return r.json(); })
        .then(function (d) {
            if (d && d.status === "ok") {
                document.getElementById("perfilWhatsapp").value = d.whatsapp || "";
                document.getElementById("perfilCorreo").value = d.correo || "";
            }
        })
        .catch(function () {});
}

function guardarPerfil() {
    if (!usuarioActual) return;
    var whatsapp = document.getElementById("perfilWhatsapp").value.trim();
    var correo = document.getElementById("perfilCorreo").value.trim();
    var msg = document.getElementById("perfilMsg");
    msg.innerHTML = '<div style="color:#666;">Guardando...</div>';
    postJSON({ tipo: "actualizar_perfil", nombre: usuarioActual.nombre, whatsapp: whatsapp, correo: correo })
        .then(function () {
            msg.innerHTML = '<div style="color:#2e7d32;font-weight:600;">Perfil actualizado correctamente.</div>';
        })
        .catch(function () {
            msg.innerHTML = '<div style="color:#d32f2f;font-weight:600;">Sin conexion. No se pudo guardar el perfil.</div>';
        });
}

function renderCompartirModulosUI() {
    var wrap = document.getElementById("compartirWrap");
    var panel = document.getElementById("compartirPanel");
    if (!usuarioActual || !esRolAdmin(usuarioActual.rol)) {
        if (wrap) wrap.style.display = "none";
        return;
    }
    if (wrap) wrap.style.display = "block";
    if (!panel) return;
    var exclusivos = modulosExclusivosAdmin(usuarioActual.rol);
    var sel = compartirAdmin[usuarioActual.rol] || [];
    var html = "";

    if (exclusivos.length === 0) {
        html += '<div style="font-size:0.78rem;color:#777;">Ya el otro administrador tiene todos tus modulos, no hay nada exclusivo para compartir.</div>';
    } else if (compartirPaso === "inicio") {
        if (sel.length > 0) {
            var nombres = sel.map(etiquetaModuloAdmin).join(", ");
            html += '<div style="font-size:0.78rem;color:#333;">Actualmente compartes: <b>' + nombres + '</b></div>' +
                '<div style="margin-top:6px;">' +
                '<button type="button" class="btn-secondary" style="font-size:0.75rem;padding:4px 10px;min-width:180px;" onclick="abrirCompartirPanel()">Compartir modulos</button> ' +
                '<button type="button" class="btn-secondary" style="font-size:0.75rem;padding:4px 10px;" onclick="dejarDeCompartirModulos()">Dejar de compartir</button></div>';
        } else {
            html += '<div style="margin-top:6px;">' +
                '<button type="button" class="btn-secondary" style="font-size:0.75rem;padding:4px 10px;min-width:180px;" onclick="abrirCompartirPanel()">Compartir modulos</button>' +
                '</div>';
        }
    } else if (compartirPaso === "confirmar") {
        html += '<div style="font-size:0.78rem;color:#333;margin-bottom:6px;">Para poder compartir modulos debes confirmar tu correo. Te enviaremos un codigo de 6 digitos.</div>' +
            '<div><button type="button" class="btn-secondary" style="font-size:0.75rem;padding:4px 10px;" onclick="enviarCodigoCompartir()">Enviar codigo a mi correo</button> ' +
            '<button type="button" class="btn-secondary" style="font-size:0.75rem;padding:4px 10px;" onclick="volverCompartirPanel()">Volver</button></div>' +
            '<div id="compartirMsg" style="font-size:0.72rem;color:#666;margin-top:4px;"></div>' +
            '<div style="margin-top:6px;display:flex;gap:6px;align-items:center;">' +
            '<input type="text" id="compartirCodigo" maxlength="6" placeholder="Codigo de 6 digitos" style="width:130px;font-size:0.8rem;padding:4px;">' +
            '<button type="button" class="btn-secondary" style="font-size:0.75rem;padding:4px 10px;" onclick="confirmarCodigoCompartir()">Confirmar</button>' +
            '</div>';
    } else if (compartirPaso === "verificado") {
        var todosMarcado = sel.length === exclusivos.length;
        if (compartirModo === "todos") todosMarcado = true;
        html += '<div style="font-size:0.78rem;color:#333;margin-bottom:6px;">Selecciona que modulos deseas compartir:</div>' +
            '<label style="display:flex;align-items:center;gap:6px;font-size:0.8rem;cursor:pointer;">' +
            '<input type="radio" name="compartirModo" value="todos" onchange="cambiarModoCompartir(\'todos\')" ' + (compartirModo === "todos" ? "checked" : "") + '> Todos los modulos</label>' +
            '<label style="display:flex;align-items:center;gap:6px;font-size:0.8rem;cursor:pointer;">' +
            '<input type="radio" name="compartirModo" value="personalizados" onchange="cambiarModoCompartir(\'personalizados\')" ' + (compartirModo === "personalizados" ? "checked" : "") + '> Personalizados</label>';
        if (compartirModo === "personalizados") {
            html += '<div style="margin-top:6px;border-left:2px solid #ccc;padding-left:10px;">' + exclusivos.map(function (id) {
                var marcado = sel.indexOf(id) !== -1;
                return '<label style="display:flex;align-items:center;gap:6px;padding:2px 0;font-size:0.8rem;cursor:pointer;">' +
                    '<input type="checkbox" id="cmpChk_' + id + '" ' + (marcado ? "checked" : "") + '> ' + etiquetaModuloAdmin(id) + '</label>';
            }).join("") + '</div>';
        } else {
            html += '<div style="font-size:0.72rem;color:#666;margin-top:4px;">Se compartiran todos tus modulos exclusivos al otro administrador.</div>';
        }
        html += '<div style="margin-top:8px;">' +
            '<button type="button" class="btn-secondary" style="font-size:0.75rem;padding:4px 10px;" onclick="guardarCompartirModulos()">Guardar seleccion</button> ' +
            (sel.length > 0 ? '<button type="button" class="btn-secondary" style="font-size:0.75rem;padding:4px 10px;" onclick="dejarDeCompartirModulos()">Dejar de compartir</button> ' : "") +
            '<button type="button" class="btn-secondary" style="font-size:0.75rem;padding:4px 10px;" onclick="volverCompartirPanel()">Cerrar</button></div>' +
            '<div id="compartirMsg" style="font-size:0.72rem;color:#666;margin-top:4px;"></div>';
    }
    panel.innerHTML = html;
}

function abrirCompartirPanel() {
    if (!usuarioActual || !esRolAdmin(usuarioActual.rol)) return;
    compartirPaso = compartirVerificado ? "verificado" : "confirmar";
    renderCompartirModulosUI();
}

function volverCompartirPanel() {
    compartirPaso = "inicio";
    renderCompartirModulosUI();
}

function enviarCodigoCompartir() {
    if (!usuarioActual || !esRolAdmin(usuarioActual.rol)) return;
    var mensaje = document.getElementById("compartirMsg");
    if (mensaje) mensaje.textContent = "Enviando...";
    fetchJSON("solicitar_codigo_compartir", { nombre: usuarioActual.nombre }, { refresh: true })
        .then(function (r) {
            if (mensaje) {
                if (r && r.status === "ok") mensaje.textContent = "Codigo enviado. Revisa tu correo (vence en 10 minutos).";
                else if (r && r.status === "sin_exclusivos") mensaje.textContent = "No tienes modulos exclusivos para compartir.";
                else mensaje.textContent = "No se pudo enviar el codigo.";
            }
        })
        .catch(function () {
            if (mensaje) mensaje.textContent = "Sin conexion. No se pudo enviar el codigo.";
        });
}

function confirmarCodigoCompartir() {
    if (!usuarioActual || !esRolAdmin(usuarioActual.rol)) return;
    var codigo = (document.getElementById("compartirCodigo") || {}).value || "";
    var mensaje = document.getElementById("compartirMsg");
    if (!codigo.trim()) {
        if (mensaje) mensaje.textContent = "Escribe el codigo que recibiste.";
        return;
    }
    if (mensaje) mensaje.textContent = "Confirmando...";
    fetchJSON("confirmar_codigo_compartir", { nombre: usuarioActual.nombre, codigo: codigo.trim() }, { refresh: true })
        .then(function (r) {
            if (r && r.status === "ok") {
                compartirVerificado = true;
                compartirPaso = "verificado";
                renderCompartirModulosUI();
            } else if (r && r.status === "codigo_invalido") {
                if (mensaje) mensaje.textContent = "Codigo incorrecto. Verifica e intenta de nuevo.";
            } else if (r && r.status === "expirado") {
                if (mensaje) mensaje.textContent = "El codigo vencio. Envia uno nuevo.";
            } else {
                if (mensaje) mensaje.textContent = "No se pudo confirmar. Pide un nuevo codigo.";
            }
        })
        .catch(function () {
            if (mensaje) mensaje.textContent = "Sin conexion. No se pudo confirmar el codigo.";
        });
}

function cambiarModoCompartir(modo) {
    compartirModo = modo;
    renderCompartirModulosUI();
}

function guardarCompartirModulos() {
    if (!usuarioActual || !esRolAdmin(usuarioActual.rol)) return;
    var exclusivos = modulosExclusivosAdmin(usuarioActual.rol);
    var lista = [];
    if (compartirModo === "todos") {
        lista = exclusivos.slice();
    } else {
        exclusivos.forEach(function (id) {
            var cb = document.getElementById("cmpChk_" + id);
            if (cb && cb.checked) lista.push(id);
        });
    }
    var mensaje = document.getElementById("compartirMsg");
    if (mensaje) mensaje.textContent = "Guardando...";
    fetchJSON("set_compartir_modulos", { rol: usuarioActual.rol, modulos: lista.join(",") }, { refresh: true })
        .then(function (r) {
            if (r && r.Admin) {
                compartirAdmin = { Admin: r.Admin || [], Admin2: r.Admin2 || [] };
                modulosCompartidos = (compartirAdmin[NUESTROS_ROLES.ADMIN] || []).length > 0;
                reconstruirMenuAdmin();
                renderCompartirModulosUI();
                if (mensaje) mensaje.textContent = "Seleccion guardada correctamente.";
            } else {
                if (mensaje) mensaje.textContent = "No se pudo guardar.";
            }
        })
        .catch(function () {
            renderCompartirModulosUI();
            if (mensaje) mensaje.textContent = "Sin conexion. No se pudo guardar la seleccion.";
        });
}

function dejarDeCompartirModulos() {
    if (!usuarioActual || !esRolAdmin(usuarioActual.rol)) return;
    var panel = document.getElementById("compartirPanel");
    if (panel) panel.innerHTML = '<div style="font-size:0.72rem;color:#666;">Dejando de compartir...</div>';
    fetchJSON("set_compartir_modulos", { rol: usuarioActual.rol, modulos: "" }, { refresh: true })
        .then(function (r) {
            if (r && r.Admin) {
                compartirAdmin = { Admin: r.Admin || [], Admin2: r.Admin2 || [] };
                modulosCompartidos = (compartirAdmin[NUESTROS_ROLES.ADMIN] || []).length > 0;
                reconstruirMenuAdmin();
                renderCompartirModulosUI();
            } else {
                renderCompartirModulosUI();
            }
        })
        .catch(function () {
            renderCompartirModulosUI();
            var mensaje = document.getElementById("compartirMsg");
            if (mensaje) mensaje.textContent = "Sin conexion. No se pudo dejar de compartir.";
        });
}

var FETCHJSON_TTL_DEFAULT = 20000;
function fetchJSON(accion, params, opciones) {
    params = params || {};
    opciones = opciones || {};
    var ttl = (opciones.cacheMs === undefined || opciones.cacheMs === null) ? FETCHJSON_TTL_DEFAULT : opciones.cacheMs;
    var forzar = !!opciones.refresh;
    var clave = accion + "|" + Object.keys(params).sort().map(function (k) { return k + "=" + params[k]; }).join("&");
    if (!forzar && ttl) {
        var c = leerCacheV(clave);
        if (c !== null) return Promise.resolve(c);
    }
    var qs = "?accion=" + accion;
    Object.keys(params).forEach(function (k) {
        qs += "&" + encodeURIComponent(k) + "=" + encodeURIComponent(params[k]);
    });
    return fetch(APPS_SCRIPT_URL + qs).then(function (r) { return r.json(); })
        .then(function (v) {
            if (ttl) guardarCacheV(clave, v, ttl);
            return v;
        });
}

function escaparHTML(str) {
    return String(str == null ? "" : str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function badgeEstado(estado) {
    estado = String(estado || "");
    var color = estado === "Pendiente" ? "#f4a340" : estado === "Aprobada" ? "#1976d2" : estado === "Rechazada" ? "#d32f2f" : estado === "Entregada" ? "#2e7d32" : estado === "Pagado" ? "#2e7d32" : estado === "Parcial" ? "#8e24aa" : "#888";
    return '<span class="estado-badge" style="background:' + color + ';">' + escaparHTML(estado || "—") + '</span>';
}

function urlFotoDrive(id) {
    var i = extraerIdDrive(String(id || "").trim());
    if (!i) return null;
    return { id: i, ver: "https://drive.google.com/file/d/" + i + "/view", thumb: "https://drive.google.com/thumbnail?id=" + i + "&sz=w400" };
}

function extraerIdDrive(t) {
    if (!t) return "";
    var m = String(t).match(/[-\w]{25,}/);
    return m ? m[0] : "";
}

function htmlFotosAveria(a) {
    var fotos = (a && a.fotos) || [];
    if (fotos.length === 0) return "";
    var imgs = "";
    fotos.forEach(function (f) {
        var r = urlFotoDrive(f.id);
        if (r) {
            imgs += '<a href="' + r.ver + '" target="_blank" rel="noopener" style="text-decoration:none;display:inline-block;margin:6px 6px 0 0;" title="Abrir foto">' +
                '<img src="' + r.thumb + '" alt="Foto averia" onerror="this.onerror=null;this.src=\'https://drive.google.com/uc?export=view&amp;id=' + r.id + '\';" ' +
                'style="width:90px;height:90px;object-fit:cover;border-radius:8px;border:1px solid #ddd;box-shadow:0 1px 3px rgba(0,0,0,.2);">' +
                '</a>';
        }
    });
    if (!imgs) return "";
    return '<div style="margin-top:8px;">' + imgs + '</div>';
}

function selectEstado(hoja, row, estado) {
    var opciones = ["Pendiente", "Aprobada", "Rechazada", "Entregada"];
    var html = '<select class="estado-select" onchange="cambiarEstadoSolicitud(\'' + hoja + '\',' + row + ',this.value)">';
    opciones.forEach(function (e) {
        html += '<option value="' + e + '"' + (e === estado ? " selected" : "") + ">" + e + "</option>";
    });
    return html + "</select>";
}

function cambiarEstadoSolicitud(hoja, fila, estado) {
    postJSON({ tipo: "actualizar_estado_solicitud", hoja: hoja, fila: fila, estado: estado })
        .then(function () {
            alert("Estado actualizado a " + estado + ".");
            renderSolicitudes();
        })
        .catch(function () { alert("Sin conexion. No se pudo actualizar."); });
}

function renderRepuestosModulo() {
    setSubVolver(null);
    var cont = document.getElementById("repuestosContent");
    if (!cont) return;
    var rol = usuarioActual ? usuarioActual.rol : "";
    if (esRolAdmin(rol)) {
        cont.innerHTML = '<div class="dashboard-cards">' +
            '<button type="button" class="dash-card dash-card-mant" onclick="repuestosSubVista(\'inventario\')"><div class="dash-card-icon">📦</div><div class="dash-card-label">Inventario</div><div style="color:#888;font-size:.75rem;margin-top:4px;text-align:center;">Registra repuestos nuevos o ajusta stock.</div></button>' +
            '<button type="button" class="dash-card dash-card-mant" onclick="repuestosSubVista(\'lista\')"><div class="dash-card-icon">🔍</div><div class="dash-card-label">Lista de inventario</div><div style="color:#888;font-size:.75rem;margin-top:4px;text-align:center;">Revisa las cantidades de todo.</div></button>' +
            '<button type="button" class="dash-card dash-card-mant" onclick="repuestosSubVista(\'utilizados\')"><div class="dash-card-icon">🔩</div><div class="dash-card-label">Utilizados</div><div style="color:#888;font-size:.75rem;margin-top:4px;text-align:center;">Repuestos gastados en trabajos.</div></button>' +
            '</div>';
        return;
    }
    if (rol === NUESTROS_ROLES.GERENTE) {
        cont.innerHTML = '<div class="lista-vacia">Los Gerentes no gestionan repuestos por este modulo.<br>Para pedir el arreglo de un equipo, una pizarra u otro material usa el modulo <b>Solicitudes</b>.</div>';
        return;
    }
    if (rol === NUESTROS_ROLES.TECNICO) {
        cont.innerHTML = '<div class="dashboard-cards">' +
            '<button type="button" class="dash-card dash-card-mant" onclick="repuestosSubVista(\'inventario\')"><div class="dash-card-icon">📦</div><div class="dash-card-label">Inventario</div><div style="color:#888;font-size:.75rem;margin-top:4px;text-align:center;">Registra repuestos nuevos o ajusta stock.</div></button>' +
            '<button type="button" class="dash-card dash-card-mant" onclick="repuestosSubVista(\'lista\')"><div class="dash-card-icon">🔍</div><div class="dash-card-label">Lista de inventario</div><div style="color:#888;font-size:.75rem;margin-top:4px;text-align:center;">Revisa las cantidades de todo.</div></button>' +
            '<button type="button" class="dash-card dash-card-mant" onclick="repuestosSubVista(\'solicitudes\')"><div class="dash-card-icon">🔩</div><div class="dash-card-label">Solicitar repuestos</div><div style="color:#888;font-size:.75rem;margin-top:4px;text-align:center;">Pide repuestos y revisa el estado de tus pedidos.</div></button>' +
            '</div>';
        return;
    }
    cont.innerHTML = repuestosSolicitudesHTML();
    cargarMisSolicitudes();
}

function repuestosSolicitudesHTML() {
    return '<div class="form-actions" style="justify-content:flex-start;margin-bottom:10px;">' +
        '<button type="button" id="repuestosSolicitarBtn" class="btn-secondary" onclick="toggleSolicitudRepuestos()">＋ Solicitar repuestos</button></div>' +
        '<div id="repuestosSolicitarGroup" style="display:none;">' +
        '<div id="repuestosModRows"></div>' +
        '<button type="button" class="btn-secondary btn-add" onclick="agregarRepuestoRow(\'repuestosModRows\')">＋ Agregar repuesto</button>' +
        '<div class="form-actions" style="margin-top:10px;"><button type="button" class="btn-primary" onclick="enviarSolicitudRepuestos()">Enviar solicitud</button></div></div>' +
        '<div id="repuestosMsg" style="margin-top:10px;"></div>' +
        '<input type="text" id="solMiRepBuscar" placeholder="Buscar repuesto, fecha o estado..." oninput="renderMisRepuestos()" style="width:100%;box-sizing:border-box;padding:9px;border:1px solid #ccc;border-radius:8px;margin:10px 0 4px;">' +
        '<div id="repuestosLista" style="margin-top:8px;"></div>';
}

function cargarMisSolicitudes() {
    fetchJSON("solicitudes", { nombre: usuarioActual.nombre, rol: usuarioActual.rol })
        .then(function (data) {
            miRepData = (data && data.repuestos) || [];
            renderMisRepuestos();
        })
        .catch(function () {
            var el = document.getElementById("repuestosLista");
            if (el) el.innerHTML = '<div class="lista-vacia">Sin conexion. No se pudieron cargar tus solicitudes.</div>';
        });
}

function repuestosSubVista(sub) {
    if (sub !== "inventario" && sub !== "lista" && sub !== "utilizados" && sub !== "solicitudes") return;
    repSubActual = sub;
    var cont = document.getElementById("repuestosContent");
    if (!cont) return;
    setSubVolver("Volver a Repuestos", renderRepuestosModulo);
    cont.innerHTML = '<div id="repSubContent"></div>';
    pintarRepSub(sub);
}

function pintarRepSub(sub) {
    var cont = document.getElementById("repSubContent");
    if (!cont) return;
    if (sub === "solicitudes") {
        cont.innerHTML = repuestosSolicitudesHTML();
        cargarMisSolicitudes();
        return;
    }
    if (sub === "inventario") {
        cont.innerHTML =
            '<div class="module-title" style="font-size:1rem;">Inventario de repuestos</div>' +
            '<div style="font-size:.82rem;color:#888;margin:-4px 0 10px;">Registra repuestos nuevos o ajusta el stock.</div>' +
            '<div id="invStats" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;"></div>' +
            '<div class="inv-form-card">' +
            '<div class="inv-form-title">Nuevo repuesto / Actualizar stock</div>' +
            '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">' +
            '<input type="text" id="invRepNombre" placeholder="Nombre del repuesto" style="flex:1;min-width:170px;padding:9px;border:1px solid #ccc;border-radius:8px;box-sizing:border-box;">' +
            '<input type="number" id="invRepCantidad" placeholder="Cantidad" min="0" style="width:110px;padding:9px;border:1px solid #ccc;border-radius:8px;box-sizing:border-box;">' +
            '<select id="invRepAccion" style="padding:9px;border:1px solid #ccc;border-radius:8px;">' +
            '<option value="sumar">Sumar cantidad</option>' +
            '<option value="ajustar">Ajustar (cantidad exacta)</option></select>' +
            '<button type="button" class="btn-primary" onclick="guardarInventarioRepuesto()">Guardar</button></div>' +
            '<div id="invMsg" style="margin-top:8px;color:#666;font-size:.82rem;"></div></div>' +
            '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:4px;">' +
            '<button type="button" class="btn-secondary" onclick="repuestosSubVista(\'lista\')">Ver lista completa</button>' +
            '<span style="font-size:.78rem;color:#888;">La lista completa con busqueda y orden por cantidad esta en esa categoria.</span></div>';
        cargarInventario();
        return;
    }
    if (sub === "lista") {
        cont.innerHTML =
            '<div class="module-title" style="font-size:1rem;">Lista de inventario</div>' +
            '<div style="font-size:.82rem;color:#888;margin:-4px 0 10px;">Toda la lista de repuestos. Busca, ordena por cantidad o repon con el boton +.</div>' +
            '<div id="invStats" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;"></div>' +
            '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:8px;">' +
            '<input type="text" id="invBuscar" placeholder="Buscar repuesto..." oninput="filtrarInventario()" style="flex:1;min-width:180px;padding:9px;border:1px solid #ccc;border-radius:8px;box-sizing:border-box;">' +
            '<div style="display:inline-flex;border:1px solid #ccc;border-radius:16px;overflow:hidden;">' +
            '<button type="button" id="invModoEstado" class="prev-filtro prev-filtro-activo" onclick="cambiarInvModo(\'estado\')">Por estado</button>' +
            '<button type="button" id="invModoTabla" class="prev-filtro" onclick="cambiarInvModo(\'tabla\')">Lista</button>' +
            '</div></div>' +
            '<div id="invLista" class="lista-vacia">Cargando inventario...</div>';
        cargarInventario();
        return;
    }
    if (sub === "utilizados") {
        cont.innerHTML =
            '<div class="module-title" style="font-size:1rem;">Repuestos utilizados</div>' +
            '<p style="color:#888;font-size:.8rem;margin:0 0 8px;">Solo lectura. Cada repuesto registrado en un mantenimiento descuenta su cantidad del inventario.</p>' +
            '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px;">' +
            '<select id="utiTecnico" style="padding:8px;border:1px solid #ccc;border-radius:8px;"><option value="">Todos los tecnicos</option></select>' +
            '<input type="date" id="utiFecha" style="padding:8px;border:1px solid #ccc;border-radius:8px;">' +
            '<input type="text" id="utiTrabajo" placeholder="Buscar trabajo / equipo..." style="flex:1;min-width:160px;padding:8px;border:1px solid #ccc;border-radius:8px;" oninput="cargarUtilizados()">' +
            '<button type="button" class="btn-primary" onclick="cargarUtilizados()">Filtrar</button></div>' +
            '<div id="utiLista" class="lista-vacia">Cargando utilizados...</div>';
        fetchJSON("personal", {}, { cacheMs: 120000 }).then(function (data) {
            var sel = document.getElementById("utiTecnico");
            if (!sel) return;
            var tecs = (data || []).filter(function (p) { return String(p.tipo).toUpperCase() === "TECNICO"; });
            var html = '<option value="">Todos los tecnicos</option>';
            tecs.forEach(function (p) { html += '<option value="' + escaparHTML(p.nombre) + '">' + escaparHTML(p.nombre) + '</option>'; });
            sel.innerHTML = html;
        }).catch(function () {});
        cargarUtilizados();
        return;
    }
}

var invData = [];
var INV_STOCK_MIN = 5;

function cargarInventario() {
    var cont = document.getElementById("invLista");
    if (cont) cont.innerHTML = '<div class="lista-vacia">Cargando inventario...</div>';
    fetchJSON("inventario", {})
        .then(function (data) {
            invData = (data && data.inventario) || [];
            pintarInvStats();
            var lista = document.getElementById("invLista");
            if (lista) filtrarInventario();
        })
        .catch(function () {
            if (cont) cont.innerHTML = '<div class="lista-vacia">Sin conexion. No se pudo cargar el inventario.</div>';
        });
}

var invUltimaQ = "";
var invModo = "estado";
var invSortCampo = "nombre";
var invSortDir = 1;
var invFiltrados = [];
var invPagina = 1;
var INV_POR_PAGINA = 60;

function filtrarInventario() {
    var cont = document.getElementById("invLista");
    if (!cont) return;
    pintarInvStats();
    var q = String((document.getElementById("invBuscar") || {}).value || "").trim().toLowerCase();
    if (q !== invUltimaQ) {
        invUltimaQ = q;
        invPagina = 1;
    }
    invFiltrados = invData.filter(function (r) {
        if (!q) return true;
        return String(r.repuesto || "").toLowerCase().indexOf(q) !== -1;
    });
    invFiltrados.sort(function (a, b) {
        if (invSortCampo === "cantidad") {
            var ca = parseInt(a.cantidad, 10) || 0;
            var cb = parseInt(b.cantidad, 10) || 0;
            return (ca - cb) * invSortDir;
        }
        return String(a.repuesto || "").localeCompare(String(b.repuesto || "")) * invSortDir;
    });
    renderInvLista();
}

function renderInvLista() {
    var cont = document.getElementById("invLista");
    if (!cont) return;
    if (invFiltrados.length === 0) {
        var q = String((document.getElementById("invBuscar") || {}).value || "").trim();
        cont.innerHTML = '<div class="lista-vacia">' + (q ? "No hay repuestos que coincidan con la busqueda." : "No hay repuestos en el inventario. Agrega el primero arriba.") + '</div>';
        return;
    }
    if (invModo === "tabla") renderInvTabla();
    else renderInvPorEstado();
}

function flechaOrden(campo) {
    if (invSortCampo !== campo) return "";
    return invSortDir === 1 ? " ^" : " v";
}

function filaInventario(r, conEstado) {
    var c = parseInt(r.cantidad, 10) || 0;
    var estado = c === 0 ? "Sin stock" : (c <= INV_STOCK_MIN ? "Stock bajo" : "Disponible");
    var color = c === 0 ? "#c62828" : (c <= INV_STOCK_MIN ? "#ef6c00" : "#2e7d32");
    var nombreEsc = escaparHTML(r.repuesto);
    var btn = '<button type="button" class="boton-agregar-mini" title="Sumar a este repuesto" data-r="' + nombreEsc + '" onclick="irAReponer(this.dataset.r)">+</button>';
    return '<tr>' +
        '<td class="inv-td-nombre"><b>' + nombreEsc + '</b></td>' +
        '<td><span class="estado-badge" style="background:' + color + ';font-size:.75rem;">' + c + '</span></td>' +
        (conEstado ? '<td style="color:' + color + ';font-size:.8rem;font-weight:600;">' + estado + '</td>' : '') +
        '<td class="inv-td-accion">' + btn + '</td>' +
        '</tr>';
}

function renderInvTabla() {
    var cont = document.getElementById("invLista");
    var inicio = (invPagina - 1) * INV_POR_PAGINA;
    var pagina = invFiltrados.slice(inicio, inicio + INV_POR_PAGINA);
    var html = '<div class="inv-tabla-wrap"><table class="inv-tabla"><thead><tr>' +
        '<th class="inv-orden' + (invSortCampo === "nombre" ? " inv-orden-activo" : "") + '" onclick="ordenarInv(\'nombre\')">Repuesto' + flechaOrden("nombre") + '</th>' +
        '<th class="inv-orden' + (invSortCampo === "cantidad" ? " inv-orden-activo" : "") + '" onclick="ordenarInv(\'cantidad\')">Cantidad' + flechaOrden("cantidad") + '</th>' +
        '<th>Estado</th>' +
        '<th class="inv-td-accion"></th>' +
        '</tr></thead><tbody>';
    pagina.forEach(function (r) { html += filaInventario(r, true); });
    html += '</tbody></table></div>';
    html += pintarInvPaginacion(inicio, pagina.length);
    cont.innerHTML = html;
}

function renderInvPorEstado() {
    var cont = document.getElementById("invLista");
    var agotados = [], bajos = [], ok = [];
    invFiltrados.forEach(function (r) {
        var c = parseInt(r.cantidad, 10) || 0;
        if (c === 0) agotados.push(r);
        else if (c <= INV_STOCK_MIN) bajos.push(r);
        else ok.push(r);
    });
    var html = "";
    html += renderInvSeccionTabla("#c62828", "Sin stock", agotados);
    html += renderInvSeccionTabla("#ef6c00", "Stock bajo", bajos);
    html += renderInvSeccionTabla("#2e7d32", "Disponibles", ok);
    cont.innerHTML = html;
}

function renderInvSeccionTabla(color, titulo, lista) {
    if (!lista || lista.length === 0) return "";
    var html = '<div class="inv-seccion-titulo" style="color:' + color + ';">' + titulo + ' (' + lista.length + ')</div>' +
        '<div class="inv-tabla-wrap"><table class="inv-tabla"><tbody>';
    lista.forEach(function (r) { html += filaInventario(r, false); });
    html += '</tbody></table></div>';
    return html;
}

function pintarInvPaginacion(inicio, enPagina) {
    if (invFiltrados.length <= INV_POR_PAGINA) return "";
    var total = invFiltrados.length;
    var hasta = Math.min(inicio + enPagina, total);
    var fin = Math.ceil(total / INV_POR_PAGINA);
    return '<div class="inv-paginacion">' +
        '<button type="button" class="prev-filtro" onclick="anteriorInvPagina()"' + (invPagina <= 1 ? " disabled" : "") + '>Anterior</button>' +
        '<span>' + (inicio + 1) + " - " + hasta + " de " + total + " (pag " + invPagina + "/" + fin + ")</span>" +
        '<button type="button" class="prev-filtro" onclick="siguienteInvPagina()"' + (invPagina >= fin ? " disabled" : "") + '>Siguiente</button>' +
        '</div>';
}

function ordenarInv(campo) {
    if (invSortCampo === campo) invSortDir = invSortDir === 1 ? -1 : 1;
    else { invSortCampo = campo; invSortDir = 1; }
    invPagina = 1;
    renderInvLista();
}

function cambiarInvModo(modo) {
    invModo = modo === "tabla" ? "tabla" : "estado";
    invPagina = 1;
    var bE = document.getElementById("invModoEstado");
    var bT = document.getElementById("invModoTabla");
    if (bE) bE.className = invModo === "estado" ? "prev-filtro prev-filtro-activo" : "prev-filtro";
    if (bT) bT.className = invModo === "tabla" ? "prev-filtro prev-filtro-activo" : "prev-filtro";
    renderInvLista();
}

function siguienteInvPagina() { invPagina++; renderInvLista(); }
function anteriorInvPagina() { if (invPagina > 1) { invPagina--; renderInvLista(); } }

function pintarInvStats() {
    var el = document.getElementById("invStats");
    if (!el) return;
    var total = 0, disponibles = 0, bajos = 0, agotados = 0;
    invData.forEach(function (r) {
        var c = parseInt(r.cantidad, 10) || 0;
        total++;
        if (c === 0) agotados++;
        else if (c <= INV_STOCK_MIN) bajos++;
        else disponibles++;
    });
    el.innerHTML =
        '<div class="stat-chip stat-chip-total"><b>' + total + '</b> total</div>' +
        '<div class="stat-chip stat-chip-disponible"><b>' + disponibles + '</b> con stock</div>' +
        '<div class="stat-chip stat-chip-bajo"><b>' + bajos + '</b> por reponer</div>' +
        '<div class="stat-chip stat-chip-agotado"><b>' + agotados + '</b> sin stock</div>';
}

function prellenarInventarioRepuesto(nombre) {
    var inp = document.getElementById("invRepNombre");
    if (!inp) return;
    inp.value = String(nombre || "");
    var cant = document.getElementById("invRepCantidad");
    if (cant) cant.value = "";
    var acc = document.getElementById("invRepAccion");
    if (acc) acc.value = "sumar";
    var msg = document.getElementById("invMsg");
    if (msg) msg.innerHTML = "";
    if (cant) cant.focus();
}

function irAReponer(nombre) {
    repuestosSubVista("inventario");
    prellenarInventarioRepuesto(nombre);
}

function guardarInventarioRepuesto() {
    var nombre = (document.getElementById("invRepNombre").value || "").trim();
    var cantidad = parseInt(document.getElementById("invRepCantidad").value, 10);
    if (!nombre) { alert("Indica el nombre del repuesto."); return; }
    if (isNaN(cantidad) || cantidad < 0) { alert("Indica una cantidad valida."); return; }
    var accion = document.getElementById("invRepAccion").value;
    var existente = null;
    invData.forEach(function (r) {
        if (String(r.repuesto || "").toLowerCase() === nombre.toLowerCase()) existente = r;
    });
    var actual = existente ? (parseInt(existente.cantidad, 10) || 0) : 0;
    var nuevo = accion === "ajustar" ? cantidad : (actual + cantidad);
    if (nuevo < 0) nuevo = 0;
    var msg = document.getElementById("invMsg");
    msg.innerHTML = '<div style="color:#666;">Guardando...</div>';
    postJSON({ tipo: "inventario_repuesto", repuesto: nombre, cantidad: cantidad, accion: accion })
        .then(function () {
            msg.innerHTML = '<div style="color:#2e7d32;font-weight:600;">' + escaparHTML(nombre) + ': ' + nuevo + ' unidades en inventario.</div>';
            document.getElementById("invRepNombre").value = "";
            document.getElementById("invRepCantidad").value = "";
            cargarInventario();
        })
        .catch(function () {
            msg.innerHTML = '<div style="color:#d32f2f;font-weight:600;">Sin conexion. No se pudo guardar.</div>';
        });
}

function cargarUtilizados() {
    var cont = document.getElementById("utiLista");
    if (!cont) return;
    cont.innerHTML = '<div class="lista-vacia">Buscando utilizados...</div>';
    var tecnico = (document.getElementById("utiTecnico") || {}).value || "";
    var fecha = (document.getElementById("utiFecha") || {}).value || "";
    var trabajo = (document.getElementById("utiTrabajo") || {}).value || "";
    fetchJSON("repuestos_utilizados", { tecnico: tecnico, fecha: fecha, trabajo: trabajo })
        .then(function (data) {
            var arr = (data && data.utilizados) || [];
            if (arr.length === 0) {
                cont.innerHTML = '<div class="lista-vacia">No hay repuestos utilizados con esos filtros.</div>';
                return;
            }
            var html = "";
            arr.forEach(function (u) {
                html += '<div class="dash-card dash-card-repuesto">' +
                    '<div style="flex:1;"><b>' + escaparHTML(u.repuesto) + '</b> x <b>' + escaparHTML(u.cantidad) + '</b>' +
                    '<div style="color:#888;font-size:.8rem;">' + escaparHTML(u.tecnico) + ' - ' + escaparHTML(formatearFechaHora(u.fecha, u.hora)) +
                    (u.equipo ? ' | Trabajo: ' + escaparHTML(u.equipo) : '') + (u.sede ? ' | ' + escaparHTML(u.sede) : '') + '</div></div></div>';
            });
            cont.innerHTML = html;
        })
        .catch(function () {
            cont.innerHTML = '<div class="lista-vacia">Sin conexion. No se pudieron cargar los utilizados.</div>';
        });
}

function toggleSolicitudRepuestos() {
    var group = document.getElementById("repuestosSolicitarGroup");
    if (!group) return;
    group.style.display = group.style.display === "none" ? "block" : "none";
}

function enviarSolicitudRepuestos() {
    if (!usuarioActual) return;
    var repuestos = getRepuestos("repuestosModRows");
    if (repuestos.length === 0) {
        alert("Agrega al menos un repuesto.");
        return;
    }
    for (var ir = 0; ir < repuestos.length; ir++) {
        var cantR = parseInt(repuestos[ir].cantidad, 10);
        if (isNaN(cantR) || cantR < 1) {
            alert("Indica la cantidad de cada repuesto.");
            return;
        }
    }
    var msg = document.getElementById("repuestosMsg");
    msg.innerHTML = '<div style="color:#666;">Enviando solicitud...</div>';
    var fh = fechaHoraAhora();
    postJSON({ tipo: "solicitud_repuestos", fecha: fh.fecha, hora: fh.hora, tecnico: usuarioActual.nombre, repuestos: repuestos })
        .then(function () {
            msg.innerHTML = '<div style="color:#2e7d32;font-weight:600;">Solicitud enviada. El estado te llegara.</div>';
            document.getElementById("repuestosModRows").innerHTML = "";
            document.getElementById("repuestosSolicitarGroup").style.display = "none";
            if (repSubActual === "solicitudes") {
                cargarMisSolicitudes();
            } else {
                renderRepuestosModulo();
            }
        })
        .catch(function () {
            msg.innerHTML = '<div style="color:#d32f2f;font-weight:600;">Sin conexion. No se pudo enviar.</div>';
        });
}

function renderAverias() {
    var cont = document.getElementById("averiasContent");
    if (!cont) return;
    var secPrin = document.getElementById("averiasSection");
    if (secPrin) secPrin.style.display = "block";
    setSubVolver(null);
    ocultarMiniNav();
    var fAveria = document.getElementById("averiaForm");
    if (fAveria) fAveria.style.display = "none";
    var rol = usuarioActual ? usuarioActual.rol : "";
    var cards = [];
    if (esRolAdmin(rol)) {
        cards = [
            ["crear", "Crear averia", "📋", "Reporta o registra una averia"],
            ["asignar", "Administrar averias", "🛠️", "Asigna, edita y borra averias"],
            ["estado", "Estado", "📊", "Averias por categoria, pendientes y tiempos de respuesta"]
        ];
    } else {
        cards = [
            ["crear", "Crear averia", "📋", "Reporta o registra una averia"],
            ["estado", "Mis averias / Estado", "📊", "Averias por categoria y tus pendientes"]
        ];
    }
    cont.innerHTML = '<div class="dashboard-cards">' + cards.map(function (c) {
        return '<button type="button" class="dash-card dash-card-mant" onclick="averiasSubVista(\'' + c[0] + '\')"><div class="dash-card-icon">' + c[2] + '</div><div class="dash-card-label">' + c[1] + '</div><div style="color:#888;font-size:.75rem;margin-top:4px;text-align:center;">' + c[3] + '</div></button>';
    }).join("") + '</div>';
}

function averiasSubVista(sub) {
    var cont = document.getElementById("averiasContent");
    if (!cont) return;
    if (sub === "crear") {
        setSubVolver("Volver a Averias", renderAverias);
        var sec = document.getElementById("averiasSection");
        if (sec) sec.style.display = "none";
        document.getElementById("averiaForm").style.display = "block";
        clearAveriaForm();
        populateSelect("aSedes", SEDES);
        document.getElementById("empleadoInfo").textContent = "Registrado por: " + (usuarioActual ? usuarioActual.nombre : tecnicoNombre);
        mostrarMiniNav();
        return;
    }
    var rol = usuarioActual ? usuarioActual.rol : "";
    if (sub === "asignar" && esRolAdmin(rol)) {
        setSubVolver("Volver a Averias", renderAverias);
        cont.innerHTML = '<div id="aAsigContent"></div>';
        renderAsignarAverias();
        return;
    }
    if (sub === "estado") {
        setSubVolver("Volver a Averias", renderAverias);
        cont.innerHTML = '<div id="aEstadoContent"></div>';
        renderEstadoAverias();
        return;
    }
    renderAverias();
}

var aEstadoCat = "pendientes";
var aEstadoDataCache = null;
var ESTADO_CATS = [
    { id: "pendientes", label: "Pendientes", color: "#d32f2f" },
    { id: "realizada", label: "Realizada", color: "#2e7d32" },
    { id: "proceso", label: "En proceso", color: "#f57c00" },
    { id: "falsa", label: "Falsa averia", color: "#1976d2" },
    { id: "norealizada", label: "No realizada", color: "#757575" }
];

function renderoEstadoAveriasTabs() {
    var cont = document.getElementById("aEstadoContent");
    if (!cont) return;
    var tabs = ESTADO_CATS.map(function (c) {
        var activo = aEstadoCat === c.id;
        return '<button type="button" onclick="cambiarEstadoCat(\'' + c.id + '\')" style="' +
            (activo ? 'background:#1976d2;color:#fff;border-color:#1976d2;' : 'background:transparent;color:#333;border-color:#ccc;') +
            'border:1px solid;border-radius:20px;padding:7px 14px;font-size:.85rem;cursor:pointer;">' + c.label + '</button>';
    }).join("");
    var nav = document.getElementById("aEstadoTabs");
    if (nav) nav.innerHTML = tabs;
}

function cambiarEstadoCat(cat) {
    aEstadoCat = cat;
    renderoEstadoAveriasTabs();
    pintarEstadoAverias(aEstadoDataCache);
}

function catDeAveria(a) {
    var s = String(a.estado || (a.realizado === "Si" ? "Realizada" : a.realizado === "No" ? "No realizada" : a.realizado === "Falsa averia" ? "Falsa averia" : a.realizado === "En proceso" ? "En proceso" : "Pendiente") || "Pendiente");
    var m = { "Pendiente": "pendientes", "Realizada": "realizada", "En proceso": "proceso", "Falsa averia": "falsa", "No realizada": "norealizada" };
    return m[s] || "pendientes";
}

function colorDeAveria(a) {
    var id = catDeAveria(a);
    for (var i = 0; i < ESTADO_CATS.length; i++) {
        if (ESTADO_CATS[i].id === id) return ESTADO_CATS[i].color;
    }
    return "#888";
}

function labelDeCatAveria(id) {
    for (var i = 0; i < ESTADO_CATS.length; i++) {
        if (ESTADO_CATS[i].id === id) return ESTADO_CATS[i].label;
    }
    return id;
}

function renderEstadoAverias() {
    var cont = document.getElementById("aEstadoContent");
    if (!cont) return;
    if (aEstadoCat === "inicio") aEstadoCat = "pendientes";
    cont.innerHTML = '<div id="aEstadoTabs" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px;"></div>' +
        '<input type="text" id="aEstadoBuscar" placeholder="Buscar numero, equipo, sede o tecnico..." oninput="pintarEstadoAverias(aEstadoDataCache)" style="width:100%;box-sizing:border-box;padding:9px;border:1px solid #ccc;border-radius:8px;margin-bottom:8px;">' +
        '<div id="aEstadoLista" class="lista-vacia">Cargando averias...</div>';
    renderoEstadoAveriasTabs();
    if (aEstadoDataCache === null) {
        fetchJSON("averias", {}, { cacheMs: 8000 })
            .then(function (res) {
                aEstadoDataCache = (Array.isArray(res) ? res : (res && res.averias) || []);
                averiasDisponibles = aEstadoDataCache;
                averiasCargadas = true;
                pintarEstadoAverias(aEstadoDataCache);
            })
            .catch(function () {
                var el = document.getElementById("aEstadoLista");
                if (el) el.innerHTML = '<div class="lista-vacia">Sin conexion. No se pudieron cargar las averias.</div>';
            });
    } else {
        pintarEstadoAverias(aEstadoDataCache);
    }
}

function pintarEstadoAverias(data) {
    var el = document.getElementById("aEstadoLista");
    if (!el) return;
    var rol = usuarioActual ? usuarioActual.rol : "";
    var esTecnico = rol === NUESTROS_ROLES.TECNICO;
    var soloMias = esTecnico || rol === NUESTROS_ROLES.USUARIO || rol === NUESTROS_ROLES.PORTERO;
    var q = String((document.getElementById("aEstadoBuscar") || {}).value || "").trim().toLowerCase();
    var arr = (data || []).filter(function (a) {
        if (soloMias) {
            if (esTecnico) {
                if (String(a.asignado || "").trim() !== tecnicoNombre) return false;
            } else {
                if (String(a.empleado || "").trim() !== usuarioActual.nombre) return false;
            }
        }
        if (catDeAveria(a) !== aEstadoCat) return false;
        if (!q) return true;
        return (String(a.numero || "") + " " + String(a.equipo || "") + " " + String(a.sede || "") + " " + String(a.zona || "") + " " + String(a.asignado || "") + " " + String(a.empleado || "")).toLowerCase().indexOf(q) !== -1;
    });
    if (arr.length === 0) {
        el.className = "lista-vacia";
        el.innerHTML = q ? "No hay averias que coincidan con la busqueda." : "No hay averias en esta categoria.";
        return;
    }
    el.className = "";
    el.innerHTML = "";
    arr.forEach(function (a) {
        var card = document.createElement("div");
        card.className = "card";
        card.style.cssText = "margin-bottom:10px;padding:12px;border-left:4px solid " + colorDeAveria(a) + ";";
        var tiempo = a.horasRespuesta != null && a.tiempoRespuesta !== "---" ? (' | Tiempo de respuesta: <b>' + escaparHTML(a.tiempoRespuesta) + '</b>') : '';
        var btn = (!a.resuelto && esTecnico && String(a.asignado || "").trim() === tecnicoNombre) ?
            '<button type="button" class="btn-primary" style="margin-top:8px;font-size:0.8rem;padding:8px 12px;" onclick="abrirResolucionPorNumero(\'' + String(a.numero).replace(/'/g, "&#39;") + '\')">Resolver</button>' : '';
        card.innerHTML =
            '<div style="font-weight:700;color:' + colorDeAveria(a) + ';">Averia ' + escaparHTML(a.numero) + ' ' + badgeEstado(labelDeCatAveria(catDeAveria(a))) + '</div>' +
            '<div style="font-size:.85rem;color:#333;">Equipo: <b>' + escaparHTML(a.equipo) + '</b> | ' + escaparHTML(a.sede || "") + (a.zona ? ' / ' + escaparHTML(a.zona) : '') + '</div>' +
            '<div style="font-size:.8rem;color:#555;">Reportada: ' + escaparHTML(formatearFechaHora(a.fecha, a.hora)) + (a.asignado ? ' | Tecnico: <b>' + escaparHTML(a.asignado) + '</b>' : '') + (a.empleado ? ' | Por: ' + escaparHTML(a.empleado) : '') + (a.fechaRespuesta ? ' | Respondio: ' + escaparHTML(formatearFechaHora(a.fechaRespuesta, a.horaRespuesta)) : '') + tiempo + '</div>' +
            (a.descripcion ? '<div style="font-size:.8rem;color:#777;margin-top:4px;">' + escaparHTML(a.descripcion) + '</div>' : '') +
            htmlFotosAveria(a) +
            btn;
        el.appendChild(card);
    });
}

var aAsigDatos = { averias: [], tecnicos: [], todas: [] };
var aAsigVerTodas = false;

function renderAsignarAverias() {
    var cont = document.getElementById("aAsigContent");
    if (!cont) return;
    cont.innerHTML = '<div class="module-title" style="font-size:1rem;">Averias: asignar, editar y borrar</div>' +
        '<label style="display:flex;align-items:center;gap:8px;font-size:.85rem;margin-bottom:8px;">' +
        '<input type="checkbox" id="aAsigTodas"' + (aAsigVerTodas ? " checked" : "") + ' onchange="aAsigVerTodas=this.checked;renderAsignarAverias()">' +
        'Ver tambien las ya resueltas</label>' +
        '<input type="text" id="aAsigBuscar" placeholder="Buscar por numero, equipo, sede o tecnico..." oninput="filtrarAsignarAverias()" style="width:100%;box-sizing:border-box;padding:9px;border:1px solid #ccc;border-radius:8px;margin-bottom:8px;">' +
        '<div id="aAsigLista" class="lista-vacia">Cargando averias...</div>';
    fetchJSON("averias", {}, { cacheMs: 8000 })
        .then(function (res) {
            var todas = (Array.isArray(res) ? res : (res && res.averias) || []);
            var arr = aAsigVerTodas ? todas : todas.filter(function (a) { return !a.resuelto; });
            return fetchJSON("personal", {}, { cacheMs: 120000 }).then(function (per) {
                var techs = (per || []).filter(function (p) { return String(p.tipo).toUpperCase() === "TECNICO"; }).map(function (p) { return p.nombre; });
                aAsigDatos = { averias: arr, tecnicos: techs, todas: todas };
                pintarAsignarAverias(cont, arr, techs);
            });
        })
        .catch(function () {
            var el = document.getElementById("aAsigLista");
            if (el) el.innerHTML = '<div class="lista-vacia">Sin conexion. No se pudieron cargar las averias.</div>';
        });
}

function filtrarAsignarAverias() {
    pintarAsignarAverias(null, aAsigDatos.averias, aAsigDatos.tecnicos);
}

function pintarAsignarAverias(cont, arr, techs) {
    var el = document.getElementById("aAsigLista");
    if (!el) return;
    var q = String((document.getElementById("aAsigBuscar") || {}).value || "").trim().toLowerCase();
    var filt = q ? arr.filter(function (a) {
        return (String(a.numero || "") + " " + String(a.equipo || "") + " " + String(a.sede || "") + " " + String(a.zona || "") + " " + String(a.empleado || "") + " " + String(a.asignado || "")).toLowerCase().indexOf(q) !== -1;
    }) : arr;
    if (filt.length === 0) {
        el.className = "lista-vacia";
        el.innerHTML = q ? "No hay averias que coincidan con la busqueda." : "No hay averias pendientes por asignar.";
        return;
    }
    el.className = "";
    el.innerHTML = "";
    filt.forEach(function (a) {
        var sel = document.createElement("select");
        sel.id = "aAsigSel_" + a.numero;
        sel.style.cssText = "padding:6px;border:1px solid #ccc;border-radius:6px;flex:1;min-width:160px;";
        var opt = document.createElement("option");
        opt.value = "";
        opt.textContent = "-- Seleccionar tecnico --";
        sel.appendChild(opt);
        techs.forEach(function (n) {
            var o = document.createElement("option");
            o.value = n;
            o.textContent = n;
            if (String(a.asignado || "") === n) o.selected = true;
            sel.appendChild(o);
        });
        var card = document.createElement("div");
        card.className = "card";
        card.style.cssText = "margin-bottom:10px;padding:12px;border-left:4px solid " + (a.resuelto ? "#2e7d32" : "#1976d2") + ";";
        card.innerHTML =
            '<div style="font-weight:700;color:#1976d2;">Averia ' + escaparHTML(a.numero) + (a.estado && a.estado !== "Pendiente" ? ' | ' + escaparHTML(a.estado) : '') + (a.resuelto ? ' <span style="font-size:.7rem;color:#2e7d32;">(resuelta)</span>' : '') + '</div>' +
            '<div style="font-size:.85rem;color:#333;">Equipo: <b>' + escaparHTML(a.equipo) + '</b> | ' + escaparHTML(a.sede || "") + (a.zona ? ' / ' + escaparHTML(a.zona) : '') + '</div>' +
            '<div style="font-size:.8rem;color:#555;">Reportada: ' + escaparHTML(formatearFechaHora(a.fecha, a.hora)) + ' | Por: ' + escaparHTML(a.empleado || "") + (a.asignado ? ' | Asignado a: <b>' + escaparHTML(a.asignado) + '</b>' : '') + '</div>' +
            (a.descripcion ? '<div style="font-size:.8rem;color:#777;margin-bottom:8px;">' + escaparHTML(a.descripcion) + '</div>' : '') +
            htmlFotosAveria(a) +
            '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;"></div>';
        var controls = card.querySelector("div:last-child");
        if (!a.resuelto) {
            controls.appendChild(sel);
            var btn = document.createElement("button");
            btn.type = "button";
            btn.className = "btn-primary";
            btn.style.cssText = "padding:6px 12px;font-size:.8rem;";
            btn.textContent = a.asignado ? "Cambiar" : "Asignar";
            btn.onclick = function () { asignarAveriaModulo(a.numero); };
            controls.appendChild(btn);
        }
        var btnEditar = document.createElement("button");
        btnEditar.type = "button";
        btnEditar.className = "btn-primary";
        btnEditar.style.cssText = "padding:6px 12px;font-size:.8rem;background:#f57c00;";
        btnEditar.textContent = "Editar";
        btnEditar.onclick = function () { editarAveriaModulo(a.numero); };
        controls.appendChild(btnEditar);
        var btnBorrar = document.createElement("button");
        btnBorrar.type = "button";
        btnBorrar.style.cssText = "padding:6px 12px;font-size:.8rem;background:#d32f2f;color:#fff;border:none;border-radius:8px;cursor:pointer;";
        btnBorrar.textContent = "Borrar";
        btnBorrar.onclick = function () { borrarAveriaModulo(a.numero); };
        controls.appendChild(btnBorrar);
        el.appendChild(card);
    });
}

var ESTADOS_AVERIA_ = ["Pendiente", "En proceso", "Realizada", "No realizada", "Falsa averia"];

function editarAveriaModulo(numero) {
    var a = (aAsigDatos.todas || aAsigDatos.averias || []).filter(function (x) { return x.numero === numero; })[0];
    if (!a) { alert("No se encontro la averia " + numero + "."); return; }
    var op = ESTADOS_AVERIA_.map(function (e) {
        return '<option value="' + escaparHTML(e) + '"' + (String(a.estado || "") === e ? " selected" : "") + '>' + escaparHTML(e) + '</option>';
    }).join("");
    var html =
        '<div class="module-title" style="font-size:1rem;">Editar averia ' + escaparHTML(numero) + '</div>' +
        '<div style="display:flex;flex-direction:column;gap:8px;margin-bottom:10px;">' +
        '<input type="text" id="edSede" value="' + escaparHTML(a.sede || "") + '" placeholder="Sede" style="padding:9px;border:1px solid #ccc;border-radius:8px;">' +
        '<input type="text" id="edZona" value="' + escaparHTML(a.zona || "") + '" placeholder="Zona" style="padding:9px;border:1px solid #ccc;border-radius:8px;">' +
        '<input type="text" id="edEquipo" value="' + escaparHTML(a.equipo || "") + '" placeholder="Equipo" style="padding:9px;border:1px solid #ccc;border-radius:8px;">' +
        '<select id="edEstado" style="padding:9px;border:1px solid #ccc;border-radius:8px;">' + op + '</select>' +
        '<input type="text" id="edAsignado" value="' + escaparHTML(a.asignado || "") + '" placeholder="Tecnico asignado" style="padding:9px;border:1px solid #ccc;border-radius:8px;">' +
        '<textarea id="edDescripcion" rows="3" placeholder="Descripcion" style="padding:9px;border:1px solid #ccc;border-radius:8px;">' + escaparHTML(a.descripcion || "") + '</textarea>' +
        '<div style="display:flex;gap:8px;">' +
        '<button type="button" class="btn-primary" style="flex:1;" onclick="guardarEdicionAveria(\'' + escaparHTML(numero) + '\')">Guardar</button>' +
        '<button type="button" style="flex:1;padding:9px;border:1px solid #ccc;border-radius:8px;background:#fff;cursor:pointer;" onclick="renderAsignarAverias()">Cancelar</button>' +
        '</div></div>';
    document.getElementById("aAsigContent").innerHTML = html;
    window.scrollTo(0, 0);
}

function guardarEdicionAveria(numero) {
    postJSON({
        tipo: "editar_averia",
        numero: numero,
        empleado: usuarioActual ? usuarioActual.nombre : "",
        sede: document.getElementById("edSede").value.trim(),
        zona: document.getElementById("edZona").value.trim(),
        equipo: document.getElementById("edEquipo").value.trim(),
        estado: document.getElementById("edEstado").value,
        asignado: document.getElementById("edAsignado").value.trim(),
        descripcion: document.getElementById("edDescripcion").value.trim()
    }).then(function (r) {
        if (r && r.status === "error") { alert(r.message || "No se pudo editar."); return; }
        borrarCacheV("averias");
        alert("Averia " + numero + " actualizada.");
        if (typeof notiRefrescar === "function") notiRefrescar(true);
        renderAsignarAverias();
    }).catch(function () { alert("Sin conexion. No se pudo editar la averia."); });
}

function borrarAveriaModulo(numero) {
    if (!confirm("Borrar la averia " + numero + "?\n\nTambien se eliminaran sus fotos de Drive. Esto no se puede deshacer.")) return;
    postJSON({ tipo: "borrar_averia", numero: numero, empleado: usuarioActual ? usuarioActual.nombre : "" })
        .then(function (r) {
            if (r && r.status === "error") { alert(r.message || "No se pudo borrar."); return; }
            borrarCacheV("averias");
            alert("Averia " + numero + " borrada.");
            if (typeof notiRefrescar === "function") notiRefrescar(true);
            renderAsignarAverias();
        }).catch(function () { alert("Sin conexion. No se pudo borrar la averia."); });
}

function asignarAveriaModulo(numero) {
    var sel = document.getElementById("aAsigSel_" + numero);
    if (!sel || !sel.value) { alert("Selecciona un tecnico."); return; }
    postJSON({ tipo: "asignar_averia", numero: numero, tecnicoNombre: sel.value })
        .then(function () {
            borrarCacheV("averias");
            alert("Averia " + numero + " asignada a " + sel.value + ".");
            if (typeof notiRefrescar === "function") notiRefrescar(true);
            renderAsignarAverias();
        })
        .catch(function () {
            alert("Sin conexion. No se pudo asignar la averia.");
        });
}

function renderSolicitudes() {
    setSubVolver(null);
    var cont = document.getElementById("solicitudesContent");
    if (!cont) return;
    var rol = usuarioActual ? usuarioActual.rol : "";
    var cards = [];
    if (esRolAdmin(rol)) {
        cards = [["repuestos", "Repuestos / Materiales", "🔩"], ["cisternas", "Cisterna", "🚰"], ["generales", "Generales", "📋"]];
    } else if (rol === NUESTROS_ROLES.GERENTE) {
        cards = [["crear", "Crear solicitud", "✍️"], ["historial", "Historial", "📚"]];
    } else if (rol === NUESTROS_ROLES.TECNICO) {
        cards = [["repuestos", "Mis solicitudes de repuestos", "🔩"]];
    } else {
        cont.innerHTML = '<div class="lista-vacia">Tus pedidos se gestionan con los tecnicos o desde el modulo Repuestos.</div>';
        return;
    }
    cont.innerHTML = '<div class="dashboard-cards">' +
        cards.map(function (c) {
            return '<button type="button" class="dash-card dash-card-mant" onclick="solicitudesSubVista(\'' + c[0] + '\')">' +
                '<div class="dash-card-icon">' + c[2] + '</div><div class="dash-card-label">' + c[1] + '</div></button>';
        }).join("") + '</div>';
}

function solicitudesSubVista(sub) {
    solSubActual = sub;
    var cont = document.getElementById("solicitudesContent");
    if (!cont) return;
    setSubVolver("Volver a Solicitudes", renderSolicitudes);
    cont.innerHTML = '<div id="solSubContent"></div>';
    pintarSolSub(sub);
}

function pintarSolSub(sub) {
    var cont = document.getElementById("solSubContent");
    if (!cont) return;
    var rol = usuarioActual ? usuarioActual.rol : "";
    var esAdmin = esRolAdmin(rol);
    var esGestion = esAdmin || rol === NUESTROS_ROLES.GERENTE;
    if (sub === "repuestos") {
        cont.innerHTML = '<div class="module-title" style="font-size:1rem;">' +
            (esAdmin ? "Repuestos / Materiales (lo que piden los tecnicos en un trabajo)" : (rol === NUESTROS_ROLES.TECNICO ? "Mis solicitudes de repuestos" : "Repuestos / Materiales (lectura)")) +
            '</div>' +
            '<input type="text" id="solRepBuscar" placeholder="Buscar repuesto, tecnico, fecha o estado..." oninput="filtrarSolRepuestos()" style="width:100%;box-sizing:border-box;padding:9px;border:1px solid #ccc;border-radius:8px;margin-bottom:10px;">' +
            '<div id="solicitudesRepuestosLista"></div>';
        fetchJSON("solicitudes", { nombre: usuarioActual.nombre, rol: rol })
            .then(function (data) {
                solRepData = (data && data.repuestos) || [];
                pintarSolRepLista(esGestion);
            })
            .catch(function () {
                var el = document.getElementById("solicitudesRepuestosLista");
                if (el) el.innerHTML = '<div class="lista-vacia">Sin conexion. No se pudieron cargar las solicitudes.</div>';
            });
        return;
    }
    if (sub === "cisternas") {
        if (esAdmin) {
            cisternaCategorias();
        } else {
            cont.innerHTML = '<div class="module-title" style="font-size:1rem;">Cisterna</div>' +
                '<div class="lista-vacia">Solo el administrador gestiona las cisternas.</div>';
        }
        return;
    }
    if (sub === "crear") {
        cont.innerHTML = formSolicitudNuevaHTML();
        return;
    }
    if (sub === "historial") {
        cont.innerHTML = '<div class="module-title" style="font-size:1rem;">Historial de solicitudes</div>' +
            '<input type="text" id="solHistBuscar" placeholder="Buscar por descripcion, solicitante, fecha o estado..." oninput="filtrarSolHistorial()" style="width:100%;box-sizing:border-box;padding:9px;border:1px solid #ccc;border-radius:8px;margin-bottom:8px;">' +
            '<div id="solHistGenerales"></div>';
        fetchJSON("solicitudes", { nombre: usuarioActual.nombre, rol: rol })
            .then(function (data) {
                solGenData = (data && data.generales) || [];
                pintarSolHistorial();
            })
            .catch(function () {
                var el = document.getElementById("solHistGenerales");
                if (el) el.innerHTML = '<div class="lista-vacia">Sin conexion. No se pudieron cargar las solicitudes.</div>';
            });
        return;
    }
    cont.innerHTML = '<div class="module-title" style="font-size:1rem;">' + (esAdmin ? "Solicitudes generales (todas)" : "Solicitudes generales") + '</div>' +
        '<input type="text" id="solGenBuscar" placeholder="Buscar descripcion, solicitante, fecha o estado..." oninput="filtrarSolGenerales()" style="width:100%;box-sizing:border-box;padding:9px;border:1px solid #ccc;border-radius:8px;margin-bottom:8px;">' +
        '<div id="solicitudesGeneralesLista"></div>';
    fetchJSON("solicitudes", { nombre: usuarioActual.nombre, rol: rol })
        .then(function (data) {
            solGenData = (data && data.generales) || [];
            pintarSolGenLista(esGestion);
        })
        .catch(function () {
            var el = document.getElementById("solicitudesGeneralesLista");
            if (el) el.innerHTML = '<div class="lista-vacia">Sin conexion. No se pudieron cargar las solicitudes generales.</div>';
        });
}

function formSolicitudNuevaHTML() {
    return '<div class="module-title" style="font-size:1rem;">Nueva solicitud</div>' +
        '<div style="margin-bottom:14px;border:1px solid #e0e0e0;border-radius:12px;padding:14px;">' +
        '<textarea id="solicitudGeneralDesc" rows="3" placeholder="Describe que necesitas (arreglar un equipo, agregar una pizarra, reparar una instalacion, etc.)" style="width:100%;box-sizing:border-box;padding:10px;border:1px solid #ccc;border-radius:8px;"></textarea>' +
        '<div style="margin-top:8px;text-align:right;"><button type="button" class="btn-primary" onclick="enviarSolicitudGeneral()">Enviar solicitud</button></div>' +
        '<div id="solicitudGeneralMsg" style="margin-top:8px;"></div></div>';
}

function pintarSolHistorial() {
    var q = String((document.getElementById("solHistBuscar") || {}).value || "");
    var editable = usuarioActual && (esRolAdmin(usuarioActual.rol) || usuarioActual.rol === NUESTROS_ROLES.GERENTE);
    pintarGenerales(document.getElementById("solHistGenerales"), solGenData, editable, q);
}

function filtrarSolHistorial() {
    pintarSolHistorial();
}

function cargarVoceroSolicitudes(mode) {
    fetchJSON("solicitudes", { nombre: usuarioActual.nombre, rol: usuarioActual.rol })
        .then(function (data) {
            pintarSolicitudes(mode, data);
        })
        .catch(function () {
            var cont = document.getElementById("solicitudesContent");
            if (cont) cont.innerHTML = '<div class="lista-vacia">Sin conexion. No se pudieron cargar las solicitudes.</div>';
        });
}

function pintarSolicitudes(mode, data) {
    data = data || { repuestos: [], generales: [], cisternas: [] };
    if (mode === "repuestos") {
        pintarTarjetasRepuestos(document.getElementById("solicitudesLista"), data.repuestos || [], false);
    } else if (mode === "generales") {
        pintarGenerales(document.getElementById("solicitudesLista"), data.generales || [], false);
    } else if (mode === "admin") {
        pintarTarjetasRepuestos(document.getElementById("solicitudesRepuestosLista"), data.repuestos || [], true);
        pintarGenerales(document.getElementById("solicitudesGeneralesLista"), data.generales || [], true);
        pintarCisternas(document.getElementById("solicitudesCisternasLista"), data.cisternas || []);
    }
}

var solRepData = [];
var solGenData = [];
var miRepData = [];

function pintarSolRepLista(editable) {
    var el = document.getElementById("solicitudesRepuestosLista");
    if (!el) return;
    pintarTarjetasRepuestos(el, solRepData, editable, (document.getElementById("solRepBuscar") || {}).value || "");
}

function filtrarSolRepuestos() {
    pintarSolRepLista(usuarioActual && (esRolAdmin(usuarioActual.rol) || usuarioActual.rol === NUESTROS_ROLES.GERENTE));
}

function pintarSolGenLista(editable) {
    var el = document.getElementById("solicitudesGeneralesLista");
    if (!el) return;
    pintarGenerales(el, solGenData, editable, (document.getElementById("solGenBuscar") || {}).value || "");
}

function filtrarSolGenerales() {
    pintarSolGenLista(usuarioActual && (esRolAdmin(usuarioActual.rol) || usuarioActual.rol === NUESTROS_ROLES.GERENTE));
}

function renderMisRepuestos() {
    var el = document.getElementById("repuestosLista");
    if (!el) return;
    var q = String((document.getElementById("solMiRepBuscar") || {}).value || "").trim().toLowerCase();
    var items = miRepData.slice().reverse().filter(function (s) {
        if (!q) return true;
        return (String(s.repuesto || "") + " " + String(s.cantidad || "") + " " + String(s.fecha || "") + " " + String(s.hora || "") + " " + String(s.estado || "")).toLowerCase().indexOf(q) !== -1;
    });
    var html = '<div class="module-title" style="font-size:.9rem;">Mis solicitudes</div>';
    if (items.length === 0) {
        el.innerHTML = html + '<div class="lista-vacia">' + (q ? "No hay solicitudes que coincidan con la busqueda." : "Aun no tienes solicitudes de repuestos.") + '</div>';
        return;
    }
    items.forEach(function (s) {
        html += '<div class="dash-card dash-card-repuesto">' +
            '<div style="flex:1;"><b>' + escaparHTML(s.repuesto) + '</b> x ' + escaparHTML(s.cantidad) +
            '<div style="color:#888;font-size:.8rem;">' + escaparHTML(formatearFechaHora(s.fecha, s.hora)) + '</div></div>' +
            badgeEstado(s.estado) + '</div>';
    });
    el.innerHTML = html;
}

function pintarTarjetasRepuestos(el, arr, editable, q) {
    if (!el) return;
    if (!arr || arr.length === 0) { el.innerHTML = '<div class="lista-vacia">No hay solicitudes.</div>'; return; }
    var Q = String(q || "").trim().toLowerCase();
    var items = arr.slice().reverse().filter(function (s) {
        if (!Q) return true;
        return (String(s.repuesto || "") + " " + String(s.cantidad || "") + " " + String(s.tecnico || "") + " " + String(s.fecha || "") + " " + String(s.hora || "") + " " + String(s.estado || "")).toLowerCase().indexOf(Q) !== -1;
    });
    if (items.length === 0) { el.innerHTML = '<div class="lista-vacia">No hay solicitudes que coincidan con la busqueda.</div>'; return; }
    var html = "";
    items.forEach(function (s) {
        html += '<div class="dash-card dash-card-repuesto">' +
            '<div style="flex:1;"><b>' + escaparHTML(s.repuesto) + '</b> x ' + escaparHTML(s.cantidad) +
            '<div style="color:#888;font-size:.8rem;">' + escaparHTML(s.tecnico) + ' - ' + escaparHTML(formatearFechaHora(s.fecha, s.hora)) + '</div></div>' +
            (editable ? selectEstado("repuestos", s.row, s.estado) : badgeEstado(s.estado)) + '</div>';
    });
    el.innerHTML = html;
}

function pintarGenerales(el, arr, editable, q) {
    if (!el) return;
    if (!arr || arr.length === 0) { el.innerHTML = '<div class="lista-vacia">No hay solicitudes.</div>'; return; }
    var Q = String(q || "").trim().toLowerCase();
    var items = arr.slice().reverse().filter(function (s) {
        if (!Q) return true;
        return (String(s.descripcion || "") + " " + String(s.solicitante || "") + " " + String(s.fecha || "") + " " + String(s.hora || "") + " " + String(s.estado || "")).toLowerCase().indexOf(Q) !== -1;
    });
    if (items.length === 0) { el.innerHTML = '<div class="lista-vacia">No hay solicitudes que coincidan con la busqueda.</div>'; return; }
    var html = "";
    items.forEach(function (s) {
        html += '<div class="dash-card dash-card-trabajo">' +
            '<div style="flex:1;"><b>' + escaparHTML(s.descripcion) + '</b>' +
            '<div style="color:#888;font-size:.8rem;">' + escaparHTML(s.solicitante) + ' - ' + escaparHTML(formatearFechaHora(s.fecha, s.hora)) + '</div></div>' +
            (editable ? selectEstado("generales", s.row, s.estado) : badgeEstado(s.estado)) + '</div>';
    });
    el.innerHTML = html;
}

function pintarCisternas(el, arr) {
    if (!el) return;
    if (!arr || arr.length === 0) { el.innerHTML = '<div class="lista-vacia">No hay cisternas pendientes de pago.</div>'; return; }
    var html = "";
    arr.forEach(function (c) {
        html += '<div class="dash-card dash-card-trabajo">' +
            '<div style="flex:1;"><b>' + escaparHTML(c.sede) + '</b> - ' + escaparHTML(formatearFechaHora(c.fecha, c.hora)) +
            '<div style="color:#888;font-size:.8rem;">Zona: ' + escaparHTML(c.zona) + (c.tecnico ? ' | Tecnico: ' + escaparHTML(c.tecnico) : '') + (c.monto ? ' | Monto: ' + escaparHTML(c.monto) : '') + '</div></div>' +
            badgeEstado(c.estado) + '</div>';
    });
    el.innerHTML = html;
}

function cisternaCategorias() {
    var cont = document.getElementById("solSubContent");
    if (!cont) return;
    cont.innerHTML = '<div class="module-title" style="font-size:1rem;">Cisterna</div>' +
        '<div style="color:#888;font-size:.8rem;margin:0 0 10px;">Gestiona solicitudes, gastos y pagos de cisterna (solo administrador).</div>' +
        '<div class="dashboard-cards">' +
        '<button type="button" class="dash-card dash-card-mant" onclick="cisternaCat(\'todo\')"><div class="dash-card-icon">📋</div><div class="dash-card-label">Todo</div></button>' +
        '<button type="button" class="dash-card dash-card-mant" onclick="cisternaCat(\'solicitar\')"><div class="dash-card-icon">🚛</div><div class="dash-card-label">Solicitar</div></button>' +
        '<button type="button" class="dash-card dash-card-mant" onclick="cisternaCat(\'gastos\')"><div class="dash-card-icon">💸</div><div class="dash-card-label">Gastos</div></button>' +
        '<button type="button" class="dash-card dash-card-mant" onclick="cisternaCat(\'pagos\')"><div class="dash-card-icon">✅</div><div class="dash-card-label">Pagos</div></button>' +
        '</div>';
}

function cisternaCat(cat) {
    pushSubVolver("Volver a Cisterna", cisternaCategorias);
    var cont = document.getElementById("solSubContent");
    if (!cont) return;
    if (cat === "todo") pintarCisternaTodo();
    else if (cat === "solicitar") pintarCisternaSolicitar();
    else if (cat === "gastos") pintarCisternaGastos();
    else if (cat === "pagos") pintarCisternaPagos();
}

function pintarCisternaTodo() {
    var cont = document.getElementById("solSubContent");
    if (!cont) return;
    cont.innerHTML = '<div class="module-title" style="font-size:1rem;">Todo (registros de cisterna)</div>' +
        '<input type="text" id="cisBuscar" placeholder="Buscar por sede, zona, tecnico, fecha, estado..." oninput="filtrarCisternaTodo()" style="width:100%;padding:9px;border:1px solid #ccc;border-radius:8px;box-sizing:border-box;margin-bottom:10px;">' +
        '<div id="cisTodoLista" class="lista-vacia">Cargando registros...</div>';
    fetchJSON("deudas_cisterna", {})
        .then(function (data) {
            cisternaCache = (data && data.deudas) || [];
            pintarCisternaTodoLista();
        })
        .catch(function () {
            var el = document.getElementById("cisTodoLista");
            if (el) el.innerHTML = '<div class="lista-vacia">Sin conexion. No se pudieron cargar los registros.</div>';
        });
}

function filtrarCisternaTodo() {
    var el = document.getElementById("cisTodoLista");
    if (!el) return;
    pintarCisternaTodoLista();
}

function pintarCisternaTodoLista() {
    var el = document.getElementById("cisTodoLista");
    if (!el) return;
    var q = String((document.getElementById("cisBuscar") || {}).value || "").trim().toLowerCase();
    var arr = cisternaCache.filter(function (c) {
        if (!q) return true;
        return (c.sede + " " + c.zona + " " + c.tecnico + " " + c.fecha + " " + c.hora + " " + c.estado + " " + c.monto + " " + c.pagado + " " + c.restante).toLowerCase().indexOf(q) !== -1;
    });
    if (arr.length === 0) { el.innerHTML = '<div class="lista-vacia">No hay registros que coincidan.</div>'; return; }
    var html = "";
    arr.slice().forEach(function (c) {
        html += '<div class="dash-card dash-card-trabajo">' +
            '<div style="flex:1;"><b>' + escaparHTML(c.sede) + '</b> - ' + escaparHTML(formatearFechaHora(c.fecha, c.hora)) +
            '<div style="color:#888;font-size:.8rem;">Zona: ' + escaparHTML(c.zona || "") +
            (c.tecnico ? ' | Tecnico: ' + escaparHTML(c.tecnico) : '') +
            (c.monto ? ' | Monto: ' + escaparHTML(c.monto) : '') +
            (c.pagado ? ' | Pagado: ' + escaparHTML(c.pagado) : '') +
            (c.restante ? ' | Restante: ' + escaparHTML(c.restante) : '') + '</div></div>' +
            badgeEstado(c.estado) + '</div>';
    });
    el.innerHTML = html;
}

function pintarCisternaSolicitar() {
    var cont = document.getElementById("solSubContent");
    if (!cont) return;
    cont.innerHTML =
        '<div class="module-title" style="font-size:1rem;">Solicitar cisterna</div>' +
        '<div style="color:#888;font-size:.8rem;margin-bottom:10px;">Estas son las cisternas que los tecnicos pidieron en la tarea Semanero - Tanques. Pulsa Solicitar para enviar el pedido a WhatsApp.</div>' +
        '<input type="text" id="cisColaBuscar" placeholder="Buscar sede, zona, tecnico o fecha..." oninput="filtrarColaCisterna()" style="width:100%;box-sizing:border-box;padding:9px;border:1px solid #ccc;border-radius:8px;margin-bottom:10px;">' +
        '<div id="cisColaLista" class="lista-vacia">Cargando pedidos...</div>';
    cargarColaCisterna();
}

var cisColaData = [];

function cargarColaCisterna() {
    var el = document.getElementById("cisColaLista");
    if (!el) return;
    fetchJSON("deudas_cisterna", {})
        .then(function (data) {
            cisColaData = (data && data.deudas || []).filter(function (c) { return c.estado !== "Pagado"; });
            filtrarColaCisterna();
        })
        .catch(function () {
            el.innerHTML = '<div class="lista-vacia">Sin conexion. No se pudieron cargar los pedidos.</div>';
        });
}

function filtrarColaCisterna() {
    var el = document.getElementById("cisColaLista");
    if (!el) return;
    var q = String((document.getElementById("cisColaBuscar") || {}).value || "").trim().toLowerCase();
    var arr = cisColaData.filter(function (c) {
        if (!q) return true;
        return (String(c.sede || "") + " " + String(c.zona || "") + " " + String(c.tecnico || "") + " " + String(c.fecha || "") + " " + String(c.hora || "") + " " + String(c.monto || "") + " " + String(c.restante || "")).toLowerCase().indexOf(q) !== -1;
    });
    if (arr.length === 0) { el.innerHTML = '<div class="lista-vacia">' + (q ? "No hay pedidos que coincidan con la busqueda." : "No hay cisternas pendientes pedidas por los tecnicos.") + '</div>'; return; }
    var html = "";
    arr.slice().reverse().forEach(function (c) {
        html += '<div class="dash-card dash-card-trabajo">' +
            '<div style="flex:1;"><b>' + escaparHTML(c.sede) + '</b> - ' + escaparHTML(formatearFechaHora(c.fecha, c.hora)) +
            '<div style="color:#888;font-size:.8rem;">Zona: ' + escaparHTML(c.zona || "") +
            (c.tecnico ? ' | Tecnico: ' + escaparHTML(c.tecnico) : '') +
            (c.monto ? ' | Monto: ' + escaparHTML(c.monto) : '') +
            (c.restante ? ' | Restante: ' + escaparHTML(c.restante) : '') + '</div></div>' +
            '<button type="button" class="btn-primary" style="font-size:.78rem;padding:7px 10px;" onclick="enviarPedidoCisternaWhatsapp(\'' + escaparHTML(c.sede || "").replace(/'/g, "&#39;") + '\',\'' + escaparHTML(c.zona || "").replace(/'/g, "&#39;") + '\',\'' + escaparHTML(c.fecha || "").replace(/'/g, "&#39;") + '\',\'' + escaparHTML(c.hora || "").replace(/'/g, "&#39;") + '\',\'' + escaparHTML(c.monto || "").replace(/'/g, "&#39;") + '\',\'' + escaparHTML(c.tecnico || "").replace(/'/g, "&#39;") + '\')">Solicitar por WhatsApp</button></div>';
    });
    el.innerHTML = html;
}

function enviarPedidoCisternaWhatsapp(sede, zona, fecha, hora, monto, tecnico) {
    var msg = construirMensajePedidoCisterna(sede, zona, fecha, hora, monto, tecnico);
    window.open("https://wa.me/?text=" + encodeURIComponent(msg), "_blank");
}

function construirMensajePedidoCisterna(sede, zona, fecha, hora, monto, tecnico) {
    return "SOLICITUD DE CISTERNA" +
        "\nSede: " + sede +
        (zona ? "\nZona: " + zona : "") +
        (monto ? "\nMonto estimado: " + monto : "") +
        (fecha ? "\nFecha: " + fecha : "") +
        (hora ? "\nHora: " + hora : "") +
        (tecnico ? "\nPedida por: " + tecnico : "");
}

var cisGastoCatActual = "mensual";
var cisGastoDataCache = null;

function pintarCisternaGastos() {
    var cont = document.getElementById("solSubContent");
    if (!cont) return;
    cont.innerHTML = '<div class="module-title" style="font-size:1rem;">Gastos de cisterna</div>' +
        '<div id="cisGastoHeader"></div>' +
        '<input type="text" id="cisGastoBuscar" placeholder="Buscar por fecha, semana o mes (ej: 2026-08)..." oninput="pintarCisternaGastoActual()" style="width:100%;box-sizing:border-box;padding:9px;border:1px solid #ccc;border-radius:8px;margin-bottom:8px;">' +
        '<div id="cisGastoLista" class="lista-vacia">Cargando gastos...</div>' +
        '<div id="cisGastoTotales"></div>';
    pintarCisternaGastoHeader();
    if (cisGastoDataCache) {
        pintarCisternaGastoActual();
    } else {
        fetchJSON("cisterna_gastos", {})
            .then(function (data) {
                cisGastoDataCache = {
                    semanal: (data && data.semanal) || [],
                    mensual: (data && data.mensual) || [],
                    anual: (data && data.anual) || []
                };
                pintarCisternaGastoActual();
            })
            .catch(function () {
                var el = document.getElementById("cisGastoLista");
                if (el) el.innerHTML = '<div class="lista-vacia">Sin conexion. No se pudieron cargar los gastos.</div>';
            });
    }
}

function pintarCisternaGastoHeader() {
    var el = document.getElementById("cisGastoHeader");
    if (!el) return;
    var cats = [["semanal", "Semanal"], ["mensual", "Mensual"], ["anual", "Anual"]];
    el.innerHTML = '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px;">' + cats.map(function (c) {
        var activo = cisGastoCatActual === c[0];
        return '<button type="button" onclick="cisGastoCat(\'' + c[0] + '\')" style="' +
            (activo ? 'background:#2e7d32;color:#fff;border-color:#2e7d32;' : 'background:transparent;color:#333;border-color:#ccc;') +
            'border:1px solid;border-radius:20px;padding:7px 14px;font-size:.85rem;cursor:pointer;">' + c[1] + '</button>';
    }).join("") + '</div>';
}

function cisGastoCat(cat) {
    cisGastoCatActual = cat;
    pintarCisternaGastoHeader();
    pintarCisternaGastoActual();
}

function pintarCisternaGastoActual() {
    var el = document.getElementById("cisGastoLista");
    if (!el) return;
    var arr = cisGastoDataCache ? (cisGastoDataCache[cisGastoCatActual] || []) : [];
    var q = String((document.getElementById("cisGastoBuscar") || {}).value || "").trim().toLowerCase();
    var filt = q ? arr.filter(function (g) { return String(g.clave || "").toLowerCase().indexOf(q) !== -1; }) : arr;
    var total = 0;
    filt.forEach(function (g) { total += (parseFloat(g.total) || 0); });
    var titulos = { semanal: "Totales por semana", mensual: "Totales por mes", anual: "Totales por anio" };
    var html = '<div class="module-title" style="font-size:.95rem;">' + titulos[cisGastoCatActual] + '</div>';
    if (filt.length === 0) {
        html += '<div class="lista-vacia">' + (q ? "No hay datos que coincidan con la busqueda." : "Sin datos de gastos para esta categoria.") + '</div>';
    } else {
        var max = 0;
        filt.forEach(function (g) { if ((parseFloat(g.total) || 0) > max) max = parseFloat(g.total) || 0; });
        filt.forEach(function (g) {
            var val = parseFloat(g.total) || 0;
            var pct = max ? Math.round((val / max) * 100) : 0;
            html += '<div style="margin-bottom:6px;">' +
                '<div style="display:flex;justify-content:space-between;font-size:.8rem;color:#555;margin-bottom:2px;"><span>' + escaparHTML(g.clave) + '</span><b>$' + val + '</b></div>' +
                '<div style="background:#e8f5e9;border-radius:8px;height:10px;overflow:hidden;"><div style="width:' + pct + '%;background:#2e7d32;border-radius:8px;height:10px;"></div></div></div>';
        });
    }
    var te = document.getElementById("cisGastoTotales");
    if (te) te.innerHTML = '<div style="margin-top:10px;padding:10px;background:#f1f8e9;border-radius:10px;font-size:.9rem;">Total filtrado: <b>$' + total + '</b> (' + filt.length + ' periodo' + (filt.length === 1 ? "" : "s") + ')</div>';
    el.className = "";
    el.innerHTML = html;
}

function pintarCisternaPagos() {
    var cont = document.getElementById("solSubContent");
    if (!cont) return;
    cont.innerHTML = '<div class="module-title" style="font-size:1rem;">Pagos (lo que se debe)</div>' +
        '<p style="color:#888;font-size:.8rem;margin:0 0 8px;">Marca cada cisterna como pagada en total, o indica un abono. Al completar el monto pasa a "Pagado".</p>' +
        '<div id="cisPagosLista" class="lista-vacia">Cargando deudas...</div>';
    fetchJSON("deudas_cisterna", {})
        .then(function (data) {
            var arr = ((data && data.deudas) || []).filter(function (c) { return c.estado !== "Pagado"; });
            pintarCisternasPagos(arr);
        })
        .catch(function () {
            var el = document.getElementById("cisPagosLista");
            if (el) el.innerHTML = '<div class="lista-vacia">Sin conexion. No se pudieron cargar las deudas.</div>';
        });
}

function pintarCisternasPagos(arr) {
    var el = document.getElementById("cisPagosLista");
    if (!el) return;
    if (!arr || arr.length === 0) { el.innerHTML = '<div class="lista-vacia">No hay deudas pendientes.</div>'; return; }
    var html = "";
    arr.slice().forEach(function (c) {
        var restante = c.restante || c.monto || "";
        html += '<div class="dash-card dash-card-trabajo" style="flex-wrap:wrap;">' +
            '<div style="flex:1;min-width:200px;"><b>' + escaparHTML(c.sede) + '</b> - ' + escaparHTML(formatearFechaHora(c.fecha, c.hora)) +
            '<div style="color:#888;font-size:.8rem;">Zona: ' + escaparHTML(c.zona || "") +
            (c.tecnico ? ' | Tecnico: ' + escaparHTML(c.tecnico) : '') +
            ' | Monto: ' + escaparHTML(c.monto || "") +
            ' | Restante: <b>' + escaparHTML(restante) + '</b></div></div>' +
            badgeEstado(c.estado) +
            '<div style="width:100%;display:flex;gap:8px;align-items:center;margin-top:6px;flex-wrap:wrap;">' +
            '<button type="button" class="btn-primary" style="padding:6px 10px;font-size:.78rem;" onclick="pagarCisternaRow(' + c.rowIndex + ',\'total\')">Pago total</button>' +
            '<input type="number" id="pagoPar_' + c.rowIndex + '" placeholder="$ abono" min="1" style="width:110px;padding:6px;border:1px solid #ccc;border-radius:6px;">' +
            '<button type="button" class="btn-secondary" style="padding:6px 10px;font-size:.78rem;" onclick="pagarCisternaRow(' + c.rowIndex + ',\'parcial\')">Abonar</button>' +
            '</div></div>';
    });
    el.innerHTML = html;
}

function pagarCisternaRow(fila, accion) {
    var monto = 0;
    if (accion === "parcial") {
        var inp = document.getElementById("pagoPar_" + fila);
        if (!inp) return;
        monto = parseFloat(inp.value) || 0;
        if (monto <= 0) { alert("Indica el monto del abono."); return; }
    }
    postJSON({ tipo: "pagar_cisterna_parcial", rowIndex: fila, accion: accion, monto: monto })
        .then(function () {
            pintarCisternaPagos();
        })
        .catch(function () {
            alert("Sin conexion. No se pudo registrar el pago.");
        });
}

function enviarSolicitudGeneral() {
    if (!usuarioActual) return;
    var desc = document.getElementById("solicitudGeneralDesc").value.trim();
    if (!desc) { alert("Describe la solicitud."); return; }
    var msgEl = document.getElementById("solicitudGeneralMsg");
    msgEl.innerHTML = '<div style="color:#666;">Enviando...</div>';
    var fh = fechaHoraAhora();
    postJSON({ tipo: "solicitud_general", fecha: fh.fecha, hora: fh.hora, solicitante: usuarioActual.nombre, descripcion: desc })
        .then(function () {
            msgEl.innerHTML = '<div style="color:#2e7d32;font-weight:600;">Solicitud enviada.</div>';
            var inpTxt = document.getElementById("solicitudGeneralDesc");
            if (inpTxt) inpTxt.value = "";
        })
        .catch(function () {
            msgEl.innerHTML = '<div style="color:#d32f2f;font-weight:600;">Sin conexion. No se pudo enviar.</div>';
        });
}

var preventivosCache = [];
var prevFiltroActual = "todos";
var prevSubActual = "programar";
var anioCalendario = new Date().getFullYear();
var personalCache = [];
var empleadoReporteActual = null;
var repSubActual = "inventario";
var solSubActual = "repuestos";
var cisternaCache = [];

var FRECUENCIA_SEMANAS = { "Semanal": 1, "Quincenal": 2, "Mensual": 4, "Trimestral": 12, "Semestral": 26, "Anual": 52 };

function claveSemanaJS(fecha) {
    var d = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
    var dayNum = d.getDay() || 7;
    var thursday = new Date(d);
    thursday.setDate(d.getDate() + 4 - dayNum);
    var firstDay = new Date(thursday.getFullYear(), 0, 1);
    var weekNo = Math.ceil((((thursday - firstDay) / 86400000) + 1) / 7);
    return thursday.getFullYear() + "-S" + String(weekNo).padStart(2, "0");
}

function fechaTextoJS(d) {
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

function fechaParseJS(s) {
    if (!s) return null;
    var m = String(s).match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (m) return new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10));
    var d = new Date(String(s));
    if (isNaN(d.getTime())) return null;
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function renderPreventivos() {
    setSubVolver(null);
    var cont = document.getElementById("preventivosContent");
    if (!cont) return;
    if (!usuarioActual || !esRolAdmin(usuarioActual.rol)) {
        renderPreventivosTecnico();
        return;
    }
    var subs = [
        ["programar", "Programar", "🖥️"],
        ["programados", "Programados", "📅"],
        ["semanal", "Semanal", "📋"],
        ["historial", "Historial", "📚"]
    ];
    cont.innerHTML = '<div class="dashboard-cards">' +
        subs.map(function (s) {
            return '<button type="button" class="dash-card dash-card-mant" onclick="renderPreventivoSubVista(\'' + s[0] + '\')">' +
                '<div class="dash-card-icon">' + s[2] + '</div>' +
                '<div class="dash-card-label">' + s[1] + '</div></button>';
        }).join("") + '</div>';
}

function renderPreventivoSubVista(sub) {
    prevSubActual = sub;
    var cont = document.getElementById("preventivosContent");
    if (!cont) return;
    setSubVolver("Volver a Preventivos", renderPreventivos);
    cont.innerHTML = '<div id="prevSubContent"></div>';
    pintarPrevSub(sub);
}

var prevTecTareas = [];

function renderPreventivosTecnico() {
    var cont = document.getElementById("preventivosContent");
    if (!cont) return;
    cont.innerHTML = '<div class="module-title">Mis preventivos asignados</div>' +
        '<div style="color:#666;font-size:.85rem;margin-bottom:10px;">El sistema tomara la fecha y hora de asignacion y del reporte para medir el tiempo de realizacion. Los datos del equipo se muestran en solo lectura.</div>' +
        '<input type="text" id="prevTecBuscar" placeholder="Buscar equipo, zona o tecnico..." oninput="pintarPrevTecLista(prevTecTareas)" style="width:100%;box-sizing:border-box;padding:9px;border:1px solid #ccc;border-radius:8px;margin-bottom:8px;">' +
        '<div id="prevTecLista" class="lista-vacia">Cargando tus tareas asignadas...</div>';
    fetchJSON("tareas_semanales", { nombre: tecnicoNombre }, { cacheMs: 15000 })
        .then(function (res) {
            prevTecTareas = (res && res.tareas) || [];
            pintarPrevTecLista(prevTecTareas);
        })
        .catch(function () {
            var list = document.getElementById("prevTecLista");
            if (list) list.innerHTML = "Sin conexion. No se pudieron cargar tus tareas.";
        });
}

function pintarPrevTecLista(tareas) {
    var list = document.getElementById("prevTecLista");
    if (!list) return;
    list.style.display = "";
    if (prevAsignadoActivo) { list.style.display = "none"; return; }
    if (tareas.length === 0) {
        list.className = "lista-vacia";
        list.innerHTML = "No tienes preventivos asignados esta semana.";
        return;
    }
    var vistos = {};
    var principales = [];
    tareas.forEach(function (t) {
        if (t.rol !== "principal") return;
        if (vistos[t.equipo]) return;
        vistos[t.equipo] = true;
        principales.push(t);
    });
    if (principales.length === 1) {
        list.className = "lista-vacia";
        list.innerHTML = "Abriendo tu preventivo asignado...";
        var t0 = principales[0];
        iniciarPreventivoAsignado(t0.equipo, t0.zona, t0.marca, t0.ayudante, t0.fechaAsignacion, t0.horaAsignacion);
        return;
    }
    if (principales.length === 0) {
        list.className = "lista-vacia";
        list.innerHTML = "Solo tienes preventivos como apoyo; el reporte de cada mantenimiento lo hace el tecnico principal.";
        return;
    }
    var q = String((document.getElementById("prevTecBuscar") || {}).value || "").trim().toLowerCase();
    var filtradas = q ? tareas.filter(function (t) {
        return (String(t.equipo || "") + " " + String(t.zona || "") + " " + String(t.marca || "") + " " + String(t.tecnico || "") + " " + String(t.ayudante || "")).toLowerCase().indexOf(q) !== -1;
    }) : tareas;
    if (filtradas.length === 0) {
        list.className = "lista-vacia";
        list.innerHTML = "No hay tareas que coincidan con la busqueda.";
        return;
    }
    list.className = "";
    list.innerHTML = "";
    filtradas.forEach(function (t) {
        var div = document.createElement("div");
        div.className = "card";
        div.style.cssText = "margin-bottom:10px;padding:12px;border-left:4px solid #2e7d32;";
        var asig = t.fechaAsignacion ? ('Asignado: ' + formatearFechaHora(t.fechaAsignacion, t.horaAsignacion)) : '';
        div.innerHTML =
            '<div style="font-weight:700;color:#2e7d32;">' + (t.rol === "principal" ? "Preventivo a tu cargo" : "Preventivo (apoyo)") + '</div>' +
            '<div style="font-size:0.9rem;color:#333;margin-top:4px;">Equipo: <b>' + escaparHTML(t.equipo) + '</b></div>' +
            '<div style="font-size:0.82rem;color:#555;">Sede / Zona: ' + escaparHTML(t.zona) + (t.marca ? ' | Marca: ' + escaparHTML(t.marca) : '') + '</div>' +
            (asig ? '<div style="font-size:0.8rem;color:#888;margin-top:2px;">' + asig + '</div>' : '') +
            (t.rol === "ayudante" ? '<div style="font-size:0.8rem;color:#888;margin-top:4px;">Apoyas a <b>' + escaparHTML(t.tecnico) + '</b>. El reporte del mantenimiento lo hace el tecnico principal.</div>' : '') +
            (t.rol === "principal" ? '<div style="font-size:0.82rem;color:#666;margin-top:4px;">La rutina se muestra automaticamente segun el equipo, la sede y la zona asignadas.</div><button type="button" class="btn-primary" style="margin-top:8px;font-size:0.8rem;padding:8px 12px;" onclick="iniciarPreventivoAsignado(\'' + String(t.equipo || "").replace(/'/g, "&#39;") + '\',\'' + escaparHTML(t.zona || "").replace(/'/g, "&#39;") + '\',\'' + escaparHTML(t.marca || "").replace(/'/g, "&#39;") + '\',\'' + escaparHTML(t.ayudante || "").replace(/'/g, "&#39;") + '\',\'' + escaparHTML(t.fechaAsignacion || "").replace(/'/g, "&#39;") + '\',\'' + escaparHTML(t.horaAsignacion || "").replace(/'/g, "&#39;") + '\')">Realizar preventivo</button>' : '');
        list.appendChild(div);
    });
}

function cambiarPrevSub(sub) {
    prevSubActual = sub;
    renderPreventivoSubVista(sub);
}

function pintarPrevSub(sub) {
    if (sub === "programados") { pintarCalendarioPreventivos(); return; }
    if (sub === "semanal") { renderPreventivosSemanal(); return; }
    if (sub === "historial") { renderPreventivosHistorial(); return; }
    renderPreventivosProgramar();
}

function renderPreventivosProgramar() {
    var cont = document.getElementById("prevSubContent");
    if (!cont) return;
    cont.innerHTML = '<div style="border:1px solid #e0e0e0;border-radius:12px;padding:14px;">' +
        '<div class="module-title" style="font-size:1rem;">Programar mantenimientos preventivos</div>' +
        '<p style="color:#888;font-size:.8rem;margin:4px 0 10px;">Indica para cada equipo la fecha de su <b>ultimo mantenimiento</b> (si ya esta programado se toma la fecha guardada) y su frecuencia. Los proximos mantenimientos se contaran desde esa fecha y cada uno tiene un limite de resolucion de 7 dias.</p>' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:8px;">' +
        '<input type="text" id="prevBuscarNombre" placeholder="Filtrar equipos por nombre..." style="flex:1;min-width:180px;padding:9px;border:1px solid #ccc;border-radius:8px;box-sizing:border-box;" oninput="pintarEquiposParaProgramar()">' +
        '<button type="button" class="btn-secondary" onclick="pintarEquiposParaProgramar()">Cargar lista de equipos</button>' +
        '<button type="button" class="btn-secondary" id="prevToggleSelBtn" onclick="toggleSeleccionEquipos()">Seleccionar todos</button>' +
        '</div>' +
        '<div id="prevProgramarLista" style="margin-top:8px;"></div>' +
        '<div style="display:flex;justify-content:space-between;gap:8px;margin-top:8px;flex-wrap:wrap;">' +
        '<button type="button" class="btn-secondary" style="border-color:#d32f2f;color:#d32f2f;" onclick="borrarPreventivosProgramados()">Borrar todos los programados</button>' +
        '<button type="button" class="btn-primary" onclick="programarPreventivosSeleccionados()">Programar seleccionados</button>' +
        '</div>' +
        '<div id="prevProgramarMsg" style="margin-top:6px;color:#666;"></div></div>' +
        '<div style="border:1px solid #e0e0e0;border-radius:12px;padding:14px;margin-top:14px;">' +
        '<div class="module-title" style="font-size:1rem;">Agregar nuevo equipo con rutina</div>' +
        '<p style="color:#888;font-size:.8rem;margin:4px 0 10px;">Para programar un equipo nuevo registra primero su rutina (los pasos que el tecnico marcara en cada preventivo). Si el equipo ya existe solo se actualizara la rutina y la programacion.</p>' +
        '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:8px;">' +
        '<select id="nuevoEqSede" onchange="llenarZonaNuevoEquipo()" style="padding:9px;border:1px solid #ccc;border-radius:8px;"><option value="">Sede...</option>' +
        Object.keys(ZONA_EQUIPOS).map(function (s) { return '<option value="' + escaparHTML(s) + '">' + escaparHTML(s) + '</option>'; }).join("") + '</select>' +
        '<select id="nuevoEqZona" style="padding:9px;border:1px solid #ccc;border-radius:8px;"><option value="">Zona...</option></select>' +
        '<input type="text" id="nuevoEqMarca" placeholder="Marca del equipo" style="padding:9px;border:1px solid #ccc;border-radius:8px;box-sizing:border-box;">' +
        '<input type="text" id="nuevoEqNombre" placeholder="Nombre del equipo" style="padding:9px;border:1px solid #ccc;border-radius:8px;box-sizing:border-box;">' +
        '<select id="nuevoEqFrecuencia" style="padding:9px;border:1px solid #ccc;border-radius:8px;">' +
        ["Semanal", "Quincenal", "Mensual", "Trimestral", "Semestral", "Anual"].map(function (fr) { return '<option' + (fr === "Semanal" ? " selected" : "") + '>' + fr + '</option>'; }).join("") + '</select>' +
        '<input type="date" id="nuevoEqFecha" value="' + hoyYMD() + '" title="Fecha del ultimo mantenimiento (inicio del conteo)" style="padding:9px;border:1px solid #ccc;border-radius:8px;box-sizing:border-box;">' +
        '</div>' +
        '<div class="module-title" style="font-size:.95rem;margin-top:14px;">Rutina del equipo</div>' +
        '<select id="prevRutinaPlantilla" onchange="cargarRutinaPlantilla()" style="padding:9px;border:1px solid #ccc;border-radius:8px;width:100%;margin-bottom:6px;"><option value="">-- Copiar rutina existente --</option>' +
        Object.keys(RUTINA_PREVENTIVO).map(function (r) { return '<option value="' + escaparHTML(r) + '">' + escaparHTML(r) + '</option>'; }).join("") + '</select>' +
        '<textarea id="prevRutinaPasos" rows="6" placeholder="Cada linea sera un paso de la rutina. Ejemplo:&#10;Lubricar puertas&#10;Verificar entradas electricas&#10;Ajustar estructura" style="width:100%;padding:9px;border:1px solid #ccc;border-radius:8px;box-sizing:border-box;resize:vertical;"></textarea>' +
        '<div style="text-align:right;margin-top:8px;"><button type="button" class="btn-primary" onclick="guardarNuevoEquipoPreventivo()">Guardar nuevo equipo</button></div>' +
        '<div id="prevNuevoMsg" style="margin-top:6px;color:#666;"></div></div>';
}

function renderPreventivosHistorial() {
    var cont = document.getElementById("prevSubContent");
    if (!cont) return;
    cont.innerHTML = '<div class="module-title" style="font-size:1rem;">Historial de preventivos</div>' +
        '<input type="text" id="prevBuscarHist" placeholder="Buscar por equipo, marca o zona..." style="width:100%;box-sizing:border-box;padding:9px;border:1px solid #ccc;border-radius:8px;margin-bottom:8px;" oninput="filtrarPreventivos(\'' + prevFiltroActual + '\')">' +
        '<div id="prevFiltros" style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px;">' +
        ["todos:Todos", "realizados:Realizados", "realizadoTarde:Realizados tarde", "retrasados:Retrasados", "noRealizados:No realizados"].map(function (t) {
            var key = t.split(":")[0];
            var lab = t.split(":")[1];
            return '<button type="button" class="prev-filtro' + (key === prevFiltroActual ? " prev-filtro-activo" : "") + '" data-filtro="' + key + '" onclick="filtrarPreventivos(\'' + key + '\')">' + lab + '</button>';
        }).join("") + '</div>' +
        '<p style="color:#888;font-size:.8rem;margin:0 0 8px;">Solo lectura. Para cambiar el estado u reprogramar un equipo usa los sub-modulos Programar o Programados.</p>' +
        '<div id="preventivosLista"></div>';
    if (preventivosCache && preventivosCache.length) { pintarPreventivos(); return; }
    fetchJSON("preventivos", {}, { cacheMs: 15000 })
        .then(function (data) {
            preventivosCache = data || [];
            pintarPreventivos();
        })
        .catch(function () {
            var el = document.getElementById("preventivosLista");
            if (el) el.innerHTML = '<div class="lista-vacia">Sin conexion. No se pudieron cargar los preventivos.</div>';
        });
}

function filtrarPreventivos(f) {
    prevFiltroActual = f || "todos";
    var btns = document.querySelectorAll("#prevFiltros .prev-filtro");
    btns.forEach(function (b) {
        b.classList.toggle("prev-filtro-activo", b.getAttribute("data-filtro") === prevFiltroActual);
    });
    pintarPreventivos();
}

function pintarPreventivos() {
    var el = document.getElementById("preventivosLista");
    if (!el) return;
    var arr = preventivosCache;
    if (!arr || arr.length === 0) { el.innerHTML = '<div class="lista-vacia">No hay preventivos programados.</div>'; return; }
    var q = ((document.getElementById("prevBuscarHist") || {}).value || "").trim().toLowerCase();
    var filtradas = arr.filter(function (p) {
        if (prevFiltroActual === "realizados") return p.estado === "E" && String(p.retrasado || "") !== "Si";
        if (prevFiltroActual === "realizadoTarde") return p.estado === "E" && String(p.retrasado || "") === "Si";
        if (prevFiltroActual === "retrasados") return !!p.vencido && !p.vencidoLargo;
        if (prevFiltroActual === "noRealizados") return !!p.vencidoLargo;
        return true;
    });
    if (q) {
        filtradas = filtradas.filter(function (p) {
            return String(p.equipo || "").toLowerCase().indexOf(q) !== -1 ||
                String(p.marca || "").toLowerCase().indexOf(q) !== -1 ||
                String(p.zona || "").toLowerCase().indexOf(q) !== -1;
        });
    }
    if (filtradas.length === 0) { el.innerHTML = '<div class="lista-vacia">No hay preventivos en esta categoria.</div>'; return; }
    var html = "";
    filtradas.slice().reverse().forEach(function (p) {
        var frecBadge = '<span class="badge-frecuencia' + (/semanal/i.test(p.frecuencia || "") ? " badge-frecuencia-semanal" : "") + '">' + escaparHTML(p.frecuencia || "Sin frecuencia") + '</span>';
        var retBadges = "";
        if (p.vencido) retBadges += '<span class="badge-retraso">VENCIDO</span>';
        if (String(p.retrasado || "") === "Si") retBadges += '<span class="badge-retraso badge-retraso-si">RETRASADO</span>';
        html += '<div class="dash-card dash-card-mant">' +
            '<div style="flex:1;"><b>' + escaparHTML(p.equipo) + '</b>' + (p.marca ? ' - ' + escaparHTML(p.marca) : '') +
            ' ' + retBadges +
            '<div style="color:#888;font-size:.8rem;">Zona: ' + escaparHTML(p.zona) + ' | Tipo: ' + escaparHTML(p.tipo) +
            ' | Frecuencia: ' + frecBadge + '<br>Actividad: ' + escaparHTML(p.actividad) +
            (p.fecha ? ' | Generado: ' + escaparHTML(p.fecha) : '') +
            (p.fechaLimite ? ' | Limite: ' + escaparHTML(p.fechaLimite) : '') +
            (String(p.motivoRetraso || "") ? '<br><span style="color:#d32f2f;">Motivo: ' + escaparHTML(p.motivoRetraso) + '</span>' : '') +
            '</div></div>' + badgeEstado(p.estado) + '</div>';
    });
    el.innerHTML = html;
}

function pintarCalendarioPreventivos() {
    var cont = document.getElementById("prevSubContent");
    if (!cont) return;
    cont.innerHTML = '<div class="module-title" style="font-size:1rem;">Calendario de preventivos - ' + anioCalendario + '</div>' +
        '<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">' +
        '<button type="button" class="btn-secondary" onclick="cambiarAnioCalendario(-1)">&lt; ' + (anioCalendario - 1) + '</button>' +
        '<span style="font-weight:700;">' + anioCalendario + '</span>' +
        '<button type="button" class="btn-secondary" onclick="cambiarAnioCalendario(1)">' + (anioCalendario + 1) + ' &gt;</button>' +
        '</div>' +
        '<div id="prevCalGrid" class="prev-cal-grid"></div>';
    if (preventivosCache && preventivosCache.length) { pintarCalendarioPreventivosGrid(); return; }
    fetchJSON("preventivos", {}, { cacheMs: 15000 })
        .then(function (data) {
            preventivosCache = data || [];
            pintarCalendarioPreventivosGrid();
        })
        .catch(function () {
            var g = document.getElementById("prevCalGrid");
            if (g) g.innerHTML = '<div class="lista-vacia">Sin conexion. No se pudieron cargar los preventivos.</div>';
        });
}

function cambiarAnioCalendario(delta) {
    anioCalendario += delta;
    pintarCalendarioPreventivos();
}

function acortarEquipo(eq) {
    eq = String(eq || "");
    return eq.length > 16 ? eq.slice(0, 15) + ".." : eq;
}

function letraEstadoPreventivo(p) {
    if (String(p.estado || "") === "E") return "E";
    if (String(p.retrasado || "") === "Si") return "E";
    if (p.vencido) return "N";
    return "PR";
}

function colorEstadoPreventivo(st) {
    if (st === "E") return "#2e7d32";
    if (st === "N") return "#d32f2f";
    return "#1976d2";
}

function labelEstadoPreventivo(st) {
    return st === "E" ? "Realizado" : st === "N" ? "No realizado" : "Programado";
}

function chipEstadoPreventivo(o) {
    var col = colorEstadoPreventivo(o.st);
    return '<span class="chip-prev" title="' + escaparHTML(o.equipo) + ' (' + escaparHTML(o.frec || "") + ') - ' + labelEstadoPreventivo(o.st) + '" style="background:' + col + ';color:#fff;border-color:' + col + ';">' + o.st + '</span>';
}

function pintarCalendarioPreventivosGrid() {
    var grid = document.getElementById("prevCalGrid");
    if (!grid) return;
    var celdas = [];
    for (var m = 0; m < 12; m++) celdas.push({});
    var hoy = new Date();
    var meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    (preventivosCache || []).forEach(function (p) {
        var base = fechaParseJS(p.fecha);
        if (!base) return;
        var wks = FRECUENCIA_SEMANAS[String(p.frecuencia || "").trim()] || 1;
        var iniE = String(p.estado || "") === "E" ? 1 : 0;
        for (var i = iniE; i < 120; i++) {
            var o = new Date(base);
            o.setDate(base.getDate() + i * 7 * wks);
            if (o.getFullYear() > anioCalendario) break;
            if (o.getFullYear() < anioCalendario) continue;
            var sem = Math.floor((o.getDate() - 1) / 7) + 1;
            if (!celdas[o.getMonth()][sem]) celdas[o.getMonth()][sem] = [];
            celdas[o.getMonth()][sem].push({ equipo: p.equipo, frec: p.frecuencia, st: letraEstadoPreventivo(p) });
        }
    });
    var html = "";
    for (var m2 = 0; m2 < 12; m2++) {
        html += '<div class="prev-cal-mes"><div class="prev-cal-titulo">' + meses[m2] + '</div>';
        for (var s = 1; s <= 5; s++) {
            var list = celdas[m2][s] || [];
            var esHoy = anioCalendario === hoy.getFullYear() && m2 === hoy.getMonth() && s === Math.floor((hoy.getDate() - 1) / 7) + 1;
            var contSem = list.map(chipEstadoPreventivo).join("") || '<span class="prev-cal-vacio">&mdash;</span>';
            html += '<div class="' + (esHoy ? "prev-cal-sem hoy" : "prev-cal-sem") + '">' +
                '<span class="prev-cal-semlabel">T' + s + '</span>' +
                '<div class="prev-cal-semcont">' + contSem + '</div></div>';
        }
        html += '</div>';
    }
    html += '<div style="grid-column:1 / -1;font-size:.75rem;color:#888;display:flex;gap:10px;flex-wrap:wrap;align-items:center;">Cada celda muestra cuanto hay que hacer esa semana. PR (azul) = programado pendiente, E (verde) = realizado, N (rojo) = no realizado / vencido. Pasa el cursor sobre una letra para ver el equipo.</div>';
    grid.innerHTML = html;
}

function renderPreventivosSemanal() {
    var cont = document.getElementById("prevSubContent");
    if (!cont) return;
    cont.innerHTML =
        '<input type="text" id="prevSemBuscar" placeholder="Buscar equipo, zona, marca o tecnico..." oninput="prevSemQ=this.value;renderPrevSemRedraw()" style="width:100%;box-sizing:border-box;padding:9px;border:1px solid #ccc;border-radius:8px;margin-bottom:10px;" title="Buscador de la lista">' +
        '<div id="prevSemCont" class="lista-vacia">Cargando semana...</div>';
    var cont2 = document.getElementById("prevSemCont");
    var hoy = new Date();
    var semana = claveSemanaJS(hoy);
    var dayNum = hoy.getDay() || 7;
    var lun = new Date(hoy);
    lun.setDate(hoy.getDate() - (dayNum - 1));
    var dom = new Date(lun);
    dom.setDate(lun.getDate() + 6);
    var label = ("0" + (lun.getMonth() + 1)).slice(-2) + "/" + ("0" + lun.getDate()).slice(-2) + " - " +
        ("0" + (dom.getMonth() + 1)).slice(-2) + "/" + ("0" + dom.getDate()).slice(-2);
    Promise.all([fetchJSON("tareas_semanales", { semana: semana }, { cacheMs: 15000 }), fetchJSON("preventivos", {}, { cacheMs: 15000 }), fetchJSON("personal", {}, { cacheMs: 120000 })])
        .then(function (res) {
            var tareas = (res[0] && res[0].tareas) || [];
            var prevs = res[1] || [];
            personalCache = res[2] || personalCache;
            prevSemCache = { cont: cont2, semana: semana, label: label, lun: lun, dom: dom, tareas: tareas, prevs: prevs };
            renderPrevSemRedraw();
        })
        .catch(function () {
            cont2.innerHTML = '<div class="lista-vacia">Sin conexion. No se pudo cargar la semana.</div>';
        });
}

var prevSemCache = null;
var prevSemQ = "";

function renderPrevSemRedraw() {
    if (!prevSemCache) return;
    var c = prevSemCache;
    pintarPrevSemanalDatos(c.cont, c.semana, c.label, c.lun, c.dom, c.tareas, c.prevs, prevSemQ);
}

function pintarPrevSemanalDatos(cont, semana, label, lun, dom, tareas, prevs, q) {
    var asignadas = {};
    var hechas = 0;
    tareas.forEach(function (t) {
        asignadas[t.equipo] = t;
        if (t.estado === "Realizado") hechas++;
    });
    var enSemana = {};
    (prevs || []).forEach(function (p) {
        var base = fechaParseJS(p.fecha);
        if (!base) return;
        var wks = FRECUENCIA_SEMANAS[String(p.frecuencia || "").trim()] || 1;
        var iniE = String(p.estado || "") === "E" ? 1 : 0;
        for (var i = iniE; i < 120; i++) {
            var o = new Date(base);
            o.setDate(base.getDate() + i * 7 * wks);
            if (o > dom) break;
            if (o >= lun) {
                enSemana[p.equipo] = { equipo: p.equipo, zona: p.zona, marca: p.marca, frec: p.frecuencia };
                break;
            }
        }
    });
    var Q = String(q || "").trim().toLowerCase();
    var techs = (personalCache || []).filter(function (per) { return String(per.tipo).toUpperCase() === "TECNICO"; }).map(function (per) { return per.nombre; });
    var equipos = Object.keys(enSemana).sort().filter(function (eq) {
        if (!Q) return true;
        var info = enSemana[eq];
        var asg = asignadas[eq];
        var hay = [eq, info.zona, info.marca, asg && asg.tecnico, asg && asg.ayudante].filter(Boolean).join(" ").toLowerCase();
        return hay.indexOf(Q) !== -1;
    });
    var html = '<div style="margin-bottom:10px;"><span class="module-title" style="font-size:1rem;">Equipos que necesitan mantenimiento esta semana</span>' +
        '<div style="color:#666;font-size:.85rem;margin-top:2px;">Semana ' + semana + ' (' + label + ') - Asignados: <b>' + tareas.length + '</b>, Realizados: <b>' + hechas + '</b></div></div>';
    if (equipos.length === 0) {
        html += '<div class="lista-vacia">' + (Q ? 'No hay equipos que coincidan con la busqueda.' : 'No hay equipos con mantenimiento programado para esta semana.') + '</div>';
    } else {
        equipos.forEach(function (eq) {
            var info = enSemana[eq];
            var asg = asignadas[eq];
            var i = String(eq).replace(/[^a-zA-Z0-9]/g, "_");
            var estadoBadge = asg ? (asg.estado === "Realizado" ? '<span class="badge-frecuencia-semanal" style="margin-left:6px;">REALIZADO</span>' : '<span class="badge-retraso" style="margin-left:6px;">PENDIENTE</span>') : "";
            var selT = '<select id="prevTec_' + i + '" style="padding:6px;border:1px solid #ccc;border-radius:6px;flex:1;min-width:140px;">' +
                '<option value="">-- Tecnico principal --</option>' +
                techs.map(function (n) { return '<option' + (asg && asg.tecnico === n ? " selected" : "") + '>' + escaparHTML(n) + '</option>'; }).join("") + '</select>';
            var selA = '<select id="prevAyu_' + i + '" style="padding:6px;border:1px solid #ccc;border-radius:6px;flex:1;min-width:140px;">' +
                '<option value="">-- Sin apoyo --</option>' +
                techs.map(function (n) { return '<option' + (asg && asg.ayudante === n ? " selected" : "") + '>' + escaparHTML(n) + '</option>'; }).join("") + '</select>';
            html += '<div style="border:1px solid #e0e0e0;border-radius:12px;padding:12px;margin-bottom:10px;">' +
                '<div style="font-weight:700;">' + escaparHTML(eq) + estadoBadge + '<span class="badge-frecuencia' + (/semanal/i.test(info.frec || "") ? " badge-frecuencia-semanal" : "") + '" style="margin-left:6px;">' + escaparHTML(info.frec || "") + '</span></div>' +
                '<div style="color:#888;font-size:.8rem;margin-bottom:8px;">Zona: ' + escaparHTML(info.zona) + (info.marca ? ' | Marca: ' + escaparHTML(info.marca) : '') + '</div>' +
                (asg && asg.fechaAsignacion ? '<div style="color:#888;font-size:.78rem;margin-bottom:6px;">Asignado: ' + escaparHTML(formatearFechaHora(asg.fechaAsignacion, asg.horaAsignacion || '')) + (asg.estado === "Realizado" && asg.tiempoMin != null ? ' | Duro: <b>' + asg.tiempoMin + ' min</b>' : '') + '</div>' : '') +
                '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px;">' + selT + selA + '</div>' +
                '<button type="button" class="btn-primary" id="prevAsg_' + i + '" style="font-size:.8rem;padding:8px 12px;" onclick="asignarPreventivoSemanal(\'' + semana + '\',\'' + label + '\',\'' + eq.replace(/'/g, "&#39;") + '\',\'' + escaparHTML(info.zona).replace(/'/g, "&#39;") + '\',\'' + escaparHTML(info.marca).replace(/'/g, "&#39;") + '\')">' + (asg ? "Cambiar asignacion" : "Asignar tecnico") + '</button>' +
                '</div>';
        });
    }
    var asignadasLista = tareas.filter(function (t) {
        if (t.estado === "Realizado") return false;
        if (!Q) return true;
        var hay = [t.equipo, t.zona, t.marca, t.tecnico, t.ayudante].filter(Boolean).join(" ").toLowerCase();
        return hay.indexOf(Q) !== -1;
    });
    if (asignadasLista.length) {
        html += '<div style="margin-top:8px;"><div class="module-title" style="font-size:.95rem;">Asignaciones pendientes de esta semana</div>';
        html += asignadasLista.map(function (t) {
            return '<div style="border:1px solid #e0e0e0;border-radius:10px;padding:10px;margin-bottom:8px;">' +
                '<b>' + escaparHTML(t.equipo) + '</b><br>' +
                '<span style="color:#888;font-size:.8rem;">Zona: ' + escaparHTML(t.zona) + ' | Principal: <b>' + escaparHTML(t.tecnico) + '</b>' +
                (t.ayudante ? ' | Apoyo: ' + escaparHTML(t.ayudante) : '') +
                (t.fechaAsignacion ? ' | Asignado: ' + escaparHTML(formatearFechaHora(t.fechaAsignacion, t.horaAsignacion || '')) : '') + '</span></div>';
        }).join("");
        html += '</div>';
    }
    cont.innerHTML = html;
}

function asignarPreventivoSemanal(semana, semLabel, equipo, zona, marca) {
    var i = String(equipo).replace(/[^a-zA-Z0-9]/g, "_");
    var selT = document.getElementById("prevTec_" + i);
    var selA = document.getElementById("prevAyu_" + i);
    var tecnico = selT ? selT.value : "";
    var ayudante = selA ? selA.value : "";
    if (!tecnico) { alert("Selecciona el tecnico principal."); return; }
    if (tecnico === ayudante) { alert("El apoyo debe ser distinto del tecnico principal."); return; }
    postJSON({ tipo: "asignar_preventivo", semana: semana, semanaLabel: semLabel, equipo: equipo, zona: zona, marca: marca, tecnico: tecnico, ayudante: ayudante })
        .then(function () { borrarCacheV("tareas_semanales"); renderPreventivosSemanal(); })
        .catch(function () { alert("Sin conexion. No se pudo asignar."); });
}

function pintarEquiposParaProgramar() {
    var cont = document.getElementById("prevProgramarLista");
    if (!cont) return;
    if (!cont.getAttribute("data-filas")) {
        var filasInit = [];
        for (var sede in ZONA_EQUIPOS) {
            if (!ZONA_EQUIPOS.hasOwnProperty(sede)) continue;
            var zonas = ZONA_EQUIPOS[sede];
            for (var zona in zonas) {
                if (!zonas.hasOwnProperty(zona)) continue;
                if (zona.toUpperCase().indexOf("SEMANERO") === 0) continue;
                var equipos = zonas[zona];
                if (!equipos || equipos.length === 0) continue;
                equipos.forEach(function (eq) { filasInit.push({ sede: sede, zona: zona, equipo: eq }); });
            }
        }
        cont.setAttribute("data-filas", JSON.stringify(filasInit));
    }
    var filas = JSON.parse(cont.getAttribute("data-filas") || "[]");
    if (filas.length === 0) { cont.innerHTML = '<div class="lista-vacia">No hay equipos disponibles para programar.</div>'; return; }
    if (!(preventivosCache && preventivosCache.length) && !cont.getAttribute("data-cargando")) {
        cont.setAttribute("data-cargando", "1");
        fetchJSON("preventivos", {}, { cacheMs: 15000 }).then(function (d) {
            preventivosCache = d || [];
            cont.removeAttribute("data-cargando");
            if (document.getElementById("prevProgramarLista") === cont) pintarEquiposParaProgramar();
        }).catch(function () {
            cont.removeAttribute("data-cargando");
        });
    }
    var guard = {};
    filas.forEach(function (f, i) {
        var c = document.getElementById("prevSel_" + i);
        if (c && c.tagName === "INPUT") {
            var dEl = document.getElementById("prevFecha_" + i);
            var frEl = document.getElementById("prevFrec_" + i);
            guard[i] = { chk: c.checked, d: dEl ? dEl.value : "", fr: frEl ? frEl.value : "" };
        }
    });
    var filtro = ((document.getElementById("prevBuscarNombre") || {}).value || "").trim().toLowerCase();
    var visibles = [];
    filas.forEach(function (f, i) {
        if (!filtro || String(f.equipo).toLowerCase().indexOf(filtro) !== -1) visibles.push(i);
    });
    var html = '<div style="font-size:.8rem;color:#888;margin-bottom:6px;">' + visibles.length + ' de ' + filas.length + ' equipos.</div>' +
        '<div style="max-height:320px;overflow-y:auto;border:1px solid #e0e0e0;border-radius:8px;padding:6px;">';
    visibles.forEach(function (orig) {
        var f = filas[orig];
        var i = orig;
        var fechaPrev = "";
        (preventivosCache || []).some(function (p) {
            if (String(p.equipo || "") !== String(f.equipo)) return false;
            fechaPrev = p.fecha || "";
            return true;
        });
        var g = guard[i] || {};
        var sinMarcar = cont.getAttribute("data-sinmarcar") === "1";
        var t = g.chk === undefined ? (sinMarcar ? "" : " checked") : (g.chk ? " checked" : "");
        var d = g.d || fechaPrev || hoyYMD();
        var frv = g.fr || "Semanal";
        html += '<div style="display:flex;align-items:center;gap:8px;padding:6px 4px;border-bottom:1px solid #f0f0f0;flex-wrap:wrap;">' +
            '<input type="checkbox" id="prevSel_' + i + '"' + t + ' onclick="actualizarBotonSeleccionTodos()">' +
            '<label for="prevSel_' + i + '" style="flex:1;font-size:.85rem;"><b>' + escaparHTML(f.equipo) + '</b> <span style="color:#888;">(' + escaparHTML(f.sede) + ' / ' + escaparHTML(f.zona) + ')</span></label>' +
            '<input type="date" id="prevFecha_' + i + '" value="' + d + '" title="Fecha del ultimo mantenimiento (inicio del conteo)" style="padding:6px;border:1px solid #ccc;border-radius:6px;max-width:150px;">' +
            '<select id="prevFrec_' + i + '" style="padding:6px;border:1px solid #ccc;border-radius:6px;">' +
            ["Semanal", "Quincenal", "Mensual", "Trimestral", "Semestral", "Anual"].map(function (fr) {
                return '<option' + (fr === frv ? " selected" : "") + '>' + fr + '</option>';
            }).join("") + '</select>' +
            '</div>';
    });
    html += '</div>';
    cont.innerHTML = html;
    actualizarBotonSeleccionTodos();
}

function actualizarBotonSeleccionTodos() {
    var btn = document.getElementById("prevToggleSelBtn");
    if (!btn) return;
    var checks = document.querySelectorAll("input[id^='prevSel_']");
    var todos = checks.length > 0 && Array.prototype.every.call(checks, function (c) { return c.checked; });
    btn.textContent = todos ? "Quitar seleccion" : "Seleccionar todos";
}

function toggleSeleccionEquipos() {
    var checks = document.querySelectorAll("input[id^='prevSel_']");
    if (checks.length === 0) return;
    var todos = Array.prototype.every.call(checks, function (c) { return c.checked; });
    Array.prototype.forEach.call(checks, function (c) { c.checked = !todos; });
    actualizarBotonSeleccionTodos();
}

function borrarPreventivosProgramados() {
    if (!confirm("¿Borrar TODOS los equipos programados?\n\nSe eliminaran todos los preventivos de la hoja para reprogramarlos desde cero. Esta accion no se puede deshacer.")) {
        return;
    }
    postJSON({ tipo: "borrar_preventivos" })
        .then(function () {
            preventivosCache = [];
            borrarCacheV("preventivos");
            var lista = document.getElementById("prevProgramarLista");
            if (lista) {
                lista.removeAttribute("data-filas");
                lista.removeAttribute("data-cargando");
                lista.setAttribute("data-sinmarcar", "1");
            }
            pintarEquiposParaProgramar();
            var msg = document.getElementById("prevProgramarMsg");
            if (msg) msg.innerHTML = '<span style="color:#2e7d32;font-weight:600;">Se borraron todos los equipos programados. La lista quedo reiniciada: ya puedes reprogramar desde cero.</span>';
        })
        .catch(function () {
            alert("Sin conexion. No se pudieron borrar los preventivos.");
        });
}

function programarPreventivosSeleccionados() {
    var cont = document.getElementById("prevProgramarLista");
    if (!cont) return;
    var filas = JSON.parse(cont.getAttribute("data-filas") || "[]");
    if (filas.length === 0) { alert("Primero carga la lista de equipos."); return; }
    var items = [];
    var anySelected = false;
    filas.forEach(function (f, i) {
        var sel = document.getElementById("prevSel_" + i);
        if (!sel || !sel.checked) return;
        anySelected = true;
        var fr = document.getElementById("prevFrec_" + i).value;
        var fEl = document.getElementById("prevFecha_" + i);
        var fch = fEl ? fEl.value : "";
        if (!fch) fch = hoyYMD();
        items.push({ equipo: f.equipo, zona: f.sede + " / " + f.zona, tipo: "INTERNO", frecuencia: fr, actividad: "PREVENTIVO", fecha: fch });
    });
    if (!anySelected) { alert("Marca al menos un equipo."); return; }
    var msgEl = document.getElementById("prevProgramarMsg");
    if (msgEl) msgEl.innerHTML = '<div style="color:#666;">Programando ' + items.length + ' preventivos... El conteo de los proximos mantenimientos parte de la fecha del ultimo mantenimiento indicada y cada uno tiene limite de resolucion de 7 dias.</div>';
    postJSON({ tipo: "programar_preventivos", items: items })
        .then(function () {
            preventivosCache = [];
            borrarCacheV("preventivos");
            if (msgEl) msgEl.innerHTML = '<div style="color:#2e7d32;font-weight:600;">' + items.length + ' preventivos programados (o actualizados si ya estaban registrados). Revisa las pestanas "Programados" y "Semanal".</div>';
            if (cont) {
                cont.innerHTML = "";
                cont.removeAttribute("data-filas");
            }
        })
        .catch(function () {
            if (msgEl) msgEl.innerHTML = '<div style="color:#d32f2f;font-weight:600;">Sin conexion. No se pudo programar.</div>';
        });
}

function llenarZonaNuevoEquipo() {
    var sede = document.getElementById("nuevoEqSede").value;
    var zonaSel = document.getElementById("nuevoEqZona");
    if (!zonaSel) return;
    zonaSel.innerHTML = '<option value="">Zona...</option>';
    if (!sede || !ZONA_EQUIPOS[sede]) return;
    Object.keys(ZONA_EQUIPOS[sede]).forEach(function (z) {
        zonaSel.innerHTML += '<option value="' + escaparHTML(z) + '">' + escaparHTML(z) + '</option>';
    });
}

function cargarRutinaPlantilla() {
    var sel = document.getElementById("prevRutinaPlantilla");
    var ta = document.getElementById("prevRutinaPasos");
    if (!sel || !ta || !sel.value) return;
    var pasos = RUTINA_PREVENTIVO[sel.value] || [];
    ta.value = pasos.map(function (s) {
        return (typeof s === "object" && s !== null) ? (s.label || "") : String(s);
    }).join("\n");
}

function guardarNuevoEquipoPreventivo() {
    if (!usuarioActual) return;
    var sede = document.getElementById("nuevoEqSede").value;
    var zona = document.getElementById("nuevoEqZona").value;
    var marca = document.getElementById("nuevoEqMarca").value.trim();
    var nombre = document.getElementById("nuevoEqNombre").value.trim();
    var frec = document.getElementById("nuevoEqFrecuencia").value.trim();
    var fecha = document.getElementById("nuevoEqFecha").value || hoyYMD();
    var ta = document.getElementById("prevRutinaPasos");
    var pasos = (ta.value || "").split("\n").map(function (s) { return s.trim(); }).filter(function (s) { return s.length > 0; });
    if (!sede || !zona) { alert("Selecciona la sede y la zona del equipo."); return; }
    if (!nombre) { alert("Indica el nombre del equipo."); return; }
    if (!marca) { alert("Indica la marca del equipo."); return; }
    if (pasos.length === 0) { alert("Escribe al menos un paso en la rutina del equipo."); return; }
    var msgEl = document.getElementById("prevNuevoMsg");
    if (!msgEl) return;
    msgEl.innerHTML = '<div style="color:#666;">Guardando equipo, rutina y programacion...</div>';
    Promise.all([
        postJSON({ tipo: "nuevo_equipo", equipo: nombre, sede: sede, zona: zona }),
        postJSON({ tipo: "guardar_preventivo", equipo: nombre, marca: marca, zona: sede + " / " + zona, tipo: "INTERNO", frecuencia: frec, actividad: "PREVENTIVO", estado: "PR", fecha: fecha }),
        postJSON({ tipo: "rutina", equipo: nombre, pasos: pasos, creadoPor: usuarioActual.nombre || "" })
    ]).then(function () {
        preventivosCache = [];
        borrarCacheV("preventivos");
        msgEl.innerHTML = '<div style="color:#2e7d32;font-weight:600;">Equipo registrado. Rutina guardada y preventivo programado desde ' + fecha + ' (limite de 7 dias).</div>';
        ["nuevoEqSede", "nuevoEqZona", "nuevoEqMarca", "nuevoEqNombre", "prevRutinaPasos", "prevRutinaPlantilla"].forEach(function (id) {
            var el = document.getElementById(id);
            if (el) el.value = "";
        });
    }).catch(function () {
        msgEl.innerHTML = '<div style="color:#d32f2f;font-weight:600;">Sin conexion. No se pudo guardar.</div>';
    });
}

function cambiarEstadoPreventivo(fila, estado) {
    postJSON({ tipo: "actualizar_estado_preventivo", fila: fila, estado: estado })
        .then(function () { borrarCacheV("preventivos"); alert("Estado actualizado a " + estado + "."); renderPreventivos(); })
        .catch(function () { alert("Sin conexion. No se pudo actualizar."); });
}

function renderEmpleados() {
    setSubVolver(null);
    var cont = document.getElementById("empleadosContent");
    if (!cont) return;
    if (!usuarioActual || !esRolAdmin(usuarioActual.rol)) {
        cont.innerHTML = '<div class="lista-vacia">Solo el administrador puede ver este modulo.</div>';
        return;
    }
    cont.innerHTML = '<div class="lista-vacia">Cargando personal...</div>';
    fetchJSON("personal", {})
        .then(function (data) {
            pintarEmpleados(cont, data || []);
        })
        .catch(function () {
            if (cont) cont.innerHTML = '<div class="lista-vacia">Sin conexion. No se pudo cargar el personal.</div>';
        });
}

function pintarEmpleados(cont, lista) {
    if (!lista || lista.length === 0) {
        cont.innerHTML = '<div class="lista-vacia">No hay personal registrado.</div>';
        return;
    }
    var items = lista.slice().sort(function (x, y) {
        return String(x.nombre).localeCompare(String(y.nombre));
    });
    var html =
        '<input id="empleadoBuscar" type="text" placeholder="Buscar por nombre..." ' +
        'style="width:100%;box-sizing:border-box;padding:10px;border:1px solid #ccc;border-radius:8px;margin-bottom:14px;" oninput="filtrarEmpleados(this.value)">' +
        '<div id="empleadoLista">';
    items.forEach(function (p) {
        var t = String(p.tipo || "Personal");
        var chip = t === "Tecnico" ? ' style="background:#e3f2fd;color:#1976d2;"' :
            (t === "Gerente" ? ' style="background:#fff3e0;color:#e65100;"' : ' style="background:#e8f5e9;color:#2e7d32;"');
        html += '<div class="dash-card empleado-item" data-busqueda="' + escaparHTML(p.nombre).toLowerCase() + '" style="cursor:pointer;">' +
            '<div style="flex:1;"><b>' + escaparHTML(p.nombre) + '</b> <span class="badge-frecuencia" ' + chip + '>' + escaparHTML(t) + '</span></div>' +
            '<button type="button" class="btn-secondary" style="font-size:.8rem;padding:6px 10px;" onclick="verReportesEmpleado(\'' + String(p.nombre).replace(/'/g, "&#39;") + '\')">Ver reportes</button></div>';
    });
    html += '</div>';
    cont.innerHTML = html;
}

function filtrarEmpleados(q) {
    q = String(q || "").trim().toLowerCase();
    var items = document.querySelectorAll(".empleado-item");
    items.forEach(function (el) {
        el.style.display = el.getAttribute("data-busqueda").indexOf(q) === -1 ? "none" : "flex";
    });
}

function verReportesEmpleado(nombre) {
    var cont = document.getElementById("empleadosContent");
    if (!cont) return;
    empleadoReporteActual = nombre;
    setSubVolver("Volver a Empleados", renderEmpleados);
    cont.innerHTML = '<div class="module-title" style="font-size:1rem;">Reportes de ' + escaparHTML(nombre) + '</div>' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px;">' +
        '<input type="date" id="repEmpDesde" style="padding:8px;border:1px solid #ccc;border-radius:8px;">' +
        '<input type="date" id="repEmpHasta" style="padding:8px;border:1px solid #ccc;border-radius:8px;">' +
        '<select id="repEmpTipo" style="padding:8px;border:1px solid #ccc;border-radius:8px;">' +
        ["todos:Todos", "preventivo:Preventivo", "correctivo:Correctivo", "otro:Otros", "semanario:Semanario/Taller", "cisterna:Cisterna"].map(function (t) {
            var k = t.split(":")[0], l = t.split(":")[1];
            return '<option value="' + k + '">' + l + '</option>';
        }).join("") + '</select>' +
        '<button type="button" class="btn-primary" onclick="cargarReportesEmpleado()">Filtrar</button>' +
        '</div>' +
        '<div id="repEmpLista" class="lista-vacia">Cargando reportes...</div>';
    cargarReportesEmpleado();
}

function cargarReportesEmpleado() {
    var cont = document.getElementById("repEmpLista");
    if (!cont || !empleadoReporteActual) return;
    var desde = document.getElementById("repEmpDesde").value || "";
    var hasta = document.getElementById("repEmpHasta").value || "";
    var tipo = document.getElementById("repEmpTipo").value;
    cont.innerHTML = '<div class="lista-vacia">Cargando reportes...</div>';
    fetchJSON("reportes_empleado", { nombre: empleadoReporteActual, fechaDesde: desde, fechaHasta: hasta, tipo: tipo })
        .then(function (data) {
            pintarReportesEmpleado((data && data.reportes) || [], desde, hasta);
        })
        .catch(function () {
            cont.innerHTML = '<div class="lista-vacia">Sin conexion. No se pudieron cargar los reportes.</div>';
        });
}

function pintarReportesEmpleado(reportes) {
    var cont = document.getElementById("repEmpLista");
    if (!cont) return;
    if (!reportes || reportes.length === 0) {
        cont.innerHTML = '<div class="lista-vacia">No hay reportes con esos filtros.</div>';
        return;
    }
    var html = "";
    reportes.forEach(function (r) {
        var tipoFecha = r.tipoReporte || "";
        html += '<div class="dash-card dash-card-trabajo">' +
            '<div style="flex:1;"><b>' + escaparHTML(r.actividad || "") + '</b>' +
            '<div style="color:#888;font-size:.8rem;">' + escaparHTML(formatearFechaHora(r.fecha || "", r.hora || "")) + ' | ' + escaparHTML(r.sede || "") + (r.zona ? ' / ' + escaparHTML(r.zona) : '') + (r.equipo ? ' | Equipo: ' + escaparHTML(r.equipo) : '') + '</div>' +
            (r.descripcion ? '<div style="color:#555;font-size:.8rem;margin-top:2px;">' + escaparHTML(r.descripcion) + '</div>' : '') +
            (r.ayudante ? '<div style="color:#888;font-size:.78rem;margin-top:2px;">Apoyo: ' + escaparHTML(r.ayudante) + '</div>' : '') + '</div>' +
            '<span class="badge-frecuencia' + (/preventivo/i.test(tipoFecha) ? " badge-frecuencia-semanal" : "") + '">' + escaparHTML(tipoFecha || "") + '</span></div>';
    });
    cont.innerHTML = html;
}

function actualizarLabelFotos() {
    var label = document.getElementById("aFotosLabel");
    if (!label) return;
    label.textContent = "Fotos (maximo 2) - Obligatoria";
    label.style.color = "#d32f2f";
    label.style.fontWeight = "700";
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
        btnMini.textContent = "^";
        btnMini.title = "Volver arriba";
        btnMini.setAttribute("data-dir", "up");
    } else {
        btnMini.textContent = "v";
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

// ===== ALARMAS (notificaciones de la app) =====
var notiAudioCtx = null;
var notiVistos = {};
var notiToastTimer = null;
var notiIntervalo = null;
var notiTituloOriginal = "";
var notiPermisoPedido = false;

var REFRESCO_VIVO_MS = 15000;
var refrescoVivoInt = null;

function iniciarRefrescoVivo() {
    if (refrescoVivoInt) return;
    refrescoVivoInt = window.setInterval(refrescoVivoTick, REFRESCO_VIVO_MS);
}

function detenerRefrescoVivo() {
    if (refrescoVivoInt) {
        window.clearInterval(refrescoVivoInt);
        refrescoVivoInt = null;
    }
}

function hayModalAbierto() {
    var ids = ["detalleTareaModal", "resumenModal"];
    for (var i = 0; i < ids.length; i++) {
        var el = document.getElementById(ids[i]);
        if (el && el.style.display && el.style.display !== "none" && el.style.display !== "") return true;
    }
    return false;
}

function refrescoVivoTick() {
    if (!usuarioActual || !moduloActivo) return;
    var ae = document.activeElement;
    if (ae && (ae.tagName === "INPUT" || ae.tagName === "TEXTAREA" || ae.tagName === "SELECT")) return;
    if (hayModalAbierto()) return;
    var m = moduloActivo;
    if (m === "inicio") {
        borrarCacheV("averias");
        borrarCacheV("dashboard");
        borrarCacheV("tareas_semanales");
        renderInicio();
    } else if (m === "solicitudes") {
        refrescarSolicitudesVivo();
    } else if (m === "ordenes") {
        refrescarOrdenesVivo();
    } else if (m === "preventivos") {
        refrescarPreventivosVivo();
    } else if (m === "empleados") {
        borrarCacheV("personal");
        renderEmpleados();
    } else if (m === "historial") {
        refrescarHistorialVivo();
    } else if (m === "mantenimiento") {
        refrescarMantVivo();
    } else if (m === "averias") {
        refrescarAveriasVivo();
    } else if (m === "repuestos") {
        refrescarRepuestosVivo();
    }
}

function refrescarSolicitudesVivo() {
    var sub = solSubActual || "generales";
    var idLista = sub === "repuestos" ? "solicitudesRepuestosLista" : "solicitudesGeneralesLista";
    var listaEl = document.getElementById(idLista);
    if (!listaEl || listaEl.offsetParent === null) return;
    borrarCacheV("solicitudes");
    fetchJSON("solicitudes", { nombre: usuarioActual.nombre, rol: usuarioActual.rol })
        .then(function (data) {
            if (solSubActual === "repuestos") {
                solRepData = (data && data.repuestos) || [];
                pintarSolRepLista(esRolAdmin(usuarioActual.rol));
            } else {
                solGenData = (data && data.generales) || [];
                pintarSolGenLista(esRolAdmin(usuarioActual.rol));
            }
        })
        .catch(function () {});
}

function refrescarMantVivo() {
    var sub = document.getElementById("mantSubContent");
    if (!sub || sub.offsetParent === null) return;
    if (sub.dataset.mantSub === "preventivos") {
        var lst = document.getElementById("prevTecListaSub");
        if (!lst || lst.offsetParent === null || prevAsignadoActivo) return;
        borrarCacheV("tareas_semanales");
        fetchJSON("tareas_semanales", { nombre: tecnicoNombre }, { cacheMs: 15000 })
            .then(function (res) {
                prevTecTareas = (res && res.tareas) || [];
                if (!prevAsignadoActivo) pintarMisPreventivosSub();
            })
            .catch(function () {});
        return;
    }
    if (sub.dataset.mantSub === "ordenes") {
        var lista = document.getElementById("oEstadoLista");
        if (!lista || lista.offsetParent === null) return;
        borrarCacheV("ordenes_trabajo");
        fetchJSON("ordenes_trabajo", {})
            .then(function (d) {
                ordenesCache = (d && d.ordenes) || [];
                pintarOrdenesEstado(ordenesCache);
            })
            .catch(function () {});
    }
}

function refrescarOrdenesVivo() {
    var lista = document.getElementById("oEstadoLista");
    if (!lista || lista.offsetParent === null) return;
    borrarCacheV("ordenes_trabajo");
    fetchJSON("ordenes_trabajo", {})
        .then(function (d) {
            ordenesCache = (d && d.ordenes) || [];
            pintarOrdenesEstado(ordenesCache);
        })
        .catch(function () {});
}

function refrescarPreventivosVivo() {
    if (!usuarioActual) return;
    if (!esRolAdmin(usuarioActual.rol)) {
        if (prevAsignadoActivo) return;
        borrarCacheV("tareas_semanales");
        renderPreventivosTecnico();
        return;
    }
    var sub = prevSubActual;
    if (sub === "programar") return;
    if (sub === "programados") {
        borrarCacheV("preventivos");
        pintarCalendarioPreventivos();
    } else if (sub === "semanal") {
        borrarCacheV("preventivos");
        borrarCacheV("tareas_semanales");
        renderPreventivosSemanal();
    } else if (sub === "historial") {
        borrarCacheV("preventivos");
        renderPreventivosHistorial();
    }
}

function refrescarHistorialVivo() {
    var lista = document.getElementById("historialTabla");
    if (!lista || lista.offsetParent === null) return;
    borrarCacheV("averias");
    refrescarAverias(true)
        .then(function () { pintarHistorial(); })
        .catch(function () {});
}

function refrescarAveriasVivo() {
    var fA = document.getElementById("averiaForm");
    if (fA && fA.style.display === "block") return;
    borrarCacheV("averias");
    refrescarAverias(true).then(function (arr) {
        aEstadoDataCache = arr;
        var hayEstado = document.getElementById("aEstadoContent");
        var hayAsig = document.getElementById("aAsigContent");
        if (hayEstado && hayEstado.offsetParent !== null) {
            if (aEstadoCat === "inicio") aEstadoCat = "pendientes";
            pintarEstadoAverias(aEstadoDataCache);
        } else if (hayAsig && hayAsig.offsetParent !== null) {
            var cont = document.getElementById("aAsigContent");
            fetchJSON("personal", {}, { cacheMs: 120000 }).then(function (per) {
                var techs = (per || []).filter(function (p) { return String(p.tipo).toUpperCase() === "TECNICO"; }).map(function (p) { return p.nombre; });
                var arr = (averiasDisponibles || []).filter(function (a) { return !a.resuelto; });
                aAsigDatos = { averias: arr, tecnicos: techs };
                pintarAsignarAverias(cont, arr, techs);
            }).catch(function () {});
        }
    }).catch(function () {});
}

function refrescarRepuestosVivo() {
    var sub = repSubActual;
    if (!sub) return;
    if (sub === "solicitudes") {
        borrarCacheV("solicitudes");
        cargarMisSolicitudes();
    } else if (sub === "inventario" || sub === "lista") {
        borrarCacheV("inventario");
        cargarInventario();
    } else if (sub === "utilizados") {
        borrarCacheV("repuestos_utilizados");
        cargarUtilizados();
    }
}

function notiIniciar() {
    notiCrearUI();
    notiTituloOriginal = document.title || "Mantenimiento Preventivo";
    window.addEventListener("pointerdown", function unaVez() {
        try {
            var AC = window.AudioContext || window.webkitAudioContext;
            if (AC && !notiAudioCtx) notiAudioCtx = new AC();
        } catch (e) {}
        if (!notiPermisoPedido && typeof Notification !== "undefined" && Notification.permission === "default") {
            notiPermisoPedido = true;
            try { Notification.requestPermission(); } catch (e2) {}
        }
        window.removeEventListener("pointerdown", unaVez);
    }, { capture: true });
    notiRefrescar(false);
    if (notiIntervalo) window.clearInterval(notiIntervalo);
    notiIntervalo = window.setInterval(function () { notiRefrescar(true); }, 20000);
}

function notiDetener() {
    if (notiIntervalo) {
        window.clearInterval(notiIntervalo);
        notiIntervalo = null;
    }
    var fab = document.getElementById("notiFab");
    if (fab) fab.style.display = "none";
    var panel = document.getElementById("notiPanel");
    if (panel) panel.style.display = "none";
    var toast = document.getElementById("notiToast");
    if (toast) toast.style.display = "none";
}

function notiCrearUI() {
    if (document.getElementById("notiFab")) return;
    var fab = document.createElement("div");
    fab.id = "notiFab";
    fab.style.cssText = "position:fixed;right:16px;bottom:16px;z-index:9998;width:54px;height:54px;border-radius:50%;background:#2e7d32;color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 3px 12px rgba(0,0,0,.35);font-size:24px;";
    fab.innerHTML = "🔔";
    var badge = document.createElement("span");
    badge.id = "notiBadge";
    badge.style.cssText = "position:absolute;top:-4px;right:-4px;background:#d32f2f;color:#fff;border-radius:50%;min-width:22px;height:22px;font-size:12px;font-weight:700;display:none;align-items:center;justify-content:center;padding:0 5px;box-shadow:0 1px 3px rgba(0,0,0,.3);";
    fab.appendChild(badge);
    fab.addEventListener("click", notiTogglePanel);
    document.body.appendChild(fab);

    var panel = document.createElement("div");
    panel.id = "notiPanel";
    panel.style.cssText = "position:fixed;right:16px;bottom:80px;z-index:9998;width:min(340px, calc(100vw - 32px));max-height:430px;display:none;flex-direction:column;background:#fff;border:1px solid #ddd;border-radius:12px;box-shadow:0 6px 22px rgba(0,0,0,.28);overflow:hidden;";
    panel.innerHTML =
        '<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 12px;background:#2e7d32;color:#fff;font-weight:700;font-size:.9rem;">Alarmas' +
        '<button type="button" onclick="notiMarcarTodas()" style="background:transparent;border:1px solid #fff;color:#fff;border-radius:16px;padding:4px 10px;font-size:.75rem;cursor:pointer;">Marcar leidas</button></div>' +
        '<div id="notiLista" style="overflow-y:auto;flex:1;padding:8px;font-size:.82rem;"></div>';
    document.body.appendChild(panel);

    var toast = document.createElement("div");
    toast.id = "notiToast";
    toast.style.cssText = "position:fixed;top:70px;right:16px;z-index:9998;display:none;max-width:min(320px, calc(100vw - 32px));background:#fff;border-left:4px solid #d32f2f;border-radius:10px;box-shadow:0 6px 20px rgba(0,0,0,.25);padding:10px 12px;font-size:.85rem;color:#333;";
    document.body.appendChild(toast);
}

function notiRefrescar(conAlarma) {
    if (!usuarioActual) return;
    fetchJSON("notificaciones", { nombre: usuarioActual.nombre, rol: usuarioActual.rol }, { refresh: true })
        .then(function (d) {
            var items = (d && d.items) || [];
            var noLeidas = [];
            var nuevas = [];
            items.forEach(function (n) {
                if (!String(n.mensaje || "").trim()) return;
                if (!n.leida) {
                    noLeidas.push(n);
                    if (!notiVistos[n.row]) nuevas.push(n);
                }
                notiVistos[n.row] = true;
            });
            notiActualizarBadge(noLeidas.length);
            notiActualizarTitulo(noLeidas.length);
            if (conAlarma && nuevas.length > 0) {
                notiSonar();
                notiMostrarToast(nuevas[0]);
                notiNotificacionSistema(nuevas[0]);
            }
            if (notiPanelAbierto) notiPintarLista(noLeidas);
        })
        .catch(function () {});
}

var notiPanelAbierto = false;

function notiActualizarBadge(total) {
    var badge = document.getElementById("notiBadge");
    if (!badge) return;
    if (total > 0) {
        badge.style.display = "flex";
        badge.textContent = total > 99 ? "99+" : String(total);
    } else {
        badge.style.display = "none";
        badge.textContent = "";
    }
}

function notiActualizarTitulo(total) {
    var base = notiTituloOriginal || "Mantenimiento Preventivo";
    document.title = total > 0 ? ("🔔 " + (total > 99 ? "99+" : String(total)) + " | " + base) : base;
}

function notiNotificacionSistema(n) {
    try {
        if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
        var notif = new Notification("Alarma de mantenimiento", {
            body: String(n.tipo || "") + ": " + String(n.mensaje || ""),
            tag: "alarma-mant-" + String(n.row || "")
        });
        notif.onclick = function () {
            try { window.focus(); this.close(); } catch (e) {}
        };
    } catch (e) {}
}

function notiPintarLista(items) {
    var lista = document.getElementById("notiLista");
    if (!lista) return;
    if (!items || items.length === 0) {
        lista.innerHTML = '<div style="padding:14px;color:#888;text-align:center;">No hay alarmas pendientes.</div>';
        return;
    }
    var html = "";
    items.forEach(function (n) {
        html += '<div style="padding:8px;border-bottom:1px solid #f0f0f0;">' +
            '<div style="font-weight:700;color:#2e7d32;">' + escaparHTML(n.tipo) + '</div>' +
            '<div style="color:#333;">' + escaparHTML(n.mensaje) + '</div>' +
            '<div style="color:#999;font-size:.72rem;margin-top:3px;">' + escaparHTML(formatearFechaHora(n.fecha, n.hora)) + '</div>' +
            '</div>';
    });
    lista.innerHTML = html;
}

function notiTogglePanel() {
    var panel = document.getElementById("notiPanel");
    if (!panel) return;
    if (panel.style.display === "flex") {
        panel.style.display = "none";
        notiPanelAbierto = false;
        return;
    }
    panel.style.display = "flex";
    notiPanelAbierto = true;
    notiRefrescar(false);
}

function notiCerrarPanel() {
    var panel = document.getElementById("notiPanel");
    if (panel) panel.style.display = "none";
    notiPanelAbierto = false;
}

function notiMarcarTodas() {
    postJSON({ tipo: "marcar_notificaciones" })
        .then(function () {
            notiVistos = {};
            notiRefrescar(false);
            notiActualizarTitulo(0);
        })
        .catch(function () { alert("Sin conexion. No se pudieron marcar las alarmas."); });
}

function notiMostrarToast(n) {
    var toast = document.getElementById("notiToast");
    if (!toast) return;
    toast.innerHTML =
        '<div style="display:flex;justify-content:space-between;align-items:center;"><b style="color:#d32f2f;">' + escaparHTML(n.tipo) + '</b>' +
        '<button type="button" onclick="notiCerrarToast()" style="background:none;border:none;font-size:16px;cursor:pointer;color:#888;">&times;</button></div>' +
        '<div style="margin-top:2px;">' + escaparHTML(n.mensaje) + '</div>';
    toast.style.display = "block";
    if (notiToastTimer) window.clearTimeout(notiToastTimer);
    notiToastTimer = window.setTimeout(notiCerrarToast, 8000);
}

function notiCerrarToast() {
    var toast = document.getElementById("notiToast");
    if (toast) toast.style.display = "none";
    if (notiToastTimer) window.clearTimeout(notiToastTimer);
}

function notiSonar() {
    try {
        if (!notiAudioCtx) return;
        if (notiAudioCtx.state === "suspended") notiAudioCtx.resume();
        var t = notiAudioCtx.currentTime + 0.02;
        [880, 1174].forEach(function (frec, i) {
            var o = notiAudioCtx.createOscillator();
            var g = notiAudioCtx.createGain();
            o.type = "sine";
            o.frequency.value = frec;
            var inicio = t + i * 0.45;
            g.gain.setValueAtTime(0.0001, inicio);
            g.gain.exponentialRampToValueAtTime(0.5, inicio + 0.03);
            g.gain.exponentialRampToValueAtTime(0.0001, inicio + 0.4);
            o.connect(g);
            g.connect(notiAudioCtx.destination);
            o.start(inicio);
            o.stop(inicio + 0.42);
        });
    } catch (e) {}
}

console.log("[APP] v2026-09-21f sin-fecha-hora (sistema) + OT sin falsa orden");
