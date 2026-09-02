// semanero.js - Interfaz de semanero y taller

function toggleTallerTask(btn) {
    const row = btn.parentElement;
    row.querySelectorAll(".toggle-btn").forEach(b => {
        b.classList.remove("active-si", "active-no");
    });
    if (btn.dataset.value === "Si") {
        btn.classList.add("active-si");
    } else {
        btn.classList.add("active-no");
    }

    const wrapper = btn.closest(".taller-task");
    const idx = parseInt(btn.dataset.path);
    const task = rutinaActual[idx];
    const sub = document.getElementById("tallerSub_" + idx);

    if (btn.dataset.value === "Si" && task.expand) {
        sub.style.display = "block";
        renderTallerFields(sub, task.expand, [idx]);
    } else {
        sub.style.display = "none";
        sub.innerHTML = "";
    }
}

function renderTallerFields(container, fields, path) {
    container.innerHTML = "";
    fields.forEach((field, fi) => {
        const myPath = path.concat(fi);
        const fieldDiv = document.createElement("div");
        fieldDiv.className = "taller-sub-field";
        fieldDiv.dataset.path = myPath.join(",");

        const label = document.createElement("label");
        label.textContent = field.label;
        fieldDiv.appendChild(label);

        if (field.type === "toggle") {
            const tg = document.createElement("div");
            tg.className = "toggle-group";
            tg.innerHTML = `
                <button type="button" class="toggle-btn sub-toggle" data-path="${myPath.join(",")}" data-value="Si" onclick="toggleSubToggle(this)">Si</button>
                <button type="button" class="toggle-btn sub-toggle" data-path="${myPath.join(",")}" data-value="No" onclick="toggleSubToggle(this)">No</button>
            `;
            fieldDiv.appendChild(tg);

            if (field.expand) {
                fieldDiv.classList.add("taller-sub-field-col");
                const nested = document.createElement("div");
                nested.className = "taller-sub taller-nested";
                nested.id = "tallerNested_" + myPath.join("_");
                nested.style.display = "none";
                fieldDiv.appendChild(nested);
            }
        } else if (field.type === "number") {
            const inp = document.createElement("input");
            inp.type = "number";
            inp.className = "taller-number-input";
            inp.dataset.path = myPath.join(",");
            if (field.min !== undefined) inp.min = field.min;
            if (field.max !== undefined) inp.max = field.max;
            fieldDiv.appendChild(inp);
        } else if (field.type === "Text") {
            const inp = document.createElement("input");
            inp.type = "text";
            inp.className = "taller-number-input taller-text-input";
            inp.dataset.path = myPath.join(",");
            fieldDiv.appendChild(inp);
        }

        container.appendChild(fieldDiv);
    });
}

function toggleSubToggle(btn) {
    const group = btn.parentElement;
    group.querySelectorAll(".toggle-btn").forEach(b => {
        b.classList.remove("active-si", "active-no");
    });
    if (btn.dataset.value === "Si") {
        btn.classList.add("active-si");
    } else {
        btn.classList.add("active-no");
    }

    const path = btn.dataset.path.split(",").map(Number);
    let field = rutinaActual[path[0]];
    for (let i = 1; i < path.length; i++) {
        field = field.expand[path[i]];
    }

    const nested = document.getElementById("tallerNested_" + path.join("_"));
    if (!nested) return;

    if (btn.dataset.value === "Si" && field.expand) {
        nested.style.display = "block";
        renderTallerFields(nested, field.expand, path);
    } else {
        nested.style.display = "none";
        nested.innerHTML = "";
    }
}

function getTallerValues() {
    const results = {};
    document.querySelectorAll(".taller-task").forEach(wrapper => {
        try {
            const idx = parseInt(wrapper.dataset.taskIdx);
            const task = rutinaActual[idx];
            if (!task) return;
            const activeBtn = wrapper.querySelector(".taller-task-row .active-si, .taller-task-row .active-no");
            const val = activeBtn ? activeBtn.dataset.value : "";
            const sub = {};
            if (val === "Si" && task.expand) {
                const subEl = document.getElementById("tallerSub_" + idx);
                if (!subEl) return;
                collectTallerFields(sub, task.expand, subEl);
            }
            results[task.label] = { value: val, sub: sub };
        } catch (err) {
            alert("Error en tarea: " + err.message);
        }
    });
    return results;
}

