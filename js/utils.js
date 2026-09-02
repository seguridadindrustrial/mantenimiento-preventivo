// utils.js - Funciones utilitarias compartidas

function postJSON(body) {
    return fetch(APPS_SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
        body: JSON.stringify(body)
    }).then(function () {}).catch(function () {});
}

function limpiarHora(prefix) {
    prefix = prefix || "";
    var id = prefix === "a" ? "aHora" : prefix === "r" ? "rHora" : "hora";
    var el = document.getElementById(id);
    if (el) el.value = "";
}

function populateSelect(id, items, agregarOtro) {
    var isCombo = (id === "equipo" || id === "aEquipo");

    if (isCombo) {
        var hidden = document.getElementById(id);
        var display = document.getElementById(id + "Display");
        var optionsDiv = document.getElementById(id + "Options");
        var searchInput = document.getElementById(id + "Search");

        hidden.value = "";
        display.textContent = "Seleccionar equipo...";
        display.classList.remove("active");
        optionsDiv.innerHTML = "";

        items.forEach(function (item) {
            var div = document.createElement("div");
            div.className = "combobox-option";
            div.textContent = item;
            div.setAttribute("data-value", item);
            div.onclick = function () { seleccionarCombobox(id, item); };
            optionsDiv.appendChild(div);
        });

        if (agregarOtro) {
            var divOtro = document.createElement("div");
            divOtro.className = "combobox-option";
            divOtro.textContent = "Otro (escribir nombre)";
            divOtro.setAttribute("data-value", "__OTRO__");
            divOtro.onclick = function () { seleccionarCombobox(id, "__OTRO__"); };
            optionsDiv.appendChild(divOtro);
        }

        if (searchInput) searchInput.value = "";
        return;
    }

    var select = document.getElementById(id);
    select.innerHTML = '<option value="" disabled selected>Seleccionar...</option>';
    items.forEach(function (item) {
        var option = document.createElement("option");
        option.value = item;
        option.textContent = item;
        select.appendChild(option);
    });
    if (agregarOtro) {
        var optionOtro = document.createElement("option");
        optionOtro.value = "__OTRO__";
        optionOtro.textContent = "Otro (escribir nombre)";
        select.appendChild(optionOtro);
    }
}

function toggleCombobox(id) {
    var display = document.getElementById(id + "Display");
    var dropdown = document.getElementById(id + "Dropdown");
    var searchInput = document.getElementById(id + "Search");
    var isOpen = dropdown.classList.contains("open");

    cerrarTodosCombobox();

    if (!isOpen) {
        dropdown.classList.add("open");
        display.classList.add("active");
        if (searchInput) {
            searchInput.value = "";
            searchInput.focus();
            filtrarCombobox(id, "");
        }
    }
}

function resetCombobox(id, texto) {
    var hidden = document.getElementById(id);
    var display = document.getElementById(id + "Display");
    var optionsDiv = document.getElementById(id + "Options");
    hidden.value = "";
    display.textContent = texto || "Seleccionar equipo...";
    if (optionsDiv) optionsDiv.innerHTML = "";
}

function filtrarCombobox(id, texto) {
    var options = document.getElementById(id + "Options").children;
    var filtro = texto.toUpperCase();
    for (var i = 0; i < options.length; i++) {
        var valor = options[i].getAttribute("data-value").toUpperCase();
        var label = options[i].textContent.toUpperCase();
        if (filtro === "" || valor.indexOf(filtro) !== -1 || label.indexOf(filtro) !== -1) {
            options[i].style.display = "";
        } else {
            options[i].style.display = "none";
        }
    }
}

function seleccionarCombobox(id, valor) {
    var hidden = document.getElementById(id);
    var display = document.getElementById(id + "Display");
    var dropdown = document.getElementById(id + "Dropdown");

    hidden.value = valor;
    display.textContent = valor === "__OTRO__" ? "Otro (escribir nombre)" : valor;
    display.classList.remove("active");
    dropdown.classList.remove("open");

    hidden.dispatchEvent(new Event("change"));
}

