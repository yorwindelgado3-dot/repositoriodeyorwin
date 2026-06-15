// ==========================================
// MÓDULO DE PERFIL (NAVEGACIÓN UI)
// ==========================================

// 1. NAVEGACIÓN ENTRE SUB-VISTAS (Modificada para el botón atrás)
function navegarPerfil(idVistaDestino, guardarEnHistorial = true) {
    const vistas = [
        'perfil-vista-principal',
        'perfil-vista-datos',
        'perfil-vista-inventario',
        'perfil-vista-empresa'
    ];

    // Ocultamos todas
    vistas.forEach(id => {
        const elemento = document.getElementById(id);
        if (elemento) {
            elemento.style.display = 'none';
        }
    });

    // Mostramos solo la solicitada
    const vistaActiva = document.getElementById(idVistaDestino);
    if (vistaActiva) {
        vistaActiva.style.display = 'flex';
    }

    // Guardamos en el historial del teléfono
    if (guardarEnHistorial) {
        if (!window.history.state || window.history.state.subVistaPerfil !== idVistaDestino) {
            history.pushState({ pestana: 'tab-perfil', subVistaPerfil: idVistaDestino }, "", "");
        }
    }
}

// 2. INICIALIZAR EL MÓDULO DE PERFIL
function inicializarPerfil() {
    // Nota: No necesitamos ocultar las pestañas aquí porque 
    // tu función cambiarPestana() ya hace ese trabajo perfectamente.

    // 1. Asegurarnos de que siempre abra en el menú principal del perfil
    navegarPerfil('perfil-vista-principal');

    // 2. Cargar el nombre del usuario logueado
    cargarDatosBasicosPerfil();
}

function cargarDatosBasicosPerfil() {
    if (!usuarioActual) return; 

    const bd = JSON.parse(localStorage.getItem('miInventarioApp')) || {};
    const datosUsuario = bd[usuarioActual];

    if (datosUsuario) {
        document.getElementById('perfil-nombre-usuario').innerText =  usuarioActual;
        document.getElementById('perfil-edit-usuario').value = usuarioActual;

        // LA SOLUCIÓN: Condicional completo (Si tiene foto la pone, si no, la resetea)
        if (datosUsuario.fotoPerfil) {
            document.getElementById('perfil-img').src = datosUsuario.fotoPerfil;
        } else {
            // Inyectamos el SVG por defecto que tenías en tu HTML
            document.getElementById('perfil-img').src = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23ccc'><path d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/></svg>";
        }
    }
}

// ==========================================
// 4. LÓGICA DE FOTO DE PERFIL
// ==========================================
function cambiarFotoPerfil(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const dataURL = e.target.result;
        
        // Actualizamos la imagen en la pantalla
        document.getElementById('perfil-img').src = dataURL;

        // Guardamos la imagen (convertida a texto base64) en la base de datos
        let bd = JSON.parse(localStorage.getItem('miInventarioApp')) || {};
        if (bd[usuarioActual]) {
            bd[usuarioActual].fotoPerfil = dataURL;
            localStorage.setItem('miInventarioApp', JSON.stringify(bd));
        }
    };
    reader.readAsDataURL(file); // Leemos la imagen
}