function collectTallerFields(out, fields, containerEl) {
    const fieldEls = containerEl.querySelectorAll(".taller-sub-field");
    fields.forEach((field, fi) => {
        const fieldEl = fieldEls[fi];
        if (!fieldEl) return;
        if (field.type === "toggle") {
            const sb = fieldEl.querySelector(".active-si, .active-no");
            const v = sb ? sb.dataset.value : "";
            if (field.expand && v === "Si") {
                const nestedEl = document.getElementById("tallerNested_" + fieldEl.dataset.path.split(",").join("_"));
                if (nestedEl) {
                    collectTallerFields(out, field.expand, nestedEl);
                } else {
                    out[field.label] = v;
                }
            } else {
                out[field.label] = v;
            }
        } else {
            const inp = fieldEl.querySelector("input");
            out[field.label] = inp ? inp.value : "";
        }
    });
}

function tallerSubCompleto(wrapper) {
    const val = wrapper.querySelector(".taller-task-row .active-si, .taller-task-row .active-no");
    if (!val || val.dataset.value !== "Si") return true;
    const idx = parseInt(wrapper.dataset.taskIdx);
    const task = rutinaActual[idx];
    if (!task || !task.expand) return true;
    const subEl = document.getElementById("tallerSub_" + idx);
    if (!subEl) return true;
    return tallerFieldsCompletos(task.expand, subEl);
}

function tallerFieldsCompletos(fields, containerEl) {
    const fieldEls = containerEl.querySelectorAll(".taller-sub-field");
    return Array.from(fields).every((field, fi) => {
        const fieldEl = fieldEls[fi];
        if (!fieldEl) return false;
        if (field.type === "toggle") {
            const toggle = fieldEl.querySelector(".active-si, .active-no");
            if (!toggle) return false;
            if (toggle.dataset.value === "Si" && field.expand) {
                const nestedEl = document.getElementById("tallerNested_" + fieldEl.dataset.path.split(",").join("_"));
                if (!nestedEl) return false;
                return tallerFieldsCompletos(field.expand, nestedEl);
            }
            return true;
        }
        const num = fieldEl.querySelector("input");
        return num ? num.value !== "" : false;
    });
}

