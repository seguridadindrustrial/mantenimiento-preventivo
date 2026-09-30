// checkin.js - Interfaz de rutinas / check-in (paso 2 y envio del formulario)

var retrasoActivo = null;

function hoyYMD() {
    var d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

function verificarRetrasoPreventivo(equipo) {
    retrasoActivo = null;
    var grupo = document.getElementById("retrasoGroup");
    if (grupo) grupo.style.display = "none";
    if (!equipo) return;
    fetch(APPS_SCRIPT_URL + "?accion=preventivos")
        .then(function (r) { return r.json(); })
        .then(function (lista) {
            var hoy = hoyYMD();
            var pend = (lista || []).find(function (p) {
                return p.equipo === equipo &&
                    p.estado !== "E" &&
                    String(p.retrasado || "") !== "Si" &&
                    p.fechaLimite && String(p.fechaLimite) < hoy && String(p.fechaLimite) >= String(p.fecha || "");
            });
            if (pend) {
                retrasoActivo = { equipo: equipo, fechaProgramada: pend.fecha };
                var g = document.getElementById("retrasoGroup");
                if (g) g.style.display = "block";
            }
        })
        .catch(function () {});
}

function irAlPaso2() {
    const sedes = document.getElementById("sedes").value;
    const fh = fechaHoraAhora();
    const fecha = fh.fecha;
    const hora = fh.hora;
    const zona = document.getElementById("zona").value;
    const esExterior = !esTaller && zona === "EXTERIOR";
    const equipoSelect = document.getElementById("equipo").value;
    const esOtro = equipoSelect === "__OTRO__";
    const equipo = esTaller
        ? (sedes === "RUICES" ? "Semanero los Ruices" : "SEMANERO")
        : esExterior
        ? document.getElementById("equipoExterior").value.trim()
        : esOtro
        ? document.getElementById("equipoOtro").value.trim()
        : equipoSelect;
    const mantenimiento = esTaller ? "" : document.getElementById("mantenimiento").value;

    if (!sedes) {
        alert("Por favor completa todos los campos antes de continuar.");
        return;
    }
    if (!esTaller && !mantenimiento) {
        alert("Selecciona un tipo de mantenimiento.");
        return;
    }
    const zonas = SEDE_ZONAS[sedes] || [];
    if (!esTaller && zonas.length > 0 && !zona) {
        alert("Selecciona una zona.");
        return;
    }
    if (!esTaller && !equipo) {
        alert(esExterior ? "Escribe el nombre del equipo." : esOtro ? "Escribe el nombre del equipo." : "Selecciona un equipo.");
        return;
    }

    if (!rutinaYaRenderizada) {
        renderRutina(equipo, mantenimiento);
    }

    if (mantenimiento === "OTRO") {
        var otroDesc = document.getElementById("otroDescripcion").value.trim();
        var otroRepToggle = document.querySelector("#otroRepSi.active-si, #otroRepNo.active-si, #otroRepSi.active-no, #otroRepNo.active-no");
        if (!otroRepToggle) {
            alert("Responde Si o No en repuestos.");
            return;
        }
        var otrosRepuestos = [];
        if (otroRepToggle.dataset.value === "Si") {
            otrosRepuestos = getRepuestos("otroRepuestosRows");
            if (otrosRepuestos.length === 0) {
                alert("Agrega al menos un repuesto.");
                return;
            }
            for (var irOtro = 0; irOtro < otrosRepuestos.length; irOtro++) {
                var cantOtroR = parseInt(otrosRepuestos[irOtro].cantidad, 10);
                if (isNaN(cantOtroR) || cantOtroR < 1) {
                    alert("Indica la cantidad de cada repuesto.");
                    return;
                }
            }
        }
        var otroAyudaToggle = document.querySelector("#otroAyudaSi.active-si, #otroAyudaNo.active-si, #otroAyudaSi.active-no, #otroAyudaNo.active-no");
        if (!otroAyudaToggle) {
            alert("Responde Si o No en necesitaste apoyo.");
            return;
        }
        var otroAyudaTecnicos = [];
        if (otroAyudaToggle.dataset.value === "Si") {
            var cantOtro = parseInt(document.getElementById("otroAyudaCantidad").value, 10);
            if (!cantOtro || cantOtro < 1) {
                alert("Indica la cantidad de tecnicos que te ayudaron.");
                return;
            }
            otroAyudaTecnicos = getAyudaTecnicos("otroAyuda");
            if (otroAyudaTecnicos.length !== cantOtro) {
                alert("Selecciona a cada uno de los " + cantOtro + " tecnico(s) que te ayudaron.");
                return;
            }
        }
        var turno = calcularTurno(hora);
        var idUnico = generarIdUnico(fecha, hora, sedes, equipo, tecnicoNombre);
        if (yaEnviado(idUnico)) {
            alert("Este registro ya fue enviado anteriormente.");
            return;
        }
        if (!confirm("Confirmar envio?\n\nSede: " + sedes + "\nEquipo: " + equipo + "\nMantenimiento: OTRO\n\nLa fecha y la hora las registra el sistema.")) {
            return;
        }
        var registroOtro = {
            id: idUnico,
            fecha: fecha, hora: hora, turno: turno,
            sedes: sedes, zona: zona, tecnico: tecnicoNombre,
            equipo: equipo, mantenimiento: "OTRO",
            rutina: "OTRO",
            checkinKeys: [], checkinValues: [],
            descripcion: otroDesc,
            repuestos: otrosRepuestos,
            ayuda: otroAyudaToggle.dataset.value,
            ayudaCantidad: otroAyudaToggle.dataset.value === "Si" ? otroAyudaTecnicos.length : 0,
            ayudaTecnicos: otroAyudaTecnicos
        };
        // Pasa por el mismo camino con verificacion que el reporte normal, para
        // que aqui tampoco se pueda mandar dos veces lo mismo por accidente.
        enviarRegistroConChequeo(
            registroOtro,
            "Registro enviado correctamente.",
            "Error de conexion. El registro se enviara cuando haya internet."
        );
        return;
    }

    if (!esDinamica && (!rutinaActual || (Array.isArray(rutinaActual) && rutinaActual.length === 0))) {
        alert("El equipo seleccionado no tiene rutina definida.");
        return;
    }

    if (!esTaller && mantenimiento === "PREVENTIVO") {
        verificarRetrasoPreventivo(equipo);
    }

    document.getElementById("paso1").style.display = "none";
    document.getElementById("paso2").style.display = "block";
    if (typeof actualizarMiniNav === "function") actualizarMiniNav();
}

function renderRutina(equipo, mantenimiento) {
    const container = document.getElementById("checkinsContainer");
    container.innerHTML = "";
    container.style.display = "";
    esDinamica = false;
    rutinaYaRenderizada = true;

    if (esTaller) {
        if (esSemanarioRuices) {
            nombreRutinaActual = "Semanero RUICES";
            renderSemanarioRuices(container);
        } else {
            nombreRutinaActual = "Actividades de Semaneros";
            rutinaActual = RUTINA_TALLER["Actividades de Semaneros"] || [];
            renderExpandableTasks(container);
        }
        setPaso2Buttons();
        return;
    }

    if (mantenimiento === "CORRECTIVO") {
        nombreRutinaActual = "Rutina Correctiva";
        rutinaActual = RUTINA_CORRECTIVO["Rutina Correctiva"] || [];
    } else {
        const baseRutina = EQUIPO_RUTINA[equipo] || "";
        nombreRutinaActual = baseRutina;
        rutinaActual = RUTINA_PREVENTIVO[baseRutina] || [];
    }

    if (mantenimiento !== "CORRECTIVO" && rutinaActual.length === 0) {
        nombreRutinaActual = "Rutina Dinamica - " + equipo;
        renderRutinaDinamica(container, equipo);
        setPaso2Buttons();
        return;
    }

    if (rutinaActual.length === 0) {
        container.innerHTML = "<p style='color:#999;font-size:0.85rem;'>No hay rutina definida para este equipo.</p>";
        setPaso2Buttons();
        return;
    }

    const labelRutina = document.createElement("p");
    labelRutina.style.cssText = "color:#5f9263;font-size:0.8rem;font-weight:600;margin-bottom:4px;";
    labelRutina.textContent = mantenimiento + " - " + nombreRutinaActual;
    container.appendChild(labelRutina);

    rutinaActual.forEach((item, index) => {
        const esObjeto = typeof item === "object" && item !== null;
        const label = esObjeto ? item.label : item;
        if (!label) return;
        const fields = esObjeto ? (item.expand || (item.sub ? [item.sub] : null)) : null;
        let subHtml = "";
        if (fields && fields.length > 0) {
            let camposHtml = "";
            fields.forEach((f, fi) => {
                if (f.type === "toggle") {
                    camposHtml += `
                        <div class="checkin-sub-row">
                            <label>${f.label}</label>
                        <div class="toggle-group checkin-sub-toggle">
                                <button type="button" class="toggle-btn" data-field="${fi}" data-value="Si" onclick="toggleCheckinSub(this)">Si</button>
                                <button type="button" class="toggle-btn" data-field="${fi}" data-value="No" onclick="toggleCheckinSub(this)">No</button>
                        </div>
                    </div>`;
            } else {
                    const tipoInput = f.type === "number" ? "number" : "text";
                    const minMax = (f.type === "number" && f.min !== undefined ? ` min="${f.min}"` : "") +
                        (f.type === "number" && f.max !== undefined ? ` max="${f.max}"` : "");
                    camposHtml += `
                        <div class="checkin-sub-row">
                            <label data-for="checkinSub_${index}_f_${fi}">${f.label}</label>
                            <input type="${tipoInput}" id="checkinSub_${index}_f_${fi}" class="checkin-sub-input" data-field="${fi}"${minMax}>
                        </div>`;
                }
            });
                subHtml = `
                    <div class="checkin-sub" id="checkinSub_${index}" style="display:none;">
                    ${camposHtml}
                    </div>`;
            }
        const div = document.createElement("div");
        div.className = "checkin-item";
        div.innerHTML = `
            <span>${label}</span>
            <div class="toggle-group checkin-main-toggle">
                <button type="button" class="toggle-btn" data-index="${index}" data-value="Si" onclick="toggleCheckin(this)">Si</button>
                <button type="button" class="toggle-btn" data-index="${index}" data-value="No" onclick="toggleCheckin(this)">No</button>
            </div>
            ${subHtml}
        `;
        activarLabels(div);
        container.appendChild(div);
    });

    setPaso2Buttons();
}

function setPaso2Buttons() {
    if (esTaller && esSemanarioRuices) {
        const esUltima = parteSemanarioActual >= RUTINA_SEMANARIO_RUICES.length - 1;
        document.getElementById("btnPaso3").style.display = esUltima ? "none" : "block";
        document.getElementById("btnEnviar").style.display = esUltima ? "block" : "none";
        var atajo = document.querySelector(".btn-atajo-tanques");
        if (atajo) atajo.style.display = esUltima ? "none" : "block";
    } else {
        document.getElementById("btnPaso3").style.display = esTaller ? "none" : "block";
        document.getElementById("btnEnviar").style.display = esTaller ? "block" : "none";
    }
    document.getElementById("descripcionTallerGroup").style.display = esTaller ? "block" : "none";
}

function renderRutinaDinamica(container, equipo) {
    esDinamica = true;
    equipoDinamicoActual = equipo || "";

    const guardada = getRutinaDinamicaGuardada(equipoDinamicoActual);
    esCreadorDinamica = !guardada || !guardada.creadoPor || guardada.creadoPor === tecnicoNombre;
    if (guardada && guardada.pasos.length > 0) {
        rutinaActual = guardada.pasos.slice();
    }
    container.style.display = "block";

    const label = document.createElement("p");
    label.style.cssText = "color:#5f9263;font-size:0.8rem;font-weight:600;margin-bottom:4px;";
    if (guardada && guardada.pasos.length > 0 && !esCreadorDinamica) {
        label.textContent = "Rutina creada por " + guardada.creadoPor + ". Solo ese tecnico puede modificarla.";
    } else if (guardada && guardada.pasos.length > 0) {
        label.textContent = "Rutina guardada para este equipo. Puedes agregar o quitar pasos:";
    } else {
        label.textContent = "Este equipo no tiene rutina asignada. Crea los pasos:";
    }
    container.appendChild(label);

    const stepsWrap = document.createElement("div");
    stepsWrap.id = "dynamicStepsWrapper";
    container.appendChild(stepsWrap);

    if (esCreadorDinamica) {
        const builder = document.createElement("div");
        builder.className = "dynamic-builder";

        const input = document.createElement("input");
        input.type = "text";
        input.placeholder = "Escribe el paso a verificar...";
        input.className = "dynamic-step-input";
        builder.appendChild(input);

        const addBtn = document.createElement("button");
        addBtn.type = "button";
        addBtn.className = "btn-secondary btn-add";
        addBtn.textContent = "＋ Agregar paso";
        addBtn.addEventListener("click", () => {
            const texto = input.value.trim();
            if (!texto) {
                alert("Escribe el paso antes de agregarlo.");
                return;
            }
            rutinaActual.push(texto);
            input.value = "";
            input.focus();
            guardarRutinaDinamica(equipoDinamicoActual, rutinaActual);
            renderRutinaDinamicaSteps();
        });
        builder.appendChild(addBtn);

        container.appendChild(builder);
    }

    renderRutinaDinamicaSteps();
}

function renderRutinaDinamicaSteps() {
    const wrap = document.getElementById("dynamicStepsWrapper");
    if (!wrap) return;
    wrap.innerHTML = "";
    rutinaActual.forEach((label, index) => {
        const div = document.createElement("div");
        div.className = "checkin-item";
        div.innerHTML = `
            <span>${label}</span>
            <div class="toggle-group checkin-main-toggle">
                <button type="button" class="toggle-btn" data-index="${index}" data-value="Si" onclick="toggleCheckin(this)">Si</button>
                <button type="button" class="toggle-btn" data-index="${index}" data-value="No" onclick="toggleCheckin(this)">No</button>
            </div>
            ${esCreadorDinamica ? `<button type="button" class="dynamic-remove" onclick="removerPasoDinamico(${index})">✕</button>` : ""}
        `;
        wrap.appendChild(div);
    });
}

function removerPasoDinamico(index) {
    if (!esCreadorDinamica) return;
    rutinaActual.splice(index, 1);
    guardarRutinaDinamica(equipoDinamicoActual, rutinaActual);
    renderRutinaDinamicaSteps();
}

function irAlPaso3() {
    if (esTaller) return;

    const checkins = getCheckinValues();
    if (rutinaActual.length === 0) {
        alert("Agrega al menos un paso a la rutina.");
        return;
    }
    const hasCheckinEmpty = rutinaActual.some(c => {
        const label = typeof c === "object" && c !== null ? c.label : c;
        if (!label) return false;
        return !checkins[label];
    });
    if (hasCheckinEmpty) {
        alert("Por favor responde todos los pasos de la rutina (Si/No).");
        return;
    }
    if (!checkinSubsCompletas()) {
        alert("Completa las sub-preguntas de los pasos marcados con Si.");
        return;
    }

    document.getElementById("paso2").style.display = "none";
    document.getElementById("paso3").style.display = "block";
    if (typeof actualizarMiniNav === "function") actualizarMiniNav();
}

function renderExpandableTasks(container, tasks, withLabel) {
    const rutinaTareas = tasks || rutinaActual;
    if (withLabel !== false) {
        const labelRutina = document.createElement("p");
        labelRutina.style.cssText = "color:#5f9263;font-size:0.8rem;font-weight:600;margin-bottom:4px;";
        labelRutina.textContent = "Actividades de Semaneros";
        container.appendChild(labelRutina);
    }

    rutinaTareas.forEach((task, idx) => {
        const wrapper = document.createElement("div");
        wrapper.className = "taller-task";
        wrapper.dataset.taskIdx = idx;

        const row = document.createElement("div");
        row.className = "taller-task-row";
        row.innerHTML = `
            <span class="taller-task-label">${task.label}</span>
            <div class="toggle-group">
                <button type="button" class="toggle-btn" data-path="${idx}" data-value="Si" onclick="toggleTallerTask(this)">Si</button>
                <button type="button" class="toggle-btn" data-path="${idx}" data-value="No" onclick="toggleTallerTask(this)">No</button>
            </div>
        `;
        wrapper.appendChild(row);

        const subContainer = document.createElement("div");
        subContainer.className = "taller-sub";
        subContainer.id = "tallerSub_" + idx;
        subContainer.style.display = "none";
        wrapper.appendChild(subContainer);

        container.appendChild(wrapper);
    });
}

function toggleCheckin(btn) {
    const group = btn.parentElement;
    group.querySelectorAll(".toggle-btn").forEach(b => {
        b.classList.remove("active-si", "active-no");
    });
    btn.classList.add(btn.dataset.value === "Si" ? "active-si" : "active-no");

    const item = btn.closest(".checkin-item");
    if (item) {
        const sub = item.querySelector(".checkin-sub");
        if (sub) {
            sub.style.display = btn.dataset.value === "Si" ? "block" : "none";
        }
    }
}

function toggleCheckinSub(btn) {
    const group = btn.parentElement;
    group.querySelectorAll(".toggle-btn").forEach(b => {
        b.classList.remove("active-si", "active-no");
    });
    btn.classList.add(btn.dataset.value === "Si" ? "active-si" : "active-no");
}

function getCheckinValues() {
    const results = {};
    document.querySelectorAll(".checkin-main-toggle").forEach((group) => {
        const anyBtn = group.querySelector(".toggle-btn[data-index]");
        if (!anyBtn) return;
        const item = rutinaActual[parseInt(anyBtn.dataset.index, 10)];
        if (!item) return;
        const label = typeof item === "object" && item !== null ? item.label : item;
        const activeBtn = group.querySelector(".active-si, .active-no");
        results[label] = activeBtn ? activeBtn.dataset.value : "";
    });
    return results;
}

function getCheckinSubValues() {
    const checkins = getCheckinValues();
    const out = [];
    rutinaActual.forEach((item, index) => {
        const esObjeto = typeof item === "object" && item !== null;
        const fields = esObjeto ? (item.expand || (item.sub ? [item.sub] : null)) : null;
        if (!fields || fields.length === 0) return;
        if (checkins[item.label] !== "Si") return;
        const subEl = document.getElementById("checkinSub_" + index);
        if (!subEl) return;
        fields.forEach((field, fi) => {
            if (field.type === "toggle") {
                const tg = subEl.querySelectorAll(".checkin-sub-toggle")[fi];
                const btn = tg ? tg.querySelector(".active-si, .active-no") : null;
                out.push({ label: field.label, value: btn ? btn.dataset.value : "", step: item.label });
        } else {
                const inp = subEl.querySelectorAll(".checkin-sub-input")[fi];
                out.push({ label: field.label, value: inp ? inp.value.trim() : "", step: item.label });
        }
    });
    });
    return out;
}

function checkinSubsCompletas() {
    const checkins = getCheckinValues();
    return rutinaActual.every((item, index) => {
        const esObjeto = typeof item === "object" && item !== null;
        const fields = esObjeto ? (item.expand || (item.sub ? [item.sub] : null)) : null;
        if (!fields || fields.length === 0) return true;
        if (checkins[item.label] !== "Si") return true;
        const subEl = document.getElementById("checkinSub_" + index);
        if (!subEl) return false;
        return fields.every((field, fi) => {
            if (field.type === "toggle") {
                const tg = subEl.querySelectorAll(".checkin-sub-toggle")[fi];
                return tg ? !!tg.querySelector(".active-si, .active-no") : false;
        }
            const inp = subEl.querySelectorAll(".checkin-sub-input")[fi];
        return inp ? inp.value.trim() !== "" : false;
        });
    });
}

function enviarFormulario(e) {
    e.preventDefault();

    const sedes = document.getElementById("sedes").value;
    const fh = fechaHoraAhora();
    const fecha = fh.fecha;
    const hora = fh.hora;
    const zona = document.getElementById("zona").value;
    const esExterior = !esTaller && zona === "EXTERIOR";
    const equipoSelect = document.getElementById("equipo").value;
    const esOtro = equipoSelect === "__OTRO__";
    const equipo = esTaller
        ? (sedes === "RUICES" ? "Semanero los Ruices" : "SEMANERO")
        : esExterior
        ? document.getElementById("equipoExterior").value.trim()
        : esOtro
        ? document.getElementById("equipoOtro").value.trim()
        : equipoSelect;
    const mantenimiento = esTaller ? "" : document.getElementById("mantenimiento").value;
    const descripcion = document.getElementById(esTaller ? "descripcionTaller" : "descripcion").value.trim();

    if (!sedes) {
        alert("Por favor completa todos los campos.");
        return;
    }
    if (!esTaller && !mantenimiento) {
        alert("Selecciona un tipo de mantenimiento.");
        return;
    }
    if (!esTaller && !equipo) {
        alert(esExterior ? "Escribe el nombre del equipo." : esOtro ? "Escribe el nombre del equipo." : "Selecciona un equipo.");
        return;
    }

    if (esOtro && equipo) {
        postJSON({ tipo: "nuevo_equipo", equipo: equipo, sede: sedes, zona: zona }).catch(function() {});
    }

    if (esTaller) {
        if (esSemanarioRuices) {
            if (!semanarioRuicesCompleto()) {
                alert("Completa todas las sub-preguntas de las opciones marcadas con Si antes de enviar.");
                return;
            }
            var sinMarcar = contarSemanarioSinMarcar();
            if (sinMarcar > 0) {
                if (!confirm("Tienes " + sinMarcar + " opcion(es) sin marcar. ¿Deseas enviar de todas formas?")) {
                    return;
                }
            }
            enviarSemanarioRuices(sedes, fecha, hora, zona, descripcion);
            return;
        }
        const allAnswered = Array.from(document.querySelectorAll(".taller-task")).every(w =>
            w.querySelector(".taller-task-row .active-si, .taller-task-row .active-no")
        );
        if (!allAnswered) {
            alert("Responde Si o No en todas las tareas antes de enviar.");
            return;
        }
        const allSubAnswered = Array.from(document.querySelectorAll(".taller-task")).every(tallerSubCompleto);
        if (!allSubAnswered) {
            alert("Completa todas las sub-preguntas de las tareas marcadas con Si.");
            return;
        }
        enviarTaller(sedes, fecha, hora, zona, mantenimiento, descripcion);
        return;
    }

    const checkins = getCheckinValues();

    if (rutinaActual.length === 0) {
        alert("Selecciona un equipo con rutina definida.");
        return;
    }

    const hasCheckinEmpty = rutinaActual.some(c => {
        const label = typeof c === "object" && c !== null ? c.label : c;
        if (!label) return false;
        return !checkins[label];
    });
    if (hasCheckinEmpty) {
        alert("Por favor responde todos los pasos de la rutina (Si/No).");
        return;
    }
    if (!checkinSubsCompletas()) {
        alert("Completa las sub-preguntas de los pasos marcados con Si.");
        return;
    }

    const repuestoToggle = document.querySelector("#repSi.active-si, #repNo.active-si, #repSi.active-no, #repNo.active-no");
    if (!repuestoToggle) {
        alert("Responde Si o No en repuestos.");
        return;
    }
    let repuestos = [];
    if (repuestoToggle.dataset.value === "Si") {
        repuestos = getRepuestos();
        if (repuestos.length === 0) {
            alert("Agrega al menos un repuesto.");
            return;
        }
        for (let irp = 0; irp < repuestos.length; irp++) {
            const cantRp = parseInt(repuestos[irp].cantidad, 10);
            if (isNaN(cantRp) || cantRp < 1) {
                alert("Indica la cantidad de cada repuesto.");
                return;
            }
        }
    }

    const ayudaToggle = document.querySelector("#ayudaSi.active-si, #ayudaNo.active-si, #ayudaSi.active-no, #ayudaNo.active-no");
    if (!ayudaToggle) {
        alert("Responde Si o No en necesitaste apoyo.");
        return;
    }
    let ayudaTecnicos = [];
    if (ayudaToggle.dataset.value === "Si") {
        const cant = parseInt(document.getElementById("ayudaCantidad").value, 10);
        if (!cant || cant < 1) {
            alert("Indica la cantidad de tecnicos que te ayudaron.");
            return;
        }
        ayudaTecnicos = getAyudaTecnicos();
        if (ayudaTecnicos.length !== cant) {
            alert("Selecciona a cada uno de los " + cant + " tecnico(s) que te ayudaron.");
            return;
        }
    }

    const turno = calcularTurno(hora);
    const idUnico = generarIdUnico(fecha, hora, sedes, equipo, tecnicoNombre);

    if (esDinamica) {
        guardarRutinaDinamica(equipo, rutinaActual);
    }

    if (yaEnviado(idUnico)) {
        alert("Este registro ya fue enviado anteriormente.");
        return;
    }

    if (prevAsignadoActivo) {
        if (!confirm("Confirmar envio?\n\nEquipo: " + equipo + "\nTecnico: " + tecnicoNombre + "\n\nLa fecha y la hora las registra el sistema.")) {
            return;
        }
    } else if (!confirm("Confirmar envio?\n\nSede: " + sedes + "\nEquipo: " + equipo + "\nTecnico: " + tecnicoNombre + "\n\nLa fecha y la hora las registra el sistema.")) {
        return;
    }

    const keys = rutinaActual.map(c => typeof c === "object" && c !== null ? c.label : c);
    const subs = getCheckinSubValues();
    const checkinKeysFinal = keys.slice();
    const checkinValuesFinal = keys.map(c => checkins[c] || "");
    subs.forEach(s => {
        checkinKeysFinal.push(s.label + " (" + s.step + ")");
        checkinValuesFinal.push(s.value);
    });

    const registro = {
        id: idUnico,
        fecha: fecha,
        hora: hora,
        turno: turno,
        sedes: sedes,
        zona: zona,
        tecnico: tecnicoNombre,
        equipo: equipo,
        mantenimiento: mantenimiento,
        rutina: nombreRutinaActual,
        checkinKeys: checkinKeysFinal,
        checkinValues: checkinValuesFinal,
        descripcion: descripcion,
        repuestos: repuestos,
        ayuda: ayudaToggle.dataset.value,
        ayudaCantidad: ayudaToggle.dataset.value === "Si" ? ayudaTecnicos.length : 0,
        ayudaTecnicos: ayudaTecnicos
    };

    if (retrasoActivo) {
        var motivoRetraso = document.getElementById("retrasoMotivo").value.trim();
        if (!motivoRetraso) {
            alert("Explica por que no realizaste este preventivo a tiempo.");
            return;
        }
        registro.retraso = {
            equipo: retrasoActivo.equipo,
            fechaProgramada: retrasoActivo.fechaProgramada,
            motivo: motivoRetraso
        };
    }

    // Se comprueba antes de mandar si este mismo tecnico ya registro lo mismo en
    // esta misma hora. El servidor siempre lo hacia, pero como el POST no se
    // puede leer, al tecnico le decia "Enviado" cuando en realidad se habia
    // descartado. El registro solo se marca como enviado si al final si se
    // guarda, para que si se bloquea el tecnico pueda corregir y mandar otra vez.
    enviarRegistroConChequeo(
        registro,
        "Enviado correctamente a Google Sheets.",
        "Error al enviar. El registro se guardo localmente."
    );
}

// Camino comun de los envios de check-in. Primero se pregunta al servidor si lo
// mismo ya se guardo en esta misma hora, y solo si no esta repetido se marca el
// registro y se manda. El chequeo local no alcanzaba porque comparaba la hora
// con minuto: dos clics con dos minutos de diferencia pasaban como distintos.
function enviarRegistroConChequeo(registro, mensajeOk, mensajeError) {
    return verificarEnvioDuplicado({
        tipo: "checkin",
        hoja: registro.rutina || "General",
        tecnico: registro.tecnico,
        sedes: registro.sedes,
        zona: registro.zona,
        equipo: registro.equipo,
        mantenimiento: registro.mantenimiento,
        descripcion: registro.descripcion,
        fecha: registro.fecha,
        hora: registro.hora
    }).then(function (duplicado) {
        if (duplicado) {
            alert("Este reporte ya se habia enviado con los mismos datos en esta misma hora.\n\nNo se guardo otra vez. Si necesitas registrar algo distinto, cambia la descripcion.");
            return;
        }
        marcarEnviado(registro.id);
        saveToLocalStorage(registro);
        return enviarReporteRegistro(registro, mensajeOk, mensajeError);
    }).catch(function () {
        // Si la comprobacion no se pudo hacer, se manda igual: es una proteccion,
        // no un permiso para trabajar. El servidor la vuelve a hacer igual.
        marcarEnviado(registro.id);
        saveToLocalStorage(registro);
        return enviarReporteRegistro(registro, mensajeOk, mensajeError);
    });
}

function enviarReporteRegistro(registro, mensajeOk, mensajeError) {
    fetch(APPS_SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
        body: JSON.stringify(registro)
    })
    .then(() => {
        if (registro.retraso) {
            postJSON({
                tipo: "registrar_retraso_preventivo",
                equipo: registro.retraso.equipo,
                fechaProgramada: registro.retraso.fechaProgramada,
                motivo: registro.retraso.motivo,
                fecha: registro.fecha,
                hora: registro.hora,
                tecnico: registro.tecnico
            }).catch(function () {});
        }
        alert(mensajeOk || "Enviado correctamente a Google Sheets.");
        mostrarResumenMensaje(generarResumenMantenimiento(registro));
        clearForm();
        if (typeof irAlInicio === "function") irAlInicio();
    })
    .catch(() => {
        alert(mensajeError || "Error al enviar. El registro se guardo localmente.");
        clearForm();
        if (typeof irAlInicio === "function") irAlInicio();
    });
}

