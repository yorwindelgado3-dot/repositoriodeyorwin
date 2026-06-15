// --- MÓDULO 3: GESTIÓN DE PRODUCTOS Y ESCÁNER ---

let lectorActivo = false;
let html5QrCode;

// --- FUNCIÓN AUXILIAR: VENTANA EMERGENTE PERSONALIZADA ---
function mostrarConfirmacionCustom(titulo, mensaje) {
    return new Promise((resolve) => {
        // Contenedor principal oscuro
        const modalOverlay = document.createElement("div");
        modalOverlay.style.cssText = "position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 9999; animation: fadeIn 0.3s ease;";

        // Caja blanca del mensaje
        const modalBox = document.createElement("div");
        modalBox.style.cssText = "background-color: #ffffff; padding: 25px; border-radius: 15px; width: 90%; max-width: 350px; box-shadow: 0 10px 25px rgba(0,0,0,0.2); text-align: center; font-family: 'Segoe UI', sans-serif;";

        const titleEl = document.createElement("h3");
        titleEl.innerText = titulo;
        titleEl.style.cssText = "margin: 0 0 10px 0; color: #333; font-size: 18px;";

        const msgEl = document.createElement("p");
        msgEl.innerText = mensaje;
        msgEl.style.cssText = "margin: 0 0 20px 0; color: #555; font-size: 15px; line-height: 1.5;";

        // Contenedor de botones
        const btnContainer = document.createElement("div");
        btnContainer.style.cssText = "display: flex; justify-content: space-between; gap: 10px;";

        const btnCancel = document.createElement("button");
        btnCancel.innerText = "Cancelar";
        btnCancel.style.cssText = "flex: 1; padding: 12px; border: none; border-radius: 8px; background-color: #dc3545; color: white; font-weight: bold; cursor: pointer; font-size: 14px;";
        btnCancel.onclick = () => {
            document.body.removeChild(modalOverlay);
            resolve(false);
        };

        const btnConfirm = document.createElement("button");
        btnConfirm.innerText = "Sumar Stock";
        btnConfirm.style.cssText = "flex: 1; padding: 12px; border: none; border-radius: 8px; background-color: #007bff; color: white; font-weight: bold; cursor: pointer; font-size: 14px;";
        btnConfirm.onclick = () => {
            document.body.removeChild(modalOverlay);
            resolve(true);
        };

        // Ensamblar la ventana
        btnContainer.appendChild(btnCancel);
        btnContainer.appendChild(btnConfirm);
        modalBox.appendChild(titleEl);
        modalBox.appendChild(msgEl);
        modalBox.appendChild(btnContainer);
        modalOverlay.appendChild(modalBox);

        document.body.appendChild(modalOverlay);
    });
}

// --- 1. FUNCIÓN DE LA CÁMARA ---
function toggleCamara() {
    const divCamara = document.getElementById("lector-camara");
    const btnCamara = document.getElementById("btn-camara");

    if (!html5QrCode) {
        html5QrCode = new Html5Qrcode("lector-camara");
    }

    if (lectorActivo) {
        html5QrCode.stop().then(() => {
            divCamara.style.display = "none";
            btnCamara.style.backgroundColor = "#000"; 
            lectorActivo = false;
        }).catch(err => console.log("Error al detener cámara", err));
    } else {
        divCamara.style.display = "block";
        
        html5QrCode.start(
            { facingMode: "environment" }, 
            {
                fps: 10,
                qrbox: { width: 250, height: 100 },
                aspectRatio: 1.33,
                showTorchButtonIfSupported: true
            },
            (textoEscaneado) => {
                document.getElementById("prodCodigo").value = textoEscaneado;
                document.getElementById("prodCodigo").style.backgroundColor = "#d4edda";
                setTimeout(() => { document.getElementById("prodCodigo").style.backgroundColor = "#fff"; }, 500);
                
                toggleCamara();
            },
            (mensajeError) => { /* Silenciar errores */ }
        ).then(() => {
            btnCamara.style.backgroundColor = "#dc3545"; 
            lectorActivo = true;
        }).catch(err => {
            alert("Error al iniciar cámara. Revisa los permisos.");
            divCamara.style.display = "none";
        });
    }
}