function enviarTaller(sedes, fecha, hora, zona, mantenimiento, descripcion) {
    const tallerValues = getTallerValues();
    const turno = calcularTurno(hora);

    if (tallerValues["Tanques"] && tallerValues["Tanques"].value === "Si") {
        let tanquesWrapper = null;
        document.querySelectorAll(".taller-task").forEach(function(wrapper) {
            const idx = parseInt(wrapper.dataset.taskIdx);
            const task = rutinaActual[idx];
            if (task && task.label === "Tanques") tanquesWrapper = wrapper;
        });

        if (tanquesWrapper && !tallerSubCompleto(tanquesWrapper)) {
            alert("Las sub-preguntas de Tanques estan incompletas. Complete: Llenos, Vacios, Entrada de Agua de la Calle, Solicitar cisterna.");
        } else if (confirm("Confirmar envio de Tanques?\n\nFecha: " + fecha + "\nHora: " + hora + "\nSede: " + sedes)) {
            var sub = tallerValues["Tanques"].sub || {};
            var solicitaCisterna = sub["Solicitar cisterna"] === "Si";
            var entradaDeAgua = sub["Entrada de Agua de la Calle"] || "";
            var llenos = (sub["Llenos"] !== undefined && sub["Llenos"] !== null) ? sub["Llenos"] : "";
            var vacios = (sub["Vacios"] !== undefined && sub["Vacios"] !== null) ? sub["Vacios"] : "";

            if (solicitaCisterna) {
                postJSON({ tipo: "solicitar_cisterna", sede: sedes, fecha: fecha, hora: hora, tecnico: tecnicoNombre }).catch(function () {});
            }

            var idTanques = generarIdUnico(fecha, hora, sedes, "Tanques", tecnicoNombre);
            if (!yaEnviado(idTanques)) {
                marcarEnviado(idTanques);
                saveToLocalStorage({
                    id: idTanques,
                    fecha: fecha,
                    hora: hora,
                    turno: turno,
                    sedes: sedes,
                    zona: zona,
                    tecnico: tecnicoNombre,
                    equipo: sedes === "RUICES" ? "Semanero los Ruices" : "SEMANERO",
                    rutina: "Actividades de Semaneros - Tanques",
                    task: "Tanques",
                    llenos: llenos,
                    vacios: vacios,
                    entradaDeAgua: entradaDeAgua,
                    solicitarCisterna: solicitaCisterna,
                    descripcion: descripcion
                });
                postJSON({
                    tipo: "semanero_tanques",
                    sedes: sedes,
                    fecha: fecha,
                    hora: hora,
                    zona: zona,
                    tecnico: tecnicoNombre,
                    llenos: llenos,
                    vacios: vacios,
                    entradaDeAgua: entradaDeAgua,
                    solicitarCisterna: solicitaCisterna,
                    descripcion: descripcion
                }).catch(function () {});
            }
        }
    }

    for (const [taskLabel, data] of Object.entries(tallerValues)) {
        if (data.value !== "Si") continue;
        if (taskLabel === "Tanques") continue;

        const idUnico = generarIdUnico(fecha, hora, sedes, taskLabel, tecnicoNombre);

        if (yaEnviado(idUnico)) {
            alert("El registro para " + taskLabel + " ya fue enviado anteriormente.");
            continue;
        }

        if (!confirm("Confirmar envio de " + taskLabel + "?\n\nFecha: " + fecha + "\nHora: " + hora + "\nSede: " + sedes + "\nZona: " + zona + "\nTecnico: " + tecnicoNombre)) {
            continue;
        }

        const registro = {
            id: idUnico,
            fecha: fecha,
            hora: hora,
            turno: turno,
            sedes: sedes,
            zona: zona,
            tecnico: tecnicoNombre,
            equipo: sedes === "RUICES" ? "Semanero los Ruices" : "SEMANERO",
            mantenimiento: mantenimiento,
            rutina: "Actividades de Semaneros - " + taskLabel,
            task: taskLabel,
            taskValue: data.value,
            taskSub: data.sub,
            descripcion: descripcion
        };

        marcarEnviado(idUnico);
        saveToLocalStorage(registro);

        fetch(APPS_SCRIPT_URL, {
            method: "POST",
            mode: "no-cors",
            body: JSON.stringify(registro)
        }).then(() => {}).catch(() => {});
    }

    alert("Tareas de Taller enviadas.");
    clearForm();
}

function renderSemanarioRuices(container) {
    container.innerHTML = "";
    parteSemanarioActual = 0;

    RUTINA_SEMANARIO_RUICES.forEach((parte, pi) => {
        const div = document.createElement("div");
        div.className = "semanario-part";
        div.dataset.part = pi;
        div.style.display = pi === 0 ? "block" : "none";

        const titulo = document.createElement("h3");
        titulo.className = "semanario-part-titulo";
        titulo.textContent = parte.titulo;
        div.appendChild(titulo);

        if (parte.campos) {
            parte.campos.forEach((campo, ci) => {
                const f = document.createElement("div");
                f.className = "semanario-campo";
                f.dataset.part = pi;
                f.dataset.campo = ci;

                const l = document.createElement("label");
                l.textContent = campo.label;

                const wrap = document.createElement("div");
                wrap.className = "semanario-respuesta";

                const tg = document.createElement("div");
                tg.className = "semanario-toggle";

                const btnSi = document.createElement("button");
                btnSi.type = "button";
                btnSi.className = "toggle-btn";
                btnSi.dataset.value = "Si";
                btnSi.textContent = "Si";

                const btnNo = document.createElement("button");
                btnNo.type = "button";
                btnNo.className = "toggle-btn";
                btnNo.dataset.value = "No";
                btnNo.textContent = "No";

                let inp;
                if (campo.type === "select") {
                    inp = document.createElement("select");
                    inp.className = "semanario-select";
                    const optEmpty = document.createElement("option");
                    optEmpty.value = "";
                    optEmpty.textContent = "Seleccionar...";
                    inp.appendChild(optEmpty);
                    (campo.options || []).forEach(op => {
                        const o = document.createElement("option");
                        o.value = op;
                        o.textContent = op;
                        inp.appendChild(o);
                    });
                } else {
                    inp = document.createElement("input");
                    inp.type = campo.type === "text" ? "text" : "number";
                    inp.step = "any";
                    inp.className = "semanario-number-input";
                }
                inp.dataset.part = pi;
                inp.dataset.campo = ci;
                inp.style.display = "none";

                function setCampoSemanario(val) {
                    tg.querySelectorAll(".toggle-btn").forEach(b => {
                        b.classList.remove("active-si", "active-no");
                    });
                    (val === "Si" ? btnSi : btnNo).classList.add(val === "Si" ? "active-si" : "active-no");
                    if (val === "Si") {
                        inp.style.display = "block";
                    } else {
                        inp.style.display = "none";
                        inp.value = "";
                    }
                }

                btnSi.addEventListener("click", function () { setCampoSemanario("Si"); });
                btnNo.addEventListener("click", function () { setCampoSemanario("No"); });

                tg.appendChild(btnSi);
                tg.appendChild(btnNo);
                wrap.appendChild(tg);
                wrap.appendChild(inp);
                f.appendChild(l);
                f.appendChild(wrap);
                div.appendChild(f);
            });
        } else if (parte.tareas) {
            rutinaActual = parte.tareas;
            renderExpandableTasks(div, parte.tareas, false);
        }

        container.appendChild(div);
    });

    var atajo = document.createElement("button");
    atajo.type = "button";
    atajo.className = "btn-atajo-tanques";
    atajo.textContent = "Tanques";
    atajo.onclick = function () {
        parteSemanarioActual = RUTINA_SEMANARIO_RUICES.length - 1;
        mostrarParteSemanario();
        setPaso2Buttons();
    };
    container.appendChild(atajo);
}