// ==========================================
// 5. LÓGICA DE DATOS DEL USUARIO
// ==========================================
async function guardarDatosUsuario() {
    const nuevoUser = document.getElementById('perfil-edit-usuario').value.trim();
    const claveVieja = document.getElementById('perfil-edit-clave-vieja').value.trim();
    const claveNueva = document.getElementById('perfil-edit-clave-nueva').value.trim();

    if (!nuevoUser || !claveVieja || !claveNueva) {
        await mostrarAlertaCustom("Por favor, completa todos los campos para actualizar tus datos.");
        return;
    }

    let bd = JSON.parse(localStorage.getItem('miInventarioApp')) || {};
    const datosActuales = bd[usuarioActual];

    // Validamos que se sepa su clave actual
    if (datosActuales.clave !== claveVieja) {
        await mostrarAlertaCustom("La contraseña actual es incorrecta.");
        return;
    }

    // Lógica por si quiere cambiarse el nombre de usuario
    if (nuevoUser !== usuarioActual) {
        // Verificamos que el nuevo nombre no esté ocupado por otro registro
        if (bd[nuevoUser]) {
            await mostrarAlertaCustom("Ese nombre de usuario ya está en uso. Elige otro por favor.");
            return;
        }
        
        // Creamos la nueva cuenta copiando los datos de la vieja
        bd[nuevoUser] = { ...datosActuales };
        // Eliminamos la vieja
        delete bd[usuarioActual];
        
        // Actualizamos la sesión activa
        usuarioActual = nuevoUser;
        sessionStorage.setItem('usuarioLogueado', nuevoUser);
        document.getElementById('perfil-nombre-usuario').innerText =  nuevoUser;
    }

    // Actualizamos la clave
    bd[usuarioActual].clave = claveNueva;
    localStorage.setItem('miInventarioApp', JSON.stringify(bd));

    // Limpiamos los campos de contraseñas por seguridad
    document.getElementById('perfil-edit-clave-vieja').value = "";
    document.getElementById('perfil-edit-clave-nueva').value = "";

    await mostrarAlertaCustom("¡Tus datos se han actualizado correctamente!");
    navegarPerfil('perfil-vista-principal'); // Regresamos al menú
}

// ==========================================
// 6. GESTIÓN DE INVENTARIO (EXPORTAR, IMPORTAR, COMPARTIR, ELIMINAR)
// ==========================================

// --- EXPORTAR A ARCHIVO .JSON (Versión Pro con Estadísticas) ---
async function exportarInventario() {
    let bd = JSON.parse(localStorage.getItem('miInventarioApp')) || {};
    let productos = bd[usuarioActual]?.productos || [];
    let ventas = bd[usuarioActual]?.historialVentas || [];

    if (productos.length === 0 && ventas.length === 0) {
        mostrarAlertaCustom("Tu inventario y estadísticas están vacíos. No hay nada que exportar.");
        return;
    }

    // AHORA EMPAQUETAMOS TODO (Productos + Ventas)
    const datosRespaldo = {
        productos: productos,
        historialVentas: ventas
    };

    const dataStr = JSON.stringify(datosRespaldo, null, 2);
    const fecha = new Date().toLocaleDateString('es-ES').replace(/\//g, '-');
    const nombreArchivo = `Inventario_Completo_${fecha}.json`;

    // 1. Intentamos usar el selector moderno (File System Access API)
    if ('showSaveFilePicker' in window) {
        try {
            const handle = await window.showSaveFilePicker({
                suggestedName: nombreArchivo,
                types: [{
                    description: 'Archivo JSON',
                    accept: { 'application/json': ['.json'] },
                }],
            });

            const writable = await handle.createWritable();
            await writable.write(dataStr);
            await writable.close();
            
            mostrarAlertaCustom("¡Guardado correctamente en la ubicación seleccionada!");
            return; 
        } catch (err) {
            if (err.name === 'AbortError') return;
            console.warn("El selector moderno falló, usando descarga estándar...", err);
        }
    }

    // 2. Plan B: Descarga estándar
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombreArchivo;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    mostrarAlertaCustom("Exportación exitosa. Revisa tu carpeta de Descargas.");
}

// --- IMPORTAR DESDE ARCHIVO .JSON (Soporta formato viejo y nuevo) ---
async function importarInventario(event) {
    const file = event.target.files[0];
    if (!file) return;

    const confirmar = await solicitarConfirmacion("¿Estás seguro? Esto reemplazará TODO tu inventario actual y tus estadísticas de ventas por los datos del archivo.");
    
    if (!confirmar) {
        event.target.value = ""; 
        return;
    }

    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const datosImportados = JSON.parse(e.target.result);
            let bd = JSON.parse(localStorage.getItem('miInventarioApp')) || {};

            // LÓGICA DE COMPATIBILIDAD
            if (Array.isArray(datosImportados)) {
                // Es un archivo viejo (solo traía lista de productos)
                bd[usuarioActual].productos = datosImportados;
                bd[usuarioActual].historialVentas = []; // Reiniciamos las estadísticas porque el archivo no traía
            } else if (datosImportados.productos && Array.isArray(datosImportados.productos)) {
                // Es un archivo nuevo (trae productos y ventas)
                bd[usuarioActual].productos = datosImportados.productos;
                bd[usuarioActual].historialVentas = datosImportados.historialVentas || [];
            } else {
                throw new Error("Formato inválido.");
            }

            // Guardamos en la base de datos
            localStorage.setItem('miInventarioApp', JSON.stringify(bd));

            // Actualizamos los gráficos si el módulo de estadísticas estaba inicializado
            if (typeof renderizarEstadisticas === 'function') {
                renderizarEstadisticas();
            }

            await mostrarAlertaCustom("¡Inventario y estadísticas importados con éxito!");
            
        } catch (error) {
            await mostrarAlertaCustom("Error al leer el archivo. Asegúrate de que sea el archivo .json correcto.");
        }
        event.target.value = ""; 
    };
    reader.readAsText(file); 
}

