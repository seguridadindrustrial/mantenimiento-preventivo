// ordenes.js - Modulo Orden de trabajo (Admin) y sub-modulos de Mantenimiento (tecnicos)

var ESPECIALIDADES = ["Plomeria", "Electricidad", "Carpinteria", "Aire acondicionado", "Soldadura", "Pintura", "Cerrajeria", "Obras civiles", "Limpieza", "Otro"];
var OT_ESTADOS = [
    { id: "pendientes", label: "Pendientes", color: "#d32f2f" },
    { id: "realizada", label: "Realizada", color: "#2e7d32" },
    { id: "proceso", label: "En proceso", color: "#f57c00" },
    { id: "norealizada", label: "No realizada", color: "#757575" }
];
var ordenesCache = null;
var ordenesCatActual = "pendientes";
var ordenEnviando = false;
var ordenesSoloMias = false;

function restablecerMantSub() {
    var sub = document.getElementById("mantSubContent");
    var cards = document.getElementById("mantCards");
    if (sub) sub.style.display = "none";
    if (cards) cards.style.display = "";
}

function navtarMantCard(tipo) {
    var rol = usuarioActual ? usuarioActual.rol : "";
    if (rol === NUESTROS_ROLES.TECNICO && (tipo === "PREVENTIVO" || tipo === "OTRO")) {
        empujarModuloHistorial("mantenimiento");
        var cards = document.getElementById("mantCards");
        var sub = document.getElementById("mantSubContent");
        if (typeof pushSubVolver === "function") pushSubVolver("Volver a Mantenimiento", restablecerMantSub);
        if (cards) cards.style.display = "none";
        if (sub) {
            sub.style.display = "block";
            if (tipo === "PREVENTIVO") {
                sub.dataset.mantSub = "preventivos";
                sub.innerHTML = '<div class="lista-vacia">Cargando...</div>';
                renderMisPreventivosSub(sub);
            } else {
                sub.dataset.mantSub = "ordenes";
                renderTecOrdenes(sub);
            }
        }
        return;
    }
    if (tipo === "OTRO") {
        navegar("ordenes");
        return;
    }
    navegarAForm("checkinForm", tipo);
}

function renderTecOrdenes(cont) {
    if (!cont) return;
    ordenesSoloMias = false;
    cont.innerHTML = '<div class="dashboard-cards">' +
        '<button type="button" class="dash-card dash-card-mant" onclick="tecOrdenesSubVista(\'crear\')"><div class="dash-card-icon">⚙️</div><div class="dash-card-label">Crear</div><div style="color:#888;font-size:.75rem;margin-top:4px;text-align:center;">Crea una orden de trabajo</div></button>' +
        '<button type="button" class="dash-card dash-card-mant" onclick="tecOrdenesSubVista(\'estado\')"><div class="dash-card-icon">📊</div><div class="dash-card-label">Estado</div><div style="color:#888;font-size:.75rem;margin-top:4px;text-align:center;">Tus ordenes, pendientes y revisadas</div></button>' +
        '</div>';
}

function renderTecOrdenesSubVistaCards() {
    var cont = document.getElementById("mantSubContent");
    if (!cont) return;
    cont.dataset.mantSub = "ordenes";
    if (typeof setSubVolver === "function") setSubVolver("Volver a Mantenimiento", restablecerMantSub);
    renderTecOrdenes(cont);
}

function tecOrdenesSubVista(sub) {
    var cont = document.getElementById("mantSubContent");
    if (!cont) return;
    cont.dataset.mantSub = "ordenes";
    if (sub === "crear") {
        if (typeof pushSubVolver === "function") pushSubVolver("Volver a Orden de trabajo", renderTecOrdenesSubVistaCards);
        cont.innerHTML = formOrdenHTML(true);
        activarLabels(cont);
        populateSelect("oSedes", SEDES);
        return;
    }
    if (sub === "estado") {
        if (typeof pushSubVolver === "function") pushSubVolver("Volver a Orden de trabajo", renderTecOrdenesSubVistaCards);
        ordenesSoloMias = true;
        cont.innerHTML = '<div id="oEstadoTabs" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px;"></div>' +
            '<input type="text" id="oEstadoBuscar" placeholder="Buscar numero, equipo, sede, especialidad o tecnico..." oninput="pintarOrdenesEstado(ordenesCache)" style="width:100%;box-sizing:border-box;padding:9px;border:1px solid #ccc;border-radius:8px;margin-bottom:8px;">' +
            '<div id="oEstadoLista" class="lista-vacia">Cargando ordenes...</div>';
        pintarOrdenesTabs();
        fetchJSON("ordenes_trabajo", {}, { cacheMs: 10000 })
            .then(function (d) {
                ordenesCache = (d && d.ordenes) || [];
                pintarOrdenesEstado(ordenesCache);
            })
            .catch(function () {
                var l = document.getElementById("oEstadoLista");
                if (l) l.innerHTML = "Sin conexion. No se pudieron cargar las ordenes.";
            });
        return;
    }
    renderTecOrdenesSubVistaCards();
}

function renderMisPreventivosSub(cont) {
    if (!cont) return;
    cont.innerHTML = '<div class="module-title" style="font-size:1rem;">Mis preventivos asignados</div>' +
        '<div style="color:#666;font-size:.82rem;margin-bottom:10px;">El sistema tomara la fecha y hora de asignacion y del reporte para medir el tiempo de realizacion.</div>' +
        '<input type="text" id="prevTecBuscarSub" placeholder="Buscar equipo, zona o tecnico..." oninput="pintarMisPreventivosSub()" style="width:100%;box-sizing:border-box;padding:9px;border:1px solid #ccc;border-radius:8px;margin-bottom:8px;">' +
        '<div id="prevTecListaSub" class="lista-vacia">Cargando tus tareas asignadas...</div>';
    fetchJSON("tareas_semanales", { nombre: tecnicoNombre }, { cacheMs: 15000 })
        .then(function (res) {
            prevTecTareas = (res && res.tareas) || [];
            pintarMisPreventivosSub();
        })
        .catch(function () {
            var list = document.getElementById("prevTecListaSub");
            if (list) list.innerHTML = "Sin conexion. No se pudieron cargar tus tareas.";
        });
}