function cerrarTodosCombobox() {
    var combos = ["equipo", "aEquipo"];
    combos.forEach(function (id) {
        var display = document.getElementById(id + "Display");
        var dropdown = document.getElementById(id + "Dropdown");
        if (display) display.classList.remove("active");
        if (dropdown) dropdown.classList.remove("open");
    });
}

document.addEventListener("click", function (e) {
    if (!e.target.closest(".combobox")) {
        cerrarTodosCombobox();
    }
});

function obtenerHora(prefix) {
    prefix = prefix || "";
    var id = prefix === "a" ? "aHora" : prefix === "r" ? "rHora" : "hora";
    var el = document.getElementById(id);
    return el ? (el.value || "") : "";
}

function calcularTurno(hora24) {
    var horas = parseInt(hora24.split(":")[0], 10);
    if (horas >= 8 && horas < 17) return "Diurno";
    if (horas >= 19 && horas < 23) return "Nocturno";
    if (horas >= 23 || horas < 7) return "Madrugada";
    return "Diurno";
}

function generarIdUnico(fecha, hora, sede, equipo, tecnico) {
    return fecha + "|" + hora + "|" + sede + "|" + equipo + "|" + tecnico;
}

function yaEnviado(idUnico) {
    const enviados = JSON.parse(localStorage.getItem("enviadosIds") || "[]");
    return enviados.includes(idUnico);
}

function marcarEnviado(idUnico) {
    const enviados = JSON.parse(localStorage.getItem("enviadosIds") || "[]");
    enviados.push(idUnico);
    localStorage.setItem("enviadosIds", JSON.stringify(enviados));
}

function saveToLocalStorage(registro) {
    const historial = JSON.parse(localStorage.getItem("historialCheckins") || "[]");
    historial.push(registro);
    localStorage.setItem("historialCheckins", JSON.stringify(historial));
}

function fileToImagen(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error("No se pudo leer la imagen."));
        reader.onload = function (e) {
            const img = new Image();
            img.onload = function () {
                const canvas = document.createElement("canvas");
                const MAX = 1280;
                let w = img.width, h = img.height;
                if (w > MAX || h > MAX) {
                    const ratio = Math.min(MAX / w, MAX / h);
                    w = Math.round(w * ratio);
                    h = Math.round(h * ratio);
                }
                canvas.width = w;
                canvas.height = h;
                canvas.getContext("2d").drawImage(img, 0, 0, w, h);
                const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
                resolve({
                    data: dataUrl.split(",")[1],
                    mimeType: "image/jpeg",
                    nombre: file.name || ("foto_" + Date.now() + ".jpg")
                });
            };
            img.onerror = () => reject(new Error("Imagen invalida."));
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

function huellaImagen(img) {
    const s = (img.nombre || "") + "|" + (img.data || "");
    let h = 0;
    for (let i = 0; i < s.length; i++) {
        h = ((h << 5) - h + s.charCodeAt(i)) | 0;
    }
    return "f" + Math.abs(h).toString(36);
}

function getImagenesEnviadas(numero) {
    try {
        const stored = JSON.parse(localStorage.getItem("imagenesAveriaEnviadas") || "{}");
        return stored[numero] || [];
    } catch (err) {
        return [];
    }
}

function guardarImagenEnviada(numero, huella) {
    try {
        const stored = JSON.parse(localStorage.getItem("imagenesAveriaEnviadas") || "{}");
        stored[numero] = stored[numero] || [];
        if (stored[numero].indexOf(huella) === -1) stored[numero].push(huella);
        localStorage.setItem("imagenesAveriaEnviadas", JSON.stringify(stored));
    } catch (err) {}
}

function averiaCerrada(valor) {
    return valor === "Si" || valor === "Falsa averia";
}