function generarResumenMantenimiento(registro) {
    var lineas = [];
    lineas.push("RESUMEN DE MANTENIMIENTO");
    lineas.push("");
    lineas.push("Tecnico: " + (registro.tecnico || ""));
    lineas.push("Fecha: " + (registro.fecha || "") + "  Hora: " + (registro.hora || ""));
    lineas.push("Sede: " + (registro.sedes || "") + (registro.zona ? " | Zona: " + registro.zona : ""));
    lineas.push("Equipo: " + (registro.equipo || ""));
    lineas.push("Tipo: " + (registro.mantenimiento || ""));
    lineas.push("");
    lineas.push("Actividades:");
    var keys = registro.checkinKeys || [];
    var values = registro.checkinValues || [];
    for (var i = 0; i < keys.length && i < values.length; i++) {
        if (values[i] === "Si" || values[i] !== "") {
            lineas.push("- " + keys[i] + ": " + (values[i] || "-"));
        }
    }
    if (registro.descripcion) {
        lineas.push("");
        lineas.push("Descripcion: " + registro.descripcion);
    }
    if (registro.repuestos && registro.repuestos.length) {
        lineas.push("");
        lineas.push("Repuestos:");
        registro.repuestos.forEach(function(r) {
            lineas.push("- " + r.nombre + (r.cantidad ? " x" + r.cantidad : ""));
        });
    }
    if (registro.ayuda) {
        lineas.push("");
        lineas.push("Necesito ayuda: " + registro.ayuda);
        if (registro.ayuda === "Si" && registro.ayudaTecnicos && registro.ayudaTecnicos.length) {
            lineas.push("Tecnicos que ayudaron: " + registro.ayudaTecnicos.join(", "));
        }
    }
    return lineas.join("\n");
}