// --- COMPARTIR DIRECTO A WHATSAPP/OTRAS APPS (Mejorado para compatibilidad móvil) ---
async function compartirInventario() {
    let bd = JSON.parse(localStorage.getItem('miInventarioApp')) || {};
    let productos = bd[usuarioActual]?.productos || [];
    let ventas = bd[usuarioActual]?.historialVentas || [];

    if (productos.length === 0 && ventas.length === 0) {
        await mostrarAlertaCustom("No hay datos en el inventario para compartir.");
        return;
    }

    try {
        // Empaquetamos todo
        const datosRespaldo = {
            productos: productos,
            historialVentas: ventas
        };

        const dataStr = JSON.stringify(datosRespaldo, null, 2);
        
        // TRUCO VITAL: Usamos formato .txt (text/plain) porque Android/iOS 
        // bloquean el envío directo de archivos .json a apps como WhatsApp.
        const file = new File([dataStr], "Inventario_Respaldo.txt", { type: "text/plain" });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
            // Plan A: Compartir como archivo adjunto de texto
            await navigator.share({
                files: [file],
                title: 'Respaldo de Inventario',
                text: 'Te envío la copia de seguridad de mi inventario y estadísticas.'
            });
        } else if (navigator.share) {
            // Plan B: Si el teléfono no deja compartir archivos, pasamos el JSON como texto plano en el mensaje
            await navigator.share({
                title: 'Respaldo de Inventario',
                text: dataStr
            });
        } else {
            await mostrarAlertaCustom("Tu dispositivo no soporta compartir archivos directamente. Usa el botón 'Exportar'.");
        }
    } catch (error) {
        // Ignoramos el error si simplemente el usuario presionó "Cancelar" en el menú de compartir
        if (error.name !== 'AbortError') {
            console.error("Error técnico al compartir:", error);
            await mostrarAlertaCustom("Tu dispositivo bloqueó la acción de compartir. Por favor, usa el botón 'Exportar' para descargar el archivo.");
        }
    }
}

// --- ELIMINAR TODO EL INVENTARIO (Ahora también borra las estadísticas) ---
async function eliminarTodoElInventario() {
    const confirmar = await solicitarConfirmacion("¡ATENCIÓN! ¿Estás absolutamente seguro de que deseas BORRAR TODO tu inventario y estadísticas de ventas? Esta acción NO se puede deshacer.");
    
    if (confirmar) {
        let bd = JSON.parse(localStorage.getItem('miInventarioApp')) || {};
        
        // Vaciamos ambas cosas
        bd[usuarioActual].productos = [];
        bd[usuarioActual].historialVentas = [];
        localStorage.setItem('miInventarioApp', JSON.stringify(bd));

        if (typeof renderizarEstadisticas === 'function') {
            renderizarEstadisticas();
        }

        await mostrarAlertaCustom("Todo el inventario y las estadísticas han sido eliminados permanentemente.");
    }
}