function pintarMisPreventivosSub() {
    var list = document.getElementById("prevTecListaSub");
    if (!list) return;
    if (typeof prevAsignadoActivo !== "undefined" && prevAsignadoActivo) { list.style.display = "none"; return; }
    list.style.display = "";
    var tareas = prevTecTareas || [];
    if (tareas.length === 0) {
        list.className = "lista-vacia";
        list.innerHTML = "No tienes preventivos asignados esta semana.";
        return;
    }
    list.className = "";
    list.innerHTML = "";
    var q = String((document.getElementById("prevTecBuscarSub") || {}).value || "").trim().toLowerCase();
    var filtradas = q ? tareas.filter(function (t) {
        return (String(t.equipo || "") + " " + String(t.zona || "") + " " + String(t.marca || "") + " " + String(t.tecnico || "") + " " + String(t.ayudante || "")).toLowerCase().indexOf(q) !== -1;
    }) : tareas;
    if (filtradas.length === 0) {
        list.className = "lista-vacia";
        list.innerHTML = q ? "No hay tareas que coincidan con la busqueda." : "No tienes preventivos asignados como tecnico principal esta semana.";
        return;
    }
    filtradas.forEach(function (t) {
        var esPrincipal = t.rol === "principal";
        var apoyo = String(t.ayudante || t.apoyo || "").trim();
        var lineasApoyo = "";
        if (esPrincipal) {
            lineasApoyo = apoyo
                ? '<div style="font-size:0.82rem;color:#2e7d32;margin-top:2px;">Apoyo: <b>' + escaparHTML(apoyo) + '</b></div>'
                : '<div style="font-size:0.82rem;color:#888;margin-top:2px;">Sin apoyo</div>';
        } else {
            lineasApoyo = '<div style="font-size:0.82rem;color:#888;margin-top:4px;">Apoyas a <b>' + escaparHTML(t.tecnico) + '</b>. El reporte del mantenimiento lo hace el tecnico principal.</div>';
        }
        var card = document.createElement("div");
        card.className = "card";
        card.style.cssText = "margin-bottom:10px;padding:12px;border-left:4px solid #2e7d32;";
        card.innerHTML =
            '<div style="font-weight:700;color:#2e7d32;">' + (esPrincipal ? "Preventivo a tu cargo" : "Preventivo (apoyo)") + '</div>' +
            '<div style="font-size:0.9rem;color:#333;margin-top:4px;">Equipo: <b>' + escaparHTML(t.equipo) + '</b></div>' +
            '<div style="font-size:0.82rem;color:#555;">Zona: ' + escaparHTML(t.zona) + (t.marca ? ' | Marca: ' + escaparHTML(t.marca) : '') + '</div>' +
            '<div style="font-size:0.82rem;color:#555;">Semana: ' + escaparHTML(t.semanaLabel || t.semana || "") + '</div>' +
            lineasApoyo +
            (esPrincipal ? '<button type="button" class="btn-primary" style="margin-top:8px;font-size:0.8rem;padding:8px 12px;" onclick="iniciarPreventivoAsignado(\'' + String(t.equipo || "").replace(/'/g, "&#39;") + '\',\'' + escaparHTML(t.zona || "").replace(/'/g, "&#39;") + '\',\'' + escaparHTML(t.marca || "").replace(/'/g, "&#39;") + '\',\'' + escaparHTML(apoyo).replace(/'/g, "&#39;") + '\',\'' + escaparHTML(t.fechaAsignacion || "").replace(/'/g, "&#39;") + '\',\'' + escaparHTML(t.horaAsignacion || "").replace(/'/g, "&#39;") + '\')">Realizar preventivo</button>' : '');
        list.appendChild(card);
    });
}

function renderMisOrdenes(cont) {
    if (!cont) return;
    cont.innerHTML = '<div class="module-title" style="font-size:1rem;">Mis ordenes de trabajo</div>' +
        '<input type="text" id="misOrdenesBuscar" placeholder="Buscar numero, equipo, sede o especialidad..." oninput="pintarMisOrdenes()" style="width:100%;box-sizing:border-box;padding:9px;border:1px solid #ccc;border-radius:8px;margin-bottom:8px;">' +
        '<div id="misOrdenesLista" class="lista-vacia">Cargando tus ordenes...</div>';
    fetchJSON("ordenes_trabajo", {}, { cacheMs: 10000 })
        .then(function (d) {
            ordenesCache = (d && d.ordenes) || [];
            pintarMisOrdenes();
        })
        .catch(function () {
            var list = document.getElementById("misOrdenesLista");
            if (list) list.innerHTML = "Sin conexion. No se pudieron cargar tus ordenes.";
        });
}

function pintarMisOrdenes() {
    var list = document.getElementById("misOrdenesLista");
    if (!list) return;
    var nombreTec = (typeof tecnicoNombre !== "undefined" && tecnicoNombre) ? tecnicoNombre : (usuarioActual ? usuarioActual.nombre : "");
    var q = String((document.getElementById("misOrdenesBuscar") || {}).value || "").trim().toLowerCase();
    var mias = (ordenesCache || []).filter(function (o) {
        if (String(o.tecnico || "").trim() !== nombreTec) return false;
        if (o.estado === "Realizada" || o.estado === "Falsa orden") return false;
        if (!q) return true;
        return (String(o.numero || "") + " " + String(o.equipo || "") + " " + String(o.sede || "") + " " + String(o.especialidad || "")).toLowerCase().indexOf(q) !== -1;
    });
    if (mias.length === 0) {
        list.className = "lista-vacia";
        list.innerHTML = q ? "No hay ordenes que coincidan con la busqueda." : "No tienes ordenes de trabajo pendientes.";
        return;
    }
    list.className = "";
    list.innerHTML = "";
    mias.forEach(function (o) {
        var card = document.createElement("div");
        card.className = "card";
        card.style.cssText = "margin-bottom:10px;padding:12px;border-left:4px solid #f57c00;";
        card.innerHTML =
            '<div style="font-weight:700;color:#f57c00;">' + escaparHTML(o.numero) + ' <span class="badge-frecuencia" style="background:#fff3e0;color:#e65100;">' + escaparHTML(o.especialidad || "General") + '</span></div>' +
            '<div style="font-size:0.85rem;color:#333;margin-top:4px;">Equipo: <b>' + escaparHTML(o.equipo) + '</b></div>' +
            '<div style="font-size:0.82rem;color:#555;">Sede: ' + escaparHTML(o.sede) + (o.zona ? " | Zona: " + escaparHTML(o.zona) : "") + '</div>' +
            '<div style="font-size:0.82rem;color:#555;">Estado: <b>' + escaparHTML(o.estado) + '</b></div>' +
            (o.asignado ? '<div style="font-size:0.78rem;color:#888;margin-top:2px;">Asignado: ' + escaparHTML(o.asignado) + '</div>' : '') +
            (o.descripcion ? '<div style="font-size:0.82rem;color:#777;margin-top:4px;">' + escaparHTML(o.descripcion) + '</div>' : '') +
            '<button type="button" class="btn-primary" style="margin-top:8px;font-size:0.8rem;padding:8px 12px;" onclick="abrirResolucionOrden(\'' + escaparHTML(String(o.numero || "")) + '\')">Resolver orden</button>';
        list.appendChild(card);
    });
}

function abrirResolucionOrden(numero) {
    var ot = null;
    (ordenesCache || []).forEach(function (o) {
        if (String(o.numero) === String(numero)) ot = o;
    });
    if (!ot) {
        alert("No se encontro la orden de trabajo.");
        return;
    }
    if (typeof historialModulos !== "undefined" && usuarioActual) {
        if (historialModulos[historialModulos.length - 1] !== moduloActivo) {
            historialModulos.push(moduloActivo);
            if (historialModulos.length > 20) historialModulos.shift();
        }
    }
    document.getElementById("loginSection").style.display = "none";
    document.getElementById("resolucionForm").style.display = "block";
    document.getElementById("resolucionInfo").textContent =
        "Orden de trabajo " + String(ot.numero || "") + " | Especialidad: " + (ot.especialidad || "General") +
        (ot.sede ? " | Sede: " + ot.sede : "") + (ot.zona ? " | Zona: " + ot.zona : "");
    document.getElementById("resolucionEquipo").textContent = "Equipo: " + (ot.equipo || "No especificado");
    limpiarHora("r");
    clearResolucionForm();
    resolucionActualNumero = String(ot.numero || "");
    resolucionEsOrden = String(ot.numero || "").indexOf("OT-") === 0;
    var botonFalsa = document.getElementById("rFalsa");
    if (botonFalsa) botonFalsa.textContent = "Falsa orden";
    var rPregunta = document.getElementById("rPregunta");
    if (rPregunta) rPregunta.textContent = "¿Se completo el trabajo de la orden?";
    configurarTecnicoResolucion(ot.tecnico || tecnicoNombre || "");
    if (typeof mostrarMiniNav === "function") mostrarMiniNav();
    if (typeof actualizarBotonAtras === "function") actualizarBotonAtras();
}

// ===== MODULO ORDEN DE TRABAJO (Admin): crear + asignar, y estado =====

function renderOrdenes() {
    setSubVolver(null);
    ordenesSoloMias = false;
    var cont = document.getElementById("ordenesContent");
    if (!cont) return;
    var cards = [
        ["crear", "Crear y asignar", "⚙️", "Crea una orden y asignala a un tecnico"],
        ["estado", "Estado", "📊", "Ordenes por estado, pendientes y revisadas"]
    ];
    cont.innerHTML = '<div class="dashboard-cards">' + cards.map(function (c) {
        return '<button type="button" class="dash-card dash-card-mant" onclick="ordenesSubVista(\'' + c[0] + '\')"><div class="dash-card-icon">' + c[2] + '</div><div class="dash-card-label">' + c[1] + '</div><div style="color:#888;font-size:.75rem;margin-top:4px;text-align:center;">' + c[3] + '</div></button>';
    }).join("") + '</div>';
}

function ordenesSubVista(sub) {
    var cont = document.getElementById("ordenesContent");
    if (!cont) return;
    if (sub === "crear") {
        setSubVolver("Volver a Orden de trabajo", renderOrdenes);
        cont.innerHTML = formOrdenHTML();
        activarLabels(cont);
        populateSelect("oSedes", SEDES);
        cargarTecnicosParaOrden();
        return;
    }
    if (sub === "estado") {
        setSubVolver("Volver a Orden de trabajo", renderOrdenes);
        cont.innerHTML = '<div id="oEstadoTabs" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px;"></div>' +
            '<input type="text" id="oEstadoBuscar" placeholder="Buscar numero, equipo, sede, especialidad o tecnico..." oninput="pintarOrdenesEstado(ordenesCache)" style="width:100%;box-sizing:border-box;padding:9px;border:1px solid #ccc;border-radius:8px;margin-bottom:8px;">' +
            '<div id="oEstadoLista" class="lista-vacia">Cargando ordenes...</div>';
        pintarOrdenesTabs();
        if (ordenesCache === null) {
            fetchJSON("ordenes_trabajo", {}, { cacheMs: 10000 })
                .then(function (d) {
                    ordenesCache = (d && d.ordenes) || [];
                    pintarOrdenesEstado(ordenesCache);
                })
                .catch(function () {
                    var l = document.getElementById("oEstadoLista");
                    if (l) l.innerHTML = "Sin conexion. No se pudieron cargar las ordenes.";
                });
        } else {
            pintarOrdenesEstado(ordenesCache);
        }
        return;
    }
    renderOrdenes();
}

function formOrdenHTML(paraTecnico) {
    var html = '<form id="ordenForm" onsubmit="guardarOrden(event)" novalidate>' +
        '<div class="form-group"><label data-for="oSedes">Sede</label><select id="oSedes" onchange="onOrdSedeChange()"><option value="" disabled selected>Seleccionar sede...</option></select></div>' +
        '<div class="form-group" id="oZonaGroup" style="display:none;"><label data-for="oZona">Zona</label><select id="oZona" onchange="onOrdZonaChange()"><option value="" disabled selected>Seleccionar zona...</option></select></div>' +
        '<div class="form-group"><label data-for="oEquipo">Equipo</label><select id="oEquipo" onchange="onOrdEquipoChange()"><option value="" disabled selected>Seleccionar equipo...</option></select></div>' +
        '<div class="form-group" id="oEquipoOtroGroup" style="display:none;"><label data-for="oEquipoOtro">Nombre del equipo</label>' +
        '<input type="text" id="oEquipoOtro" maxlength="80" placeholder="Escribe el nombre del equipo" autocomplete="off">' +
        '<div class="hint">Se usara solo en esta orden. No se agrega a la lista de equipos.</div></div>' +
        '<div class="form-group"><label data-for="oEspecialidad">Especialidad</label><select id="oEspecialidad">' + ESPECIALIDADES.map(function (x) { return '<option value="' + x + '">' + x + '</option>'; }).join("") + '</select></div>' +
        '<div class="form-group"><label data-for="oDescripcion">Descripcion</label><textarea id="oDescripcion" rows="3" placeholder="' + (paraTecnico ? "Describe el trabajo que realizaste..." : "Describe el trabajo a realizar...") + '"></textarea></div>';
    if (paraTecnico) {
        html +=
            '<div class="form-group"><label>Necesitaste apoyo</label>' +
            '<p class="hint">¿Necesitaste apoyo de otro tecnico para realizar esta orden?</p>' +
            '<div class="toggle-group">' +
            '<button type="button" class="toggle-btn" id="otAyudaSi" data-value="Si" onclick="toggleAyudaToggle(this,\'otAyuda\')">Si</button>' +
            '<button type="button" class="toggle-btn" id="otAyudaNo" data-value="No" onclick="toggleAyudaToggle(this,\'otAyuda\')">No</button>' +
            '</div></div>' +
            '<div class="form-group" id="otAyudaGroup" style="display:none;">' +
            '<label data-for="otAyudaCantidad">Cantidad de tecnicos que te ayudaron</label>' +
            '<input type="number" id="otAyudaCantidad" min="1" max="10" placeholder="Ej: 1" oninput="renderAyudaTecnicos(\'otAyuda\')">' +
            '<div id="otAyudaTecnicosRows"></div>' +
            '</div>' +
            '<div class="form-actions"><button type="submit" class="btn-primary" id="btnGuardarOrden">Registrar orden</button></div>';
    } else {
        html +=
            '<div class="form-group"><label data-for="oTecnico">Tecnico asignado</label><select id="oTecnico"><option value="" disabled selected>Cargando tecnicos...</option></select></div>' +
            '<div style="color:#1976d2;font-size:.8rem;margin-bottom:10px;">La fecha y la hora de la orden las registra el sistema automaticamente.</div>' +
            '<div class="form-actions"><button type="submit" class="btn-primary" id="btnGuardarOrden">Crear y asignar</button></div>';
    }
    return html + '</form>';
}

function esOrdenTecnico() {
    var sub = document.getElementById("mantSubContent");
    return !!(sub && sub.offsetParent !== null && sub.dataset.mantSub === "ordenes");
}

function cargarTecnicosParaOrden(defecto) {
    var sel = document.getElementById("oTecnico");
    if (!sel) return;
    sel.innerHTML = '<option value="" disabled selected>Cargando tecnicos...</option>';
    fetchJSON("personal", {}, { cacheMs: 120000 })
        .then(function (personal) {
            var nombres = (personal || []).filter(function (p) { return p.tipo === "Tecnico"; }).map(function (p) { return p.nombre; });
            if (sel) {
                populateSelect("oTecnico", nombres);
                if (defecto && nombres.indexOf(defecto) !== -1) sel.value = defecto;
            }
        })
        .catch(function () {
            if (sel) sel.innerHTML = '<option value="">Error cargando tecnicos</option>';
        });
}

function onOrdSedeChange() {
    var sede = document.getElementById("oSedes").value;
    if (!sede) return;
    var zonas = typeof getAveriaZonas === "function" ? getAveriaZonas(sede) : [];
    var zonaGroup = document.getElementById("oZonaGroup");
    var zSel = document.getElementById("oZona");
    if (zonas.length > 0) {
        zonaGroup.style.display = "block";
        populateSelect("oZona", zonas);
    } else {
        zonaGroup.style.display = "none";
        zSel.options.length = 0;
        populateOEquipo(sede, "");
    }
}

function onOrdZonaChange() {
    var sede = document.getElementById("oSedes").value;
    var zona = document.getElementById("oZona").value;
    populateOEquipo(sede, zona);
}

function populateOEquipo(sede, zona) {
    var sel = document.getElementById("oEquipo");
    if (!sel) return;
    sel.innerHTML = '<option value="" disabled selected>Seleccionar equipo...</option>';
    var lista = [];
    try {
        if (zona && typeof ZONA_EQUIPOS !== "undefined" && ZONA_EQUIPOS[sede] && ZONA_EQUIPOS[sede][zona]) {
            lista = ZONA_EQUIPOS[sede][zona];
        } else if (zona === "OTROS" || !zona) {
            lista = (typeof SEDE_EQUIPOS !== "undefined" && SEDE_EQUIPOS[sede]) || [];
            if (zona === "OTROS") lista = (typeof SEDE_EQUIPOS !== "undefined" && SEDE_EQUIPOS[sede]) || [];
        } else if (typeof SEDE_EQUIPOS !== "undefined" && SEDE_EQUIPOS[sede]) {
            lista = SEDE_EQUIPOS[sede];
        }
    } catch (e) {}
    lista = lista || [];
    if (lista.length === 0) {
        sel.innerHTML = '<option value="" disabled selected>Sin equipos en esta sede o zona</option>';
    }
    lista.forEach(function (eq) {
        var opt = document.createElement("option");
        opt.value = eq;
        opt.textContent = eq;
        sel.appendChild(opt);
    });
    // "OTRO" sirve para encargar un trabajo de algo que no esta en el catalogo.
    // Solo se usa en esta orden: nunca se agrega a la lista de equipos.
    var otro = document.createElement("option");
    otro.value = "OTRO";
    otro.textContent = "OTRO";
    sel.appendChild(otro);
    // Al cambiar de sede o zona se rehace la lista, asi que el campo se oculta.
    onOrdEquipoChange();
}

// Muestra el campo para escribir el nombre cuando se elige OTRO.
function onOrdEquipoChange() {
    var sel = document.getElementById("oEquipo");
    var grupo = document.getElementById("oEquipoOtroGroup");
    var input = document.getElementById("oEquipoOtro");
    var esOtro = !!(sel && sel.value === "OTRO");
    if (grupo) grupo.style.display = esOtro ? "" : "none";
    if (input && !esOtro) input.value = "";
    return esOtro;
}

function guardarOrden(e) {
    e.preventDefault();
    if (ordenEnviando) return;
    var paraTecnico = esOrdenTecnico();
    var sede = document.getElementById("oSedes").value;
    var zona = document.getElementById("oZona").value || "";
    var equipo = document.getElementById("oEquipo").value;
    var equipoOtro = document.getElementById("oEquipoOtro");
    if (equipo === "OTRO") {
        equipo = equipoOtro ? equipoOtro.value.trim() : "";
        if (!equipo) { alert("Escribe el nombre del equipo."); if (equipoOtro) equipoOtro.focus(); return; }
    }
    var especialidad = document.getElementById("oEspecialidad").value;
    var descripcion = document.getElementById("oDescripcion").value.trim();
    var tecnico = paraTecnico ? (tecnicoNombre || (usuarioActual ? usuarioActual.nombre : "")) : document.getElementById("oTecnico").value;
    if (!sede) { alert("Selecciona una sede."); return; }
    if (!equipo) { alert("Selecciona un equipo."); return; }
    if (!especialidad) { alert("Selecciona una especialidad."); return; }
    if (!tecnico) { alert("Selecciona el tecnico asignado."); return; }
    if (!descripcion) { alert(paraTecnico ? "Describe el trabajo que realizaste." : "Describe el trabajo a realizar."); return; }
    var ayuda = "No", ayudaCantidad = 0, ayudaTecnicos = [];
    if (paraTecnico) {
        var tgl = document.querySelector("#otAyudaSi.active-si, #otAyudaNo.active-si, #otAyudaSi.active-no, #otAyudaNo.active-no");
        if (tgl) ayuda = tgl.dataset.value;
        if (ayuda === "Si") {
            ayudaTecnicos = typeof getAyudaTecnicos === "function" ? getAyudaTecnicos("otAyuda") : [];
            if (ayudaTecnicos.length === 0) { alert("Selecciona el tecnico que te ayudo."); return; }
            ayudaCantidad = ayudaTecnicos.length;
        }
    }
      ordenEnviando = true;
      var btn = document.getElementById("btnGuardarOrden");
      if (btn) btn.disabled = true;
      var fechaOrden = hoyYMD();
      var horaOrden = ahoraHM();
      var cuerpo = {
          tipo: "orden_trabajo",
          sede: sede,
          zona: zona,
          equipo: equipo,
          especialidad: especialidad,
          descripcion: descripcion,
          tecnico: tecnico,
          ayuda: ayuda,
          ayudaCantidad: ayudaCantidad,
          ayudaTecnicos: ayudaTecnicos,
          registradoPor: usuarioActual ? usuarioActual.nombre : "",
          creadoPorTecnico: paraTecnico ? "Si" : "No",
          fecha: fechaOrden,
          hora: horaOrden
      };
      // Antes de mandar, se pregunta al servidor si ya hay una igual en esta
      // misma hora. El POST no se puede leer, asi que esta es la unica forma de
      // poder avisar en vez de guardar dos veces sin que nadie se entere.
      verificarEnvioDuplicado({
          tipo: "orden_trabajo",
          sede: sede,
          zona: zona,
          equipo: equipo,
          especialidad: especialidad,
          descripcion: descripcion,
          tecnico: tecnico,
          fecha: fechaOrden,
          hora: horaOrden
      }).then(function (duplicado) {
          ordenEnviando = false;
          if (btn) btn.disabled = false;
          if (duplicado) {
              alert("Esta orden ya se habia enviado con los mismos datos en esta misma hora.\n\nRevisa la lista antes de mandarla de nuevo.");
              return;
          }
          return postJSON(cuerpo)
              .then(function () {
                  // El numero no se puede leer del POST, asi que se vuelve a
                  // pedir la lista y se mira que numero quedo al final.
                  return fetchJSON("ordenes_trabajo", {}, { refresh: true });
              })
                .then(function (d) {
                    ordenesCache = (d && d.ordenes) || [];
                    var ultima = ordenesCache.length ? ordenesCache[ordenesCache.length - 1] : null;
                    alert("Orden " + ((ultima && ultima.numero) || "") + " registrada a " + tecnico + ".");
                    if (typeof notiRefrescar === "function") notiRefrescar(true);
                    if (paraTecnico) {
                        tecOrdenesSubVista("estado");
                    } else {
                        ordenesSubVista("estado");
                    }
                });
        })
          .catch(function () {
              ordenEnviando = false;
              if (btn) btn.disabled = false;
              alert("Error al crear la orden. Intenta de nuevo.");
          });
  }

function pintarOrdenesTabs() {
    var nav = document.getElementById("oEstadoTabs");
    if (!nav) return;
    nav.innerHTML = OT_ESTADOS.map(function (c) {
        var activo = ordenesCatActual === c.id;
        return '<button type="button" onclick="cambiarOrdenCat(\'' + c.id + '\')" style="' +
            (activo ? 'background:#f57c00;color:#fff;border-color:#f57c00;' : 'background:transparent;color:#333;border-color:#ccc;') +
            'border:1px solid;border-radius:20px;padding:7px 14px;font-size:.85rem;cursor:pointer;">' + c.label + '</button>';
    }).join("");
}

function cambiarOrdenCat(cat) {
    ordenesCatActual = cat;
    pintarOrdenesTabs();
    pintarOrdenesEstado(ordenesCache);
}

function catDeOrden(o) {
    var s = String(o.estado || "Pendiente");
    var m = { "Pendiente": "pendientes", "Realizada": "realizada", "En proceso": "proceso", "Falsa orden": "falsa", "No realizada": "norealizada" };
    return m[s] || "pendientes";
}

function colorDeOrden(o) {
    var id = catDeOrden(o);
    for (var i = 0; i < OT_ESTADOS.length; i++) {
        if (OT_ESTADOS[i].id === id) return OT_ESTADOS[i].color;
    }
    return "#888";
}

function pintarOrdenesEstado(lista) {
    var l = document.getElementById("oEstadoLista");
    if (!l) return;
    lista = lista || [];
    var q = String((document.getElementById("oEstadoBuscar") || {}).value || "").trim().toLowerCase();
    var filtradas = lista.filter(function (o) {
        if (catDeOrden(o) !== ordenesCatActual) return false;
        if (ordenesSoloMias && String(o.tecnico || "").trim() !== (typeof tecnicoNombre !== "undefined" ? tecnicoNombre : "")) return false;
        if (!q) return true;
        return (String(o.numero || "") + " " + String(o.equipo || "") + " " + String(o.sede || "") + " " + String(o.especialidad || "") + " " + String(o.tecnico || "")).toLowerCase().indexOf(q) !== -1;
    });
    if (ordenesCatActual === "pendientes") {
        filtradas = filtradas.filter(function (o) { return String(o.estado || "Pendiente") === "Pendiente"; });
    }
    if (filtradas.length === 0) {
        l.className = "lista-vacia";
        l.innerHTML = q ? "No hay ordenes que coincidan con la busqueda." : "No hay ordenes en esta categoria.";
        return;
    }
    l.className = "";
    l.innerHTML = "";
      filtradas.forEach(function (o) {
          var card = document.createElement("div");
          card.className = "card";
          card.style.cssText = "margin-bottom:10px;padding:12px;border-left:4px solid " + colorDeOrden(o) + ";";
          // Reasignar es solo del administrador, y solo mientras la orden siga
          // abierta: una vez cerrada, quien la hizo es parte del historial.
            var puedeReasignar = esRolAdmin(usuarioActual.rol) &&
                String(o.estado || "Pendiente") !== "Realizada" &&
                String(o.estado || "Pendiente") !== "Falsa orden";
            // Editar y borrar quedan solo para el administrador. Cerrar una orden
            // no bloquea el borrado: a veces una orden se creo por error y hay
            // que sacarla aunque ya tenga resultado.
            var esAdmin = esRolAdmin(usuarioActual.rol);
            // El numero y el tecnico van como argumento de un onclick, asi que
            // necesitan escape de JS: escaparHTML deja pasar el apostrofo.
            var numOrden = escJS(o.numero);
            var botonesAdmin = esAdmin
                ? '<div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap;">' +
                (puedeReasignar ? '<button type="button" class="btn-secondary" style="font-size:0.8rem;padding:7px 12px;" onclick="reasignarOrden(\'' + numOrden + '\',\'' + escJS(o.tecnico || "") + '\')">Reasignar</button>' : '') +
                '<button type="button" class="btn-secondary" style="font-size:0.8rem;padding:7px 12px;" onclick="editarOrdenAdmin(\'' + numOrden + '\')">Editar</button>' +
                '<button type="button" class="btn-secondary" style="font-size:0.8rem;padding:7px 12px;color:#c62828;border-color:#e57373;" onclick="borrarOrdenAdmin(\'' + numOrden + '\')">Borrar</button>' +
                '</div>'
                : (puedeReasignar ? '<div style="margin-top:8px;"><button type="button" class="btn-secondary" style="font-size:0.8rem;padding:7px 12px;" onclick="reasignarOrden(\'' + numOrden + '\',\'' + escJS(o.tecnico || "") + '\')">Reasignar</button></div>' : '');
          card.innerHTML =
              '<div style="font-weight:700;color:' + colorDeOrden(o) + ';">' + escaparHTML(o.numero) + ' <span class="badge-frecuencia" style="background:#fff3e0;color:#e65100;">' + escaparHTML(o.especialidad || "General") + '</span></div>' +
              '<div style="font-size:0.85rem;color:#333;margin-top:4px;">Equipo: <b>' + escaparHTML(o.equipo) + '</b></div>' +
              '<div style="font-size:0.82rem;color:#555;">Sede: ' + escaparHTML(o.sede) + (o.zona ? " | Zona: " + escaparHTML(o.zona) : "") + '</div>' +
              '<div style="font-size:0.82rem;color:#555;">Tecnico: <b>' + (o.tecnico ? escaparHTML(o.tecnico) : "Sin asignar") + '</b> | Estado: <b>' + escaparHTML(o.estado || "Pendiente") + '</b></div>' +
              (o.asignado ? '<div style="font-size:0.78rem;color:#888;margin-top:2px;">Asignado: ' + escaparHTML(o.asignado) + '</div>' : '') +
                botonesAdmin +
                  (o.descripcion ? '<div style="font-size:0.82rem;color:#777;margin-top:4px;">' + escaparHTML(o.descripcion) + '</div>' : '') +
            (o.resolucion ? '<div style="font-size:0.82rem;color:#2e7d32;margin-top:4px;">Resolucion: ' + escaparHTML(o.resolucion) + '</div>' : '') +
            (o.resFecha ? '<div style="font-size:0.78rem;color:#888;margin-top:2px;">Resuelta: ' + escaparHTML(o.resFecha) + ' ' + escaparHTML(o.resHora) + '</div>' : '') +
            ((o.fotos && o.fotos.length) ? '<div style="margin-top:6px;">' + o.fotos.map(function (f) {
                return '<a href="https://drive.google.com/file/d/' + f.id + '/view" target="_blank"><img src="https://drive.google.com/thumbnail?id=' + f.id + '&sz=w200" style="width:64px;height:64px;object-fit:cover;border-radius:6px;margin-right:4px;"></a>';
            }).join("") + '</div>' : '');
        l.appendChild(card);
    });
}

// ---- Reasignar una orden (solo administrador) -------------------------------
// Cuando una orden se crea con el tecnico equivocado, o ese tecnico se va,
// no habia forma de moverla: tocaba entrar a la hoja de calculo a mano y
// eso se le olvidaba a alguien. Aqui el administrador la mueve desde la lista.
// Editar una orden ya creada. Solo el administrador: se corregen los datos con
// que se registro, no el estado ni el numero.
function editarOrdenAdmin(numero) {
    if (!usuarioActual || !esRolAdmin(usuarioActual.rol)) return;
    var orden = (ordenesCache || []).filter(function (o) { return String(o.numero) === String(numero); })[0];
    if (!orden) { alert("No se encontro la orden " + numero + " en la lista."); return; }
    var wrap = document.getElementById("ordenReasignarWrap");
    if (!wrap) return;
    wrap.innerHTML =
        '<div class="modal-overlay" style="position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:10000;display:flex;align-items:center;justify-content:center;padding:16px;">' +
        '<div style="background:#fff;border-radius:10px;padding:18px;max-width:460px;width:100%;max-height:90vh;overflow:auto;">' +
        '<div class="module-title" style="font-size:1rem;margin-bottom:10px;">Editar orden ' + escaparHTML(numero) + '</div>' +
        '<div style="font-size:0.82rem;color:#777;margin-bottom:12px;">Deja vacio un campo si no quieres cambiarlo. El numero y el estado no se modifican.</div>' +
        '<label style="font-size:0.8rem;color:#555;">Sede</label>' +
        '<input id="oEdSede" type="text" value="' + escaparHTML(orden.sede || "") + '" style="width:100%;box-sizing:border-box;padding:9px;border:1px solid #ccc;border-radius:8px;margin-bottom:8px;">' +
        '<label style="font-size:0.8rem;color:#555;">Zona</label>' +
        '<input id="oEdZona" type="text" value="' + escaparHTML(orden.zona || "") + '" style="width:100%;box-sizing:border-box;padding:9px;border:1px solid #ccc;border-radius:8px;margin-bottom:8px;">' +
        '<label style="font-size:0.8rem;color:#555;">Equipo</label>' +
        '<input id="oEdEquipo" type="text" value="' + escaparHTML(orden.equipo || "") + '" style="width:100%;box-sizing:border-box;padding:9px;border:1px solid #ccc;border-radius:8px;margin-bottom:8px;">' +
        '<label style="font-size:0.8rem;color:#555;">Especialidad</label>' +
        '<input id="oEdEsp" type="text" value="' + escaparHTML(orden.especialidad || "") + '" style="width:100%;box-sizing:border-box;padding:9px;border:1px solid #ccc;border-radius:8px;margin-bottom:8px;">' +
        '<label style="font-size:0.8rem;color:#555;">Tecnico</label>' +
        '<select id="oEdTecnico" style="width:100%;box-sizing:border-box;padding:9px;border:1px solid #ccc;border-radius:8px;margin-bottom:8px;"><option value="">(sin cambiar)</option></select>' +
        '<label style="font-size:0.8rem;color:#555;">Descripcion</label>' +
        '<textarea id="oEdDesc" rows="3" style="width:100%;box-sizing:border-box;padding:9px;border:1px solid #ccc;border-radius:8px;">' + escaparHTML(orden.descripcion || "") + '</textarea>' +
        '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px;">' +
        '<button type="button" class="btn-secondary" onclick="cerrarEditarOrden()">Cancelar</button>' +
        '<button type="button" class="btn-primary" id="oEdIr">Guardar cambios</button>' +
        '</div></div></div>';
    wrap.style.display = "block";
    fetchJSON("personal", {}, { cacheMs: 120000 })
        .then(function (personal) {
            var nombres = (personal || []).filter(function (p) { return p.tipo === "Tecnico"; })
                .map(function (p) { return p.nombre; });
            var sel = document.getElementById("oEdTecnico");
            if (!sel) return;
            if (orden.tecnico && nombres.indexOf(orden.tecnico) === -1) {
                nombres = [orden.tecnico].concat(nombres);
            }
            populateSelect("oEdTecnico", nombres);
            if (orden.tecnico) sel.value = orden.tecnico;
        })
        .catch(function () { });
    var ir = document.getElementById("oEdIr");
    if (ir) ir.onclick = function () { confirmarEditarOrden(numero, orden); };
}

function cerrarEditarOrden() {
    var wrap = document.getElementById("ordenReasignarWrap");
    if (!wrap) return;
    wrap.style.display = "none";
    wrap.innerHTML = "";
}

function confirmarEditarOrden(numero, orden) {
    var cambios = {};
    var pares = [
        ["sede", "oEdSede"], ["zona", "oEdZona"], ["equipo", "oEdEquipo"],
        ["especialidad", "oEdEsp"], ["descripcion", "oEdDesc"]
    ];
    pares.forEach(function (par) {
        var el = document.getElementById(par[1]);
        if (!el) return;
        var antes = String(orden[par[0]] === undefined ? "" : orden[par[0]]);
        var ahora = String(el.value || "").trim();
        if (ahora !== antes) cambios[par[0]] = ahora;
    });
    var selTec = document.getElementById("oEdTecnico");
    if (selTec && selTec.value !== String(orden.tecnico || "")) cambios.tecnico = selTec.value;
    if (Object.keys(cambios).length === 0) { alert("No cambiaste nada."); return; }
    if (!confirm("Guardar los cambios en la orden " + numero + "?")) return;
    cambios.tipo = "editar_orden";
    cambios.numero = numero;
    cambios.registradoPor = usuarioActual.nombre || "";
    postJSON(cambios).then(function () {
        cerrarEditarOrden();
        // Igual que al reasignar: el POST va en no-cors y no se puede leer. Se
        // vuelve a pedir la lista y se mira el campo guardado de verdad, para no
        // confirmarle al admin algo que el backend haya rechazado.
        return fetchJSON("ordenes_trabajo", {}, { refresh: true });
    }).then(function (d) {
        ordenesCache = (d && d.ordenes) || [];
        var guardo = (ordenesCache || []).filter(function (o) { return String(o.numero) === String(numero); })[0];
        if (!guardo) {
            alert("La orden " + numero + " no aparece en la lista.\n\nPuede que el cambio se guardara y la orden quedara en otra categoria, o que el backend la rechazara.");
        } else {
            alert("Orden " + numero + " actualizada.");
        }
        ordenesSubVista(ordenesCatActual);
        if (typeof notiRefrescar === "function") notiRefrescar(true);
    });
}

// Borrar no elimina de verdad: el backend mueve la orden a la hoja
// ordenes_borradas con quien la borro y cuando, y deja nota en la actividad.
function borrarOrdenAdmin(numero) {
    if (!usuarioActual || !esRolAdmin(usuarioActual.rol)) return;
    if (!confirm("Borrar la orden " + numero + "?\n\nNo se elimina de verdad: se mueve a la hoja de ordenes borradas junto con la fecha y tu nombre, para que quede el rastro.")) return;
    postJSON({ tipo: "eliminar_orden", numero: numero, registradoPor: usuarioActual.nombre || "" })
        .then(function () {
            return fetchJSON("ordenes_trabajo", {}, { refresh: true });
        }).then(function (d) {
            ordenesCache = (d && d.ordenes) || [];
            var sigue = (ordenesCache || []).filter(function (o) { return String(o.numero) === String(numero); })[0];
            if (sigue) {
                alert("La orden " + numero + " sigue en la lista.\n\nEl backend no la borro. Puede que no tengas permiso o que el numero no exista.");
            } else {
                alert("Orden " + numero + " movida a la hoja de borradas.");
            }
            ordenesSubVista(ordenesCatActual);
            if (typeof notiRefrescar === "function") notiRefrescar(true);
        });
}

function reasignarOrden(numero, tecnicoActual) {
    if (!usuarioActual || !esRolAdmin(usuarioActual.rol)) return;
    var wrap = document.getElementById("ordenReasignarWrap");
    if (!wrap) return;
    wrap.innerHTML =
        '<div class="modal-overlay" style="position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:10000;display:flex;align-items:center;justify-content:center;padding:16px;">' +
        '<div style="background:#fff;border-radius:10px;padding:18px;max-width:420px;width:100%;max-height:90vh;overflow:auto;">' +
        '<div class="module-title" style="font-size:1rem;margin-bottom:8px;">Reasignar orden ' + escaparHTML(numero) + '</div>' +
        '<div style="font-size:0.85rem;color:#555;margin-bottom:12px;">Ahora mismo: <b>' + escaparHTML(tecnicoActual || "Sin asignar") + '</b></div>' +
        '<select id="oReasignarSel" style="width:100%;box-sizing:border-box;padding:9px;border:1px solid #ccc;border-radius:8px;"><option value="">Cargando tecnicos...</option></select>' +
        '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px;">' +
        '<button type="button" class="btn-secondary" onclick="cerrarReasignarOrden()">Cancelar</button>' +
        '<button type="button" class="btn-primary" id="oReasignarIr">Reasignar</button>' +
        '</div></div></div>';
    wrap.style.display = "block";
    fetchJSON("personal", {}, { cacheMs: 120000 })
        .then(function (personal) {
            var nombres = (personal || []).filter(function (p) { return p.tipo === "Tecnico"; })
                .map(function (p) { return p.nombre; });
            populateSelect("oReasignarSel", nombres);
            var sel = document.getElementById("oReasignarSel");
            if (sel && tecnicoActual && nombres.indexOf(tecnicoActual) !== -1) sel.value = tecnicoActual;
        })
        .catch(function () {
            var sel = document.getElementById("oReasignarSel");
            if (sel) sel.innerHTML = '<option value="">No se pudieron cargar los tecnicos</option>';
        });
    var ir = document.getElementById("oReasignarIr");
    if (ir) ir.onclick = function () { confirmarReasignarOrden(numero); };
}

function cerrarReasignarOrden() {
    var wrap = document.getElementById("ordenReasignarWrap");
    if (!wrap) return;
    wrap.style.display = "none";
    wrap.innerHTML = "";
}

function confirmarReasignarOrden(numero) {
    if (!usuarioActual || !esRolAdmin(usuarioActual.rol)) return;
    var sel = document.getElementById("oReasignarSel");
    var nuevo = sel ? String(sel.value || "").trim() : "";
    if (!nuevo) { alert("Elige un tecnico de la lista."); return; }
    var previa = (ordenesCache || []).filter(function (o) { return String(o.numero) === String(numero); })[0];
    var anterior = previa ? String(previa.tecnico || "").trim() : "";
    if (anterior === nuevo) {
        alert("Esa orden ya esta asignada a " + nuevo + ".");
        cerrarReasignarOrden();
        return;
    }
    var btn = document.getElementById("oReasignarIr");
    if (btn) { btn.disabled = true; btn.textContent = "Asignando..."; }
    postJSON({
        tipo: "reasignar_orden",
        numero: numero,
        tecnico: nuevo,
        registradoPor: usuarioActual.nombre
    }).then(function () {
        // El POST va en no-cors, asi que no se puede leer la respuesta. Se
        // vuelve a pedir la lista y se mira lo que quedo de verdad, en vez de
        // dar por buena la asignacion sin comprobar nada.
        return fetchJSON("ordenes_trabajo", {}, { refresh: true });
    }).then(function (d) {
        ordenesCache = (d && d.ordenes) || [];
        var ahora = (ordenesCache || []).filter(function (o) { return String(o.numero) === String(numero); })[0];
        cerrarReasignarOrden();
        pintarOrdenesEstado(ordenesCache);
        alert(ahora && String(ahora.tecnico || "").trim() === nuevo
            ? "Orden " + numero + " ahora es de " + nuevo + "."
            : "No se pudo reasignar la orden " + numero + ". Revisa la conexion.");
    }).catch(function () {
        if (btn) { btn.disabled = false; btn.textContent = "Reasignar"; }
        alert("No se pudo reasignar. Revisa la conexion.");
    });
}