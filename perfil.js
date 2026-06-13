// ==========================================
// MÓDULO DE PERFIL (NAVEGACIÓN UI)
// ==========================================

// 1. NAVEGACIÓN ENTRE SUB-VISTAS
function navegarPerfil(idVistaDestino) {
    // Lista de todas las vistas del perfil
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

// Busca esta función y déjala así:
function cargarDatosBasicosPerfil() {
    if (!usuarioActual) return; 

    const bd = JSON.parse(localStorage.getItem('miInventarioApp')) || {};
    const datosUsuario = bd[usuarioActual];

    if (datosUsuario) {
        document.getElementById('perfil-nombre-usuario').innerText =  usuarioActual;
        
        // NUEVO: Poner el nombre en el input de edición para que el usuario no tenga que reescribirlo
        document.getElementById('perfil-edit-usuario').value = usuarioActual;

        if (datosUsuario.fotoPerfil) {
            document.getElementById('perfil-img').src = datosUsuario.fotoPerfil;
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

// --- EXPORTAR A ARCHIVO .JSON (Versión Pro) ---
async function exportarInventario() {
    let bd = JSON.parse(localStorage.getItem('miInventarioApp')) || {};
    let productos = bd[usuarioActual]?.productos || [];

    if (productos.length === 0) {
        mostrarAlertaCustom("Tu inventario está vacío. No hay nada que exportar.");
        return;
    }

    const dataStr = JSON.stringify(productos, null, 2);
    const fecha = new Date().toLocaleDateString('es-ES').replace(/\//g, '-');
    const nombreArchivo = `Inventario ${fecha}.json`;

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
            return; // Salimos de la función con éxito
        } catch (err) {
            // Si el usuario cancela, no hacemos nada, si hay error, pasamos al plan B
            if (err.name === 'AbortError') return;
            console.warn("El selector moderno falló, usando descarga estándar...", err);
        }
    }

    // 2. Plan B: Descarga estándar (Funciona en iOS y todos los navegadores)
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

// --- IMPORTAR DESDE ARCHIVO .JSON ---
async function importarInventario(event) {
    const file = event.target.files[0];
    if (!file) return;

    const confirmar = await solicitarConfirmacion("¿Estás seguro de cargar este archivo? Esto reemplazará todo tu inventario actual por los datos del archivo.");
    
    if (!confirmar) {
        event.target.value = ""; // Limpiamos el input si se arrepiente
        return;
    }

    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const productosImportados = JSON.parse(e.target.result);
            
            // Validamos que el archivo tenga forma de lista de productos (Array)
            if (!Array.isArray(productosImportados)) {
                throw new Error("Formato inválido.");
            }

            // Inyectamos los productos a la base de datos
            let bd = JSON.parse(localStorage.getItem('miInventarioApp')) || {};
            bd[usuarioActual].productos = productosImportados;
            localStorage.setItem('miInventarioApp', JSON.stringify(bd));

            await mostrarAlertaCustom("¡Inventario importado y restaurado con éxito!");
            
        } catch (error) {
            await mostrarAlertaCustom("Error al leer el archivo. Asegúrate de que sea el archivo .json correcto.");
        }
        event.target.value = ""; // Limpiamos el input
    };
    reader.readAsText(file); // Leemos el archivo como texto
}

// --- COMPARTIR DIRECTO A WHATSAPP/OTRAS APPS ---
async function compartirInventario() {
    let bd = JSON.parse(localStorage.getItem('miInventarioApp')) || {};
    let productos = bd[usuarioActual].productos || [];

    if (productos.length === 0) {
        await mostrarAlertaCustom("No hay productos en el inventario para compartir.");
        return;
    }

    const dataStr = JSON.stringify(productos, null, 2);
    // Creamos el archivo real
    const file = new File([dataStr], `Inventario_Compartido.json`, { type: "application/json" });

    // Verificamos si el navegador del móvil soporta la función nativa de compartir archivos
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
            await navigator.share({
                files: [file],
                title: 'Mi Inventario',
                text: 'Te envío la copia de seguridad de mi inventario.'
            });
        } catch (error) {
            console.log("El usuario canceló o hubo un error al compartir.");
        }
    } else {
        // Si es una PC vieja o un navegador sin soporte
        await mostrarAlertaCustom("Tu dispositivo no soporta compartir archivos directamente desde el navegador. Por favor, usa el botón 'Exportar' para descargarlo y luego envíalo por WhatsApp.");
    }
}

// --- ELIMINAR TODO EL INVENTARIO ---
async function eliminarTodoElInventario() {
    const confirmar = await solicitarConfirmacion("¡ATENCIÓN! ¿Estás absolutamente seguro de que deseas BORRAR TODO tu inventario? Esta acción NO se puede deshacer.");
    
    if (confirmar) {
        let bd = JSON.parse(localStorage.getItem('miInventarioApp')) || {};
        
        // Vaciamos el array de productos
        bd[usuarioActual].productos = [];
        localStorage.setItem('miInventarioApp', JSON.stringify(bd));

        await mostrarAlertaCustom("Todo el inventario ha sido eliminado permanentemente.");
    }
}