function mostrarParteSemanario() {
    document.querySelectorAll(".semanario-part").forEach(p => {
        p.style.display = parseInt(p.dataset.part) === parteSemanarioActual ? "block" : "none";
    });
}

function semanarioSiguiente() {
    if (parteSemanarioActual < RUTINA_SEMANARIO_RUICES.length - 1) {
        parteSemanarioActual++;
        mostrarParteSemanario();
        setPaso2Buttons();
        if (typeof actualizarMiniNav === "function") actualizarMiniNav();
    }
}

function semanarioRuicesCompleto() {
    let ok = true;
    document.querySelectorAll(".semanario-part").forEach(partEl => {
        const pi = parseInt(partEl.dataset.part);
        const parte = RUTINA_SEMANARIO_RUICES[pi];
        if (!parte) return;
        if (parte.campos) {
            parte.campos.forEach((campo, ci) => {
                const campoEl = partEl.querySelector('.semanario-campo[data-campo="' + ci + '"]');
                if (!campoEl) return;
                const active = campoEl.querySelector(".semanario-toggle .active-si, .semanario-toggle .active-no");
                if (!active) return;
                if (active.dataset.value === "Si") {
                    const inp = campoEl.querySelector(".semanario-number-input, .semanario-select");
                    if (!inp || inp.value.trim() === "") ok = false;
                }
            });
        } else if (parte.tareas) {
            partEl.querySelectorAll(".taller-task").forEach(wrapper => {
                const toggleActive = wrapper.querySelector(".taller-task-row .active-si, .taller-task-row .active-no");
                if (!toggleActive) return;
                if (!tallerSubCompleto(wrapper)) ok = false;
            });
        }
    });
    return ok;
}

function contarSemanarioSinMarcar() {
    let sinMarcar = 0;
    document.querySelectorAll(".semanario-part").forEach(partEl => {
        const pi = parseInt(partEl.dataset.part);
        const parte = RUTINA_SEMANARIO_RUICES[pi];
        if (!parte) return;
        if (parte.campos) {
            parte.campos.forEach((campo, ci) => {
                const campoEl = partEl.querySelector('.semanario-campo[data-campo="' + ci + '"]');
                if (!campoEl) return;
                const active = campoEl.querySelector(".semanario-toggle .active-si, .semanario-toggle .active-no");
                if (!active) sinMarcar++;
            });
        } else if (parte.tareas) {
            partEl.querySelectorAll(".taller-task").forEach(wrapper => {
                const toggleActive = wrapper.querySelector(".taller-task-row .active-si, .taller-task-row .active-no");
                if (!toggleActive) sinMarcar++;
            });
        }
    });
    return sinMarcar;
}