// --- 2. FUNCIÓN: Muestra u oculta la fecha según la categoría ---
function verificarCategoria() {
    const categoriaSelect = document.getElementById("prodCategoria").value;
    const divVencimiento = document.getElementById("divVencimiento");
    
    const sinVencimiento = ["CAT-LICO", "CAT-LIMP", "CAT-OTRO", ""];
    
    if (sinVencimiento.includes(categoriaSelect)) {
        divVencimiento.style.display = "none";
        document.getElementById("prodVencimiento").value = ""; 
    } else {
        divVencimiento.style.display = "block"; 
    }
}

// --- 3. FUNCIÓN: Guardar el producto (AHORA ES ASÍNCRONA PARA ESPERAR EL MODAL) ---
async function agregarProducto() {
    const usuarioLogueado = sessionStorage.getItem('usuarioLogueado') || (typeof usuarioActual !== 'undefined' ? usuarioActual : "");

    if (!usuarioLogueado) {
        alert("Error: Debes iniciar sesión primero.");
        return;
    }

    const codigoInput = document.getElementById("prodCodigo");
    let codigo = codigoInput.value.trim();
    const nombre = document.getElementById("prodNombre").value.trim();
    const precio = parseFloat(document.getElementById("prodPrecio").value);
    const stock = parseInt(document.getElementById("prodStock").value);
    
    const categoriaId = document.getElementById("prodCategoria").value;
    const vencimiento = document.getElementById("prodVencimiento").value || null; 
    const msj = document.getElementById("msjAgregar");

    // --- NUEVA VALIDACIÓN DE FECHA OBLIGATORIA CON CUADRO BONITO ---
    const categoriasConVencimiento = ["CAT-ALIM", "CAT-BEBI", "CAT-CONF"];
    
    if (categoriasConVencimiento.includes(categoriaId) && !vencimiento) {
        // Usa la alerta personalizada que creamos previamente
        if (typeof mostrarAlertaCustom === 'function') {
            await mostrarAlertaCustom("Esta categoría requiere obligatoriamente una fecha de vencimiento para ser ingresada al inventario.");
        } else {
            msj.innerText = "Error: Falta la fecha de vencimiento.";
            msj.style.color = "red";
        }
        return; // Detiene la ejecución para que no se guarde
    }
    // ---------------------------------------------------------------

    if (!nombre || isNaN(precio) || isNaN(stock) || categoriaId === "") {
        msj.innerText = "Completa todos los campos.";
        msj.style.color = "red";
        return;
    }

    if (!codigo) {
        codigo = "PROD-" + Date.now();
    }

    let db = JSON.parse(localStorage.getItem('miInventarioApp')) || {};
    
    if (!db[usuarioLogueado].productos) {
        db[usuarioLogueado].productos = [];
    }

    const productosExistentes = db[usuarioLogueado].productos.filter(p => p.id === codigo);

    if (productosExistentes.length > 0) {
        const existeEnOtraCategoria = productosExistentes.some(p => p.categoriaId !== categoriaId);
        if (existeEnOtraCategoria) {
            msj.innerText = "Error: Este código de barras ya pertenece a otra categoría.";
            msj.style.color = "red";
            return;
        }

        // Llama a la ventana bonita en lugar del confirm() del navegador
        const confirmar = await mostrarConfirmacionCustom(
            "Producto Registrado", 
            `El producto "${productosExistentes[0].nombre}" ya existe en la base de datos.\n\n¿Deseas sumar ${stock} unidades al inventario?`
        );
        
        if (!confirmar) {
            msj.innerText = "Proceso cancelado.";
            msj.style.color = "orange";
            return;
        }

        const loteMismaFecha = productosExistentes.find(p => p.fechaVencimiento === vencimiento);

        if (loteMismaFecha) {
            loteMismaFecha.stock += stock;
            loteMismaFecha.precio = precio; 
            msj.innerText = "¡Stock sumado al producto existente!";
        } else {
            const nuevoLote = {
                id: codigo,
                nombre: nombre,
                precio: precio,
                stock: stock,
                categoriaId: categoriaId,            
                fechaVencimiento: vencimiento, 
                fechaRegistro: new Date().toISOString()
            };
            db[usuarioLogueado].productos.push(nuevoLote);
            msj.innerText = "¡Nuevo lote guardado con fecha distinta!";
        }
        
        msj.style.color = "green";

    } else {
        const nuevoProducto = {
            id: codigo,
            nombre: nombre,
            precio: precio,
            stock: stock,
            categoriaId: categoriaId,            
            fechaVencimiento: vencimiento, 
            fechaRegistro: new Date().toISOString()
        };
        db[usuarioLogueado].productos.push(nuevoProducto);
        
        msj.innerText = "¡Producto guardado exitosamente!";
        msj.style.color = "green";
    }

    localStorage.setItem('miInventarioApp', JSON.stringify(db));

    codigoInput.value = "";
    document.getElementById("prodNombre").value = "";
    document.getElementById("prodPrecio").value = "";
    document.getElementById("prodStock").value = "";
    document.getElementById("prodCategoria").value = "";
    document.getElementById("prodVencimiento").value = "";
    document.getElementById("divVencimiento").style.display = "none"; 
    
    codigoInput.focus();
    setTimeout(() => { msj.innerText = ""; }, 3000);
}