function mostrarResumenMensaje(texto) {
    var textarea = document.getElementById("resumenTexto");
    if (!textarea) return;
    textarea.value = texto;
    document.getElementById("resumenModal").style.display = "block";
}

function copiarResumen() {
    var textarea = document.getElementById("resumenTexto");
    if (!textarea) return;
    textarea.select();
    textarea.setSelectionRange(0, 99999);
    try {
        document.execCommand("copy");
    } catch (e) {}
    alert("Resumen copiado. Puedes pegarlo donde lo necesites.");
}

function cerrarResumen() {
    document.getElementById("resumenModal").style.display = "none";
}

// Editar y borrar correctivos desde el historial. Solo administradores.
// La hoja todo no tiene ID: se manda la fila mas la clave (Fecha y Hora) para
// que el backend confirme que es justo el registro que se eligio.
function correctivoDeHistorial(fila, clave) {
    return (mantenimientosHistorial || []).filter(function (m) {
        return Number(m.fila) === Number(fila) && String(m.clave || "") === String(clave || "");
    })[0];
}

function editarCorrectivo(fila, clave) {
    if (!usuarioActual || !esRolAdmin(usuarioActual.rol)) return;
    var m = correctivoDeHistorial(fila, clave);
    if (!m) { alert("No se encontro el registro. Recarga el historial e intenta de nuevo."); return; }
    var wrap = document.getElementById("historialWrap") || document.body;
    var w = wrap.querySelector("#corrEdWrap");
    if (!w) {
        w = document.createElement("div");
        w.id = "corrEdWrap";
        wrap.appendChild(w);
    }
    w.innerHTML =
        '<div class="modal-overlay" style="position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:10000;display:flex;align-items:center;justify-content:center;padding:16px;">' +
        '<div style="background:#fff;border-radius:10px;padding:18px;max-width:460px;width:100%;max-height:90vh;overflow:auto;">' +
        '<div class="module-title" style="font-size:1rem;margin-bottom:10px;">Editar correctivo</div>' +
        '<div style="font-size:0.82rem;color:#777;margin-bottom:12px;">' + escaparHTML(m.fecha || "") + ' ' + escaparHTML(m.hora || "") + ' | ' + escaparHTML(m.equipo || "") + '</div>' +
        '<label style="font-size:0.8rem;color:#555;">Sede</label>' +
        '<input id="cEdSede" type="text" value="' + escaparHTML(m.sede || "") + '" style="width:100%;box-sizing:border-box;padding:9px;border:1px solid #ccc;border-radius:8px;margin-bottom:8px;">' +
        '<label style="font-size:0.8rem;color:#555;">Zona</label>' +
        '<input id="cEdZona" type="text" value="' + escaparHTML(m.zona || "") + '" style="width:100%;box-sizing:border-box;padding:9px;border:1px solid #ccc;border-radius:8px;margin-bottom:8px;">' +
        '<label style="font-size:0.8rem;color:#555;">Equipo</label>' +
        '<input id="cEdEquipo" type="text" value="' + escaparHTML(m.equipo || "") + '" style="width:100%;box-sizing:border-box;padding:9px;border:1px solid #ccc;border-radius:8px;margin-bottom:8px;">' +
        '<label style="font-size:0.8rem;color:#555;">Tecnico</label>' +
        '<input id="cEdTec" type="text" value="' + escaparHTML(m.tecnico || "") + '" style="width:100%;box-sizing:border-box;padding:9px;border:1px solid #ccc;border-radius:8px;margin-bottom:8px;">' +
        '<label style="font-size:0.8rem;color:#555;">Actividad</label>' +
        '<input id="cEdAct" type="text" value="' + escaparHTML(m.actividad || "") + '" style="width:100%;box-sizing:border-box;padding:9px;border:1px solid #ccc;border-radius:8px;margin-bottom:8px;">' +
        '<label style="font-size:0.8rem;color:#555;">Descripcion</label>' +
        '<textarea id="cEdDesc" rows="3" style="width:100%;box-sizing:border-box;padding:9px;border:1px solid #ccc;border-radius:8px;">' + escaparHTML(m.descripcion || "") + '</textarea>' +
        '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px;">' +
        '<button type="button" class="btn-secondary" onclick="cerrarEditarCorrectivo()">Cancelar</button>' +
        '<button type="button" class="btn-primary" id="cEdIr">Guardar cambios</button>' +
        '</div></div></div>';
    var ir = document.getElementById("cEdIr");
    if (ir) ir.onclick = function () { confirmarEditarCorrectivo(fila, clave, m); };
}

function cerrarEditarCorrectivo() {
    var w = document.getElementById("corrEdWrap");
    if (w) w.innerHTML = "";
}

function confirmarEditarCorrectivo(fila, clave, m) {
    var cambios = {};
    var pares = [["sede", "cEdSede"], ["zona", "cEdZona"], ["equipo", "cEdEquipo"],
    ["tecnico", "cEdTec"], ["actividad", "cEdAct"], ["descripcion", "cEdDesc"]];
    pares.forEach(function (par) {
        var el = document.getElementById(par[1]);
        if (!el) return;
        var antes = String(m[par[0]] === undefined ? "" : m[par[0]]);
        var ahora = String(el.value || "").trim();
        if (ahora !== antes) cambios[par[0]] = ahora;
    });
    if (Object.keys(cambios).length === 0) { alert("No cambiaste nada."); return; }
    if (!confirm("Guardar los cambios en este correctivo?")) return;
    cambios.tipo = "editar_registro_todo";
    cambios.fila = fila;
    cambios.clave = clave;
    cambios.registradoPor = usuarioActual.nombre || "";
    var btn = document.getElementById("cEdIr");
    if (btn) { btn.disabled = true; btn.textContent = "Guardando..."; }
    postJSON(cambios).then(function () {
        // El POST va en no-cors: se vuelve a pedir el historial y se comprueba
        // el valor guardado, en vez de darlo por bueno sin verificar.
        return fetchJSON("historial_mantenimientos", {}, { refresh: true });
    }).then(function (d) {
        mantenimientosHistorial = (d && d.registros) || [];
        mantenimientosHistorialCargados = true;
        cerrarEditarCorrectivo();
        pintarHistorial();
        alert("Correctivo actualizado.");
        if (typeof notiRefrescar === "function") notiRefrescar(true);
    });
}

function borrarCorrectivo(fila, clave) {
    if (!usuarioActual || !esRolAdmin(usuarioActual.rol)) return;
    if (!confirm("Borrar este correctivo?\n\nNo se elimina de verdad: se mueve a la hoja de borrados con la fecha y tu nombre, para que quede el rastro.")) return;
    postJSON({ tipo: "eliminar_registro_todo", fila: fila, clave: clave, registradoPor: usuarioActual.nombre || "" })
        .then(function () {
            return fetchJSON("historial_mantenimientos", {}, { refresh: true });
        }).then(function (d) {
            mantenimientosHistorial = (d && d.registros) || [];
            mantenimientosHistorialCargados = true;
            pintarHistorial();
            alert("Correctivo movido a la hoja de borrados.");
            if (typeof notiRefrescar === "function") notiRefrescar(true);
        });
}