function getSemanarioRuicesValues() {
    const partes = [];
    document.querySelectorAll(".semanario-part").forEach(partEl => {
        const pi = parseInt(partEl.dataset.part);
        const parte = RUTINA_SEMANARIO_RUICES[pi];
        if (!parte) return;
        if (parte.campos) {
            const respuestas = {};
            parte.campos.forEach((campo, ci) => {
                const campoEl = partEl.querySelector('.semanario-campo[data-campo="' + ci + '"]');
                if (!campoEl) { respuestas[campo.label] = ""; return; }
                const active = campoEl.querySelector(".semanario-toggle .active-si, .semanario-toggle .active-no");
                if (!active) { respuestas[campo.label] = ""; return; }
                if (active.dataset.value === "No") {
                    respuestas[campo.label] = "";
                    return;
                }
                const inp = campoEl.querySelector(".semanario-number-input, .semanario-select");
                respuestas[campo.label] = inp ? inp.value.trim() : "";
            });
            partes.push({ titulo: parte.titulo, tipo: "campos", respuestas: respuestas });
        } else if (parte.tareas) {
            const respuestas = {};
            partEl.querySelectorAll(".taller-task").forEach(wrapper => {
                try {
                    const idx = parseInt(wrapper.dataset.taskIdx);
                    const task = rutinaActual[idx];
                    if (!task) return;
                    const activeBtn = wrapper.querySelector(".taller-task-row .active-si, .taller-task-row .active-no");
                    const val = activeBtn ? activeBtn.dataset.value : "";
                    const sub = {};
                    if (val === "Si" && task.expand) {
                        const subEl = document.getElementById("tallerSub_" + idx);
                        if (!subEl) return;
                        collectTallerFields(sub, task.expand, subEl);
                    }
                    respuestas[task.label] = { value: val, sub: sub };
                } catch (err) {
                    alert("Error en tarea: " + err.message);
                }
            });
            partes.push({ titulo: parte.titulo, tipo: "tareas", respuestas: respuestas });
        }
    });
    return partes;
}