// --- 4. FUNCIÓN: ABRIR MODAL DE EDICIÓN DE PRODUCTO ---
function abrirModalEdicion(codigo, fechaVenc) {
    const usuarioLogueado = sessionStorage.getItem('usuarioLogueado') || "";
    if (!usuarioLogueado) return;

    let db = JSON.parse(localStorage.getItem('miInventarioApp')) || {};
    let productos = db[usuarioLogueado].productos || [];

    // Buscar el producto exacto por código y fecha de vencimiento
    let index = productos.findIndex(p => p.id === codigo && (p.fechaVencimiento || '') === (fechaVenc || ''));
    
    if (index === -1) {
        alert("Error: No se encontró el producto en la base de datos.");
        return;
    }

    let prod = productos[index];

    // --- NUEVO: Limpieza preventiva (por si el popstate lo ocultó previamente) ---
    const modalAnterior = document.getElementById("modal-editar-producto");
    if (modalAnterior) {
        modalAnterior.remove();
    }

    // --- NUEVO: Registramos la apertura del modal en el historial del teléfono ---
    history.pushState({ modal: "editar-producto" }, "", "");

    // Crear el fondo oscuro del modal
    const modalOverlay = document.createElement("div");
    modalOverlay.id = "modal-editar-producto"; // Añadido para que el popstate lo encuentre
    modalOverlay.className = "modal-overlay activo"; // Añadido para mantener el estándar visual
    modalOverlay.style.cssText = "position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 9999; animation: fadeIn 0.3s ease;";

    // Crear la caja blanca del formulario
    const modalBox = document.createElement("div");
    modalBox.style.cssText = "background-color: white; padding: 20px; border-radius: 15px; width: 90%; max-width: 350px; max-height: 90vh; overflow-y: auto; box-shadow: 0 10px 25px rgba(0,0,0,0.2); font-family: 'Segoe UI', sans-serif; display: flex; flex-direction: column; gap: 8px;";

    modalBox.innerHTML = `
        <h3 style="margin: 0 0 10px 0; text-align: center; color: #333; font-size: 18px;">Editar Producto</h3>
        
        <label style="font-size: 13px; color: #555; font-weight: bold;">Nombre del Producto:</label>
        <input type="text" id="editNombre" value="${prod.nombre}" style="padding: 8px; border-radius: 8px; border: 1px solid #ccc; font-size: 14px;">
        
        <label style="font-size: 13px; color: #555; font-weight: bold;">Categoría:</label>
        <select id="editCategoria" style="padding: 8px; border-radius: 8px; border: 1px solid #ccc; font-size: 14px; background-color: white;">
            <option value="CAT-ALIM" ${prod.categoriaId === 'CAT-ALIM' ? 'selected' : ''}>Alimentos</option>
            <option value="CAT-BEBI" ${prod.categoriaId === 'CAT-BEBI' ? 'selected' : ''}>Bebidas</option>
            <option value="CAT-CONF" ${prod.categoriaId === 'CAT-CONF' ? 'selected' : ''}>Confitería</option>
            <option value="CAT-LICO" ${prod.categoriaId === 'CAT-LICO' ? 'selected' : ''}>Licores</option>
            <option value="CAT-LIMP" ${prod.categoriaId === 'CAT-LIMP' ? 'selected' : ''}>Limpieza</option>
            <option value="CAT-OTRO" ${prod.categoriaId === 'CAT-OTRO' ? 'selected' : ''}>Otros</option>
        </select>

        <label style="font-size: 13px; color: #555; font-weight: bold;">Fecha de Vencimiento:</label>
        <input type="date" id="editVencimiento" value="${prod.fechaVencimiento || ''}" style="padding: 8px; border-radius: 8px; border: 1px solid #ccc; font-size: 14px;">

        <label style="font-size: 13px; color: #555; font-weight: bold;">Precio ($):</label>
        <input type="number" step="0.01" id="editPrecio" value="${prod.precio}" style="padding: 8px; border-radius: 8px; border: 1px solid #ccc; font-size: 14px;">
        
        <label style="font-size: 13px; color: #555; font-weight: bold;">Stock Actual:</label>
        <input type="number" id="editStock" value="${prod.stock}" style="padding: 8px; border-radius: 8px; border: 1px solid #ccc; font-size: 14px;">
        
        <div style="display: flex; justify-content: space-between; gap: 8px; margin-top: 15px;">
            <button id="btnEliminarProd" style="flex: 1; padding: 10px; border: none; border-radius: 8px; background-color: #dc3545; color: white; font-weight: bold; cursor: pointer; font-size: 13px;">Eliminar</button>
            <button id="btnCancelarEdicion" style="flex: 1; padding: 10px; border: none; border-radius: 8px; background-color: #6c757d; color: white; font-weight: bold; cursor: pointer; font-size: 13px;">Cancelar</button>
            <button id="btnGuardarEdicion" style="flex: 1; padding: 10px; border: none; border-radius: 8px; background-color: #007bff; color: white; font-weight: bold; cursor: pointer; font-size: 13px;">Guardar</button>
        </div>
    `;

    modalOverlay.appendChild(modalBox);
    document.body.appendChild(modalOverlay);

    // --- NUEVO: Función auxiliar para cerrar y sincronizar el historial ---
    const cerrarModalLimpiamente = () => {
        if (document.body.contains(modalOverlay)) {
            document.body.removeChild(modalOverlay);
        }
        // Si el usuario cerró tocando el botón (y no la flecha de Android), descontamos el historial
        if (window.history.state && window.history.state.modal === "editar-producto") {
            history.back();
        }
    };

    // Lógica para bloquear la fecha si la categoría no requiere vencimiento
    const selectCat = document.getElementById("editCategoria");
    const inputVenc = document.getElementById("editVencimiento");
    const sinVencimiento = ["CAT-LICO", "CAT-LIMP", "CAT-OTRO"];

    const revisarCategoriaEdicion = () => {
        if (sinVencimiento.includes(selectCat.value)) {
            inputVenc.value = "";
            inputVenc.disabled = true;
            inputVenc.style.backgroundColor = "#e9ecef";
        } else {
            inputVenc.disabled = false;
            inputVenc.style.backgroundColor = "#fff";
        }
    };
    
    // Ejecutar al abrir y al cambiar
    revisarCategoriaEdicion();
    selectCat.addEventListener("change", revisarCategoriaEdicion);

    // --- ACCIONES DE LOS BOTONES ---

    // Botón Cancelar
    document.getElementById("btnCancelarEdicion").onclick = () => {
        cerrarModalLimpiamente();
    };

    // Botón Guardar
    document.getElementById("btnGuardarEdicion").onclick = async () => {
        const nuevoNombre = document.getElementById("editNombre").value.trim();
        const nuevaCat = selectCat.value;
        const nuevaFecha = inputVenc.value;
        const nuevoPrecio = parseFloat(document.getElementById("editPrecio").value);
        const nuevoStock = parseInt(document.getElementById("editStock").value);

        const categoriasConVencimiento = ["CAT-ALIM", "CAT-BEBI", "CAT-CONF"];
        
        // --- VALIDACIÓN CON CUADRO BONITO ---
        if (categoriasConVencimiento.includes(nuevaCat) && !nuevaFecha) {
            await mostrarAlertaCustom("Esta categoría requiere obligatoriamente una fecha de vencimiento.");
            return;
        }

        if (!nuevoNombre || isNaN(nuevoPrecio) || isNaN(nuevoStock)) {
            await mostrarAlertaCustom("Por favor, completa Nombre, Precio y Stock correctamente.");
            return;
        }

        // Actualizamos los datos
        prod.nombre = nuevoNombre;
        prod.categoriaId = nuevaCat;
        prod.fechaVencimiento = nuevaFecha || null;
        prod.precio = nuevoPrecio;
        prod.stock = nuevoStock;

        // Guardamos
        db[usuarioLogueado].productos[index] = prod;
        localStorage.setItem('miInventarioApp', JSON.stringify(db));
        
        cerrarModalLimpiamente();
        
        if (typeof cargarProductosDeCategoria === 'function') {
            cargarProductosDeCategoria();
        }
    };

    // Botón Eliminar
    document.getElementById("btnEliminarProd").onclick = async () => {
        const confirmar = await solicitarConfirmacion(`¿Estás seguro de que deseas eliminar "${prod.nombre}" permanentemente?`);
        
        if (confirmar) {
            // 1. Recargamos la base de datos fresca
            const bdActualizada = JSON.parse(localStorage.getItem('miInventarioApp'));
            
            // 2. Definimos el ID y la fecha del lote que queremos eliminar
            const idAEliminar = prod.id; 
            const fechaAEliminar = prod.fechaVencimiento || ''; 
            
            // 3. Filtramos usando 'id' Y 'fechaVencimiento'
            bdActualizada[usuarioLogueado].productos = bdActualizada[usuarioLogueado].productos.filter(p => {
                const fechaP = p.fechaVencimiento || '';
                return p.id !== idAEliminar || fechaP !== fechaAEliminar;
            });
            
            // 4. Guardamos la base de datos limpia
            localStorage.setItem('miInventarioApp', JSON.stringify(bdActualizada));
            
            // 5. Cierre y refresco
            cerrarModalLimpiamente();
            
            if (typeof cargarProductosDeCategoria === 'function') {
                cargarProductosDeCategoria();
            }
            
            if (typeof buscarEnVentas === 'function') {
                document.getElementById("dropdown-ventas").style.display = "none";
            }
        }
    };
}