function enviarSemanarioRuices(sedes, fecha, hora, zona, descripcion) {
    const valores = getSemanarioRuicesValues();
    const turno = calcularTurno(hora);

    const idUnico = generarIdUnico(fecha, hora, sedes, "Semanero RUICES", tecnicoNombre);
    if (yaEnviado(idUnico)) {
        alert("Este registro ya fue enviado anteriormente.");
        return;
    }

    if (!confirm("Confirmar envio del Semanero de RUICES?\n\nFecha: " + fecha + "\nHora: " + hora + "\nTecnico: " + tecnicoNombre)) {
        return;
    }

    let parteTanques = null;
    const camposPartes = [];
    valores.forEach(v => {
        if (v.tipo === "tareas") parteTanques = v;
        else camposPartes.push(v);
    });

    if (parteTanques) {
        const tarea = parteTanques.respuestas["Tanques"];
        if (tarea && tarea.value === "Si") {
            let tanquesWrapper = null;
            document.querySelectorAll(".taller-task").forEach(function(wrapper) {
                const idx = parseInt(wrapper.dataset.taskIdx);
                const task = rutinaActual[idx];
                if (task && task.label === "Tanques") tanquesWrapper = wrapper;
            });

            if (tanquesWrapper && !tallerSubCompleto(tanquesWrapper)) {
                alert("Las sub-preguntas de Tanques estan incompletas. Complete: Llenos, Vacios, Entrada de Agua de la Calle, Solicitar cisterna.");
            } else {
                const solicitaCisterna = tarea.sub && tarea.sub["Solicitar cisterna"] === "Si";
                if (solicitaCisterna) {
                    postJSON({ tipo: "solicitar_cisterna", sede: sedes, fecha: fecha, hora: hora, tecnico: tecnicoNombre }).catch(function () {});
                }
                const idTanques = generarIdUnico(fecha, hora, sedes, "Tanques", tecnicoNombre);
                if (!yaEnviado(idTanques)) {
                    const subT = (tarea.sub || {});
                    const entradaDeAgua = subT["Entrada de Agua de la Calle"] || "";
                    const llenos = (subT["Llenos"] !== undefined && subT["Llenos"] !== null) ? subT["Llenos"] : "";
                    const vacios = (subT["Vacios"] !== undefined && subT["Vacios"] !== null) ? subT["Vacios"] : "";
                    marcarEnviado(idTanques);
                    saveToLocalStorage({
                        id: idTanques,
                        fecha: fecha,
                        hora: hora,
                        turno: turno,
                        sedes: sedes,
                        zona: zona,
                        tecnico: tecnicoNombre,
                        equipo: sedes === "RUICES" ? "Semanero los Ruices" : "SEMANERO",
                        rutina: "Actividades de Semaneros - Tanques",
                        task: "Tanques",
                        llenos: llenos,
                        vacios: vacios,
                        entradaDeAgua: entradaDeAgua,
                        solicitarCisterna: solicitaCisterna,
                        descripcion: descripcion
                    });
                    postJSON({
                        tipo: "semanero_tanques",
                        sedes: sedes,
                        fecha: fecha,
                        hora: hora,
                        zona: zona,
                        tecnico: tecnicoNombre,
                        llenos: llenos,
                        vacios: vacios,
                        entradaDeAgua: entradaDeAgua,
                        solicitarCisterna: solicitaCisterna,
                        descripcion: descripcion
                    }).catch(function () {});
                }
            }
        }
    }

    let hayDatosCampos = false;
    camposPartes.forEach(function(p) {
        if (p.respuestas) {
            Object.values(p.respuestas).forEach(function(v) {
                if (typeof v === "string" && v.trim() !== "") hayDatosCampos = true;
            });
        }
    });

    if (!hayDatosCampos) {
        clearForm();
        return;
    }

    const registro = {
        tipo: "semanario_ruices",
        id: idUnico,
        fecha: fecha,
        hora: hora,
        turno: turno,
        sedes: sedes,
        zona: zona,
        tecnico: tecnicoNombre,
        titulos: camposPartes,
        descripcion: descripcion
    };

    marcarEnviado(idUnico);
    saveToLocalStorage(registro);

    fetch(APPS_SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
        body: JSON.stringify(registro)
    })
    .then(() => {
        alert("Semanero de RUICES enviado correctamente.");
        clearForm();
    })
    .catch(() => {
        alert("Error al enviar. El registro se guardo localmente.");
        clearForm();
    });
}

function clearForm() {
    if (typeof ocultarMiniNav === "function") ocultarMiniNav();
    document.getElementById("checkinForm").reset();
    resetCombobox("equipo", "Seleccionar equipo...");
    document.getElementById("descripcion").value = "";
    document.getElementById("descripcionTaller").value = "";
    document.getElementById("descripcionTallerGroup").style.display = "none";
    document.getElementById("checkinsContainer").innerHTML = "";
    document.getElementById("paso2").style.display = "none";
    document.getElementById("paso1").style.display = "block";
    document.getElementById("zonaGroup").style.display = "none";
    document.getElementById("zona").innerHTML = '<option value="" disabled selected>Seleccionar zona...</option>';
    document.getElementById("equipoGroup").style.display = "block";
    document.getElementById("equipoExteriorGroup").style.display = "none";
    document.getElementById("equipoExterior").value = "";
    document.getElementById("equipoOtroGroup").style.display = "none";
    document.getElementById("equipoOtro").value = "";
    document.getElementById("mantenimientoGroup").style.display = "block";
    document.getElementById("formActions").style.display = "flex";
    document.getElementById("equipo").required = true;
    document.getElementById("mantenimiento").required = true;
    limpiarHora();
    rutinaActual = [];
    nombreRutinaActual = "";
    esTaller = false;
    esSemanarioRuices = false;
    parteSemanarioActual = 0;
    esDinamica = false;
    rutinaYaRenderizada = false;
    resetPaso3();
    document.getElementById("otroMantenimientoGroup").style.display = "none";
    document.getElementById("otroDescripcion").value = "";
    document.getElementById("otroRepuestosGroup").style.display = "none";
    document.getElementById("otroRepuestosRows").innerHTML = "";
    document.getElementById("otroRepSi").classList.remove("active-si", "active-no");
    document.getElementById("otroRepNo").classList.remove("active-si", "active-no");
}