function mostrarAlertaCustom(mensaje) {
    return new Promise((resolve) => {
        const overlay = document.createElement("div");
        overlay.style.cssText = "position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 10000;";

        const box = document.createElement("div");
        box.style.cssText = "background-color: white; padding: 20px; border-radius: 15px; width: 80%; max-width: 300px; text-align: center; box-shadow: 0 10px 25px rgba(0,0,0,0.3); font-family: sans-serif;";

        box.innerHTML = `
            <p style="margin: 0 0 20px 0; color: #333; font-size: 16px;">${mensaje}</p>
            <button id="btnAceptarAlerta" style="width: 100%; padding: 12px; border: none; border-radius: 8px; background-color: #007bff; color: white; font-weight: bold; cursor: pointer;">Aceptar</button>
        `;

        overlay.appendChild(box);
        document.body.appendChild(overlay);

        document.getElementById("btnAceptarAlerta").onclick = () => {
            document.body.removeChild(overlay);
            resolve();
        };
    });
}

function solicitarConfirmacion(mensaje) {
    return new Promise((resolve) => {
        const overlay = document.createElement("div");
        overlay.style.cssText = "position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 10000;";

        const box = document.createElement("div");
        box.style.cssText = "background-color: white; padding: 25px; border-radius: 15px; width: 80%; max-width: 320px; text-align: center; box-shadow: 0 10px 25px rgba(0,0,0,0.3); font-family: sans-serif;";

        box.innerHTML = `
            <p style="margin: 0 0 20px 0; color: #333; font-size: 16px; font-weight: bold;">${mensaje}</p>
            <div style="display: flex; gap: 10px;">
                <button id="btnNo" style="flex: 1; padding: 10px; border: none; border-radius: 8px; background-color: #6c757d; color: white; cursor: pointer;">Cancelar</button>
                <button id="btnSi" style="flex: 1; padding: 10px; border: none; border-radius: 8px; background-color: #dc3545; color: white; cursor: pointer;">Eliminar</button>
            </div>
        `;

        overlay.appendChild(box);
        document.body.appendChild(overlay);

        document.getElementById("btnSi").onclick = () => {
            document.body.removeChild(overlay);
            resolve(true);
        };
        document.getElementById("btnNo").onclick = () => {
            document.body.removeChild(overlay);
            resolve(false);
        };
    });
}