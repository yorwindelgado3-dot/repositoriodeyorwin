let carrito = [];
let productoEnSeleccion = null;
let escannerVentasActivo = false;
let html5QrCodeVentas = null;

// --- FUNCIÓN DETECTIVE PARA EL CÓDIGO ---
// Esto arregla los 4 errores buscando el código sin importar cómo lo guardaste en tu BD
function obtenerCodigoReal(prod) {
    return prod.codigo || prod.codigoBarra || prod.codigo_barra || prod.cod || prod.id || "SIN_CODIGO";
}

function buscarEnVentas() {
    const input = document.getElementById("input-busqueda-venta").value.toLowerCase();
    const dropdown = document.getElementById("dropdown-ventas");
    dropdown.innerHTML = "";

    if (input.trim() === "") {
        dropdown.style.display = "none";
        return;
    }

    const bd = JSON.parse(localStorage.getItem('miInventarioApp')) || {};
    if (!bd[usuarioActual] || !bd[usuarioActual].productos) return;

    const productos = bd[usuarioActual].productos;
    
    // 1. Buscar coincidencias
    const coincidencias = productos.filter(p => {
        const nombreSeguro = p.nombre ? p.nombre.toLowerCase() : "";
        const codigoReal = obtenerCodigoReal(p).toLowerCase();
        return nombreSeguro.includes(input) || codigoReal.includes(input);
    });

    // 2. AGRUPAR POR CÓDIGO (Sumamos el stock de todos los lotes)
    const productosAgrupados = {};
    coincidencias.forEach(p => {
        const cod = obtenerCodigoReal(p);
        if (!productosAgrupados[cod]) {
            // Si es la primera vez que vemos este código, lo copiamos e iniciamos su stockTotal
            productosAgrupados[cod] = { ...p, stockTotal: 0 };
        }
        // Le sumamos el stock de este lote al acumulado general
        productosAgrupados[cod].stockTotal += (parseInt(p.stock) || 0);
    });

    // Convertimos el objeto agrupado de nuevo en una lista
    const listaAgrupada = Object.values(productosAgrupados);

    if (listaAgrupada.length > 0) {
        dropdown.style.display = "flex";
        listaAgrupada.forEach(p => {
            const codigoReal = obtenerCodigoReal(p);
            const stock = p.stockTotal; // Usamos la suma total de los lotes
            
            // Lógica de alerta
            const esStockBajo = stock <= 5;
            const estiloStock = esStockBajo ? "color: red; font-weight: bold;" : "color: #888;";
            const textoAviso = esStockBajo ? ` | Stock Total: ${stock}` : ` | Stock Total: ${stock}`;

            const div = document.createElement("div");
            div.className = "dropdown-item";
            div.innerHTML = `
                <div>
                    <div style="font-weight: bold; color: #333;">${p.nombre}</div>
                    <div style="font-size: 12px; ${estiloStock}">Cod: ${codigoReal} ${textoAviso}</div>
                </div>
            `;
            
            div.onclick = () => {
                document.getElementById("input-busqueda-venta").value = "";
                dropdown.style.display = "none";
                abrirModalCantidad(p);
            };
            dropdown.appendChild(div);
        });
    } else {
        dropdown.style.display = "none";
    }
}

// --- 2. GESTIÓN DEL MODAL DE CANTIDAD ---
function abrirModalCantidad(producto, cantidadActual = 1) {
    productoEnSeleccion = producto;
    document.getElementById("titulo-modal-cantidad").innerText = producto.nombre;
    document.getElementById("inCantidadVenta").value = cantidadActual;
    document.getElementById("modal-cantidad").classList.add("activo");
}

function cerrarModalCantidad() {
    document.getElementById("modal-cantidad").classList.remove("activo");
    productoEnSeleccion = null;
}

function confirmarCantidad() {
    const cant = parseInt(document.getElementById("inCantidadVenta").value);
    if (isNaN(cant) || cant <= 0) return;

    const codigoProducto = obtenerCodigoReal(productoEnSeleccion);
    
    // Ahora busca por el código correcto
    const existeIndex = carrito.findIndex(p => p.codigoCarrito === codigoProducto);
    
    if (existeIndex >= 0) {
        carrito[existeIndex].cantidad = cant; 
    } else {
        // Guardamos un "codigoCarrito" estándar para que los botones funcionen siempre
        carrito.push({ ...productoEnSeleccion, codigoCarrito: codigoProducto, cantidad: cant });
    }

    cerrarModalCantidad();
    renderizarCarrito();
}

// --- 3. DIBUJAR CARRITO Y CALCULAR TOTALES ---
function renderizarCarrito() {
    const contenedor = document.getElementById("contenedor-carrito");
    contenedor.innerHTML = "";
    
    let totalUSD = 0;
    
    carrito.forEach((item, index) => {
        const subtotalUSD = item.precio * item.cantidad;
        totalUSD += subtotalUSD;
        
        const subtotalBs = subtotalUSD * tasaGlobal;

        contenedor.innerHTML += `
            <div class="item-carrito">
                <div class="item-info-carrito">
                    <h4>${item.nombre} (x${item.cantidad})</h4>
                    <p>$${subtotalUSD.toFixed(2)} | ${subtotalBs.toFixed(2)} Bs</p>
                </div>
                <div class="item-acciones">
                    <button class="btn-accion-carrito btn-editar-c" onclick="editarItemCarrito('${item.codigoCarrito}')">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    </button>
                    <button class="btn-accion-carrito btn-eliminar-c" onclick="eliminarItemCarrito('${item.codigoCarrito}')">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                </div>
            </div>
        `;
    });

    const totalBs = totalUSD * tasaGlobal;
    document.getElementById("txt-total-dolares").innerText = totalUSD.toFixed(2);
    document.getElementById("txt-total-bs").innerText = totalBs.toFixed(2);
}

function eliminarItemCarrito(codigo) {
    carrito = carrito.filter(p => p.codigoCarrito !== codigo);
    renderizarCarrito();
}

function editarItemCarrito(codigo) {
    const item = carrito.find(p => p.codigoCarrito === codigo);
    if(item) abrirModalCantidad(item, item.cantidad);
}

// --- 4. SISTEMA DE ALERTAS BONITAS ---
function mostrarAlerta(titulo, mensaje, botonesHTML) {
    document.getElementById("titulo-alerta").innerText = titulo;
    document.getElementById("desc-alerta").innerText = mensaje;
    
    const cajaBotones = document.getElementById("botones-alerta");
    if(botonesHTML) {
        cajaBotones.innerHTML = botonesHTML;
    } else {
        cajaBotones.innerHTML = `<button class="btn-guardar" onclick="cerrarModalAlerta()" style="width: 100%;">Entendido</button>`;
    }
    document.getElementById("modal-alerta").classList.add("activo");
}

function cerrarModalAlerta() {
    document.getElementById("modal-alerta").classList.remove("activo");
}

function procesarVenta() {
    if (carrito.length === 0) return mostrarAlerta("Carrito Vacío", "No hay productos para vender.");

    // 1. Calcular totales para mostrar en la confirmación
    const totalDolares = carrito.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
    
    // 2. Definir los botones de la alerta de confirmación
    const botonesConfirmacion = `
        <button class="btn-cancelar" onclick="cerrarModalAlerta()" style="flex:1;">Cancelar</button>
        <button class="btn-guardar" onclick="ejecutarVentaFinal()" style="flex:1;">Confirmar $${totalDolares.toFixed(2)}</button>
    `;

    mostrarAlerta("Confirmar Venta", "¿Deseas finalizar esta venta?", botonesConfirmacion);
}

// 3. Esta función resta en cascada (PEPS: Primeros en vencer, Primeros en salir)
function ejecutarVentaFinal() {
    cerrarModalAlerta();
    
    const bd = JSON.parse(localStorage.getItem('miInventarioApp'));
    let inventario = bd[usuarioActual].productos;

    // FASE 1: VALIDACIÓN (Saber si hay stock total sumando todos los lotes)
    for (let i = 0; i < carrito.length; i++) {
        let itemCar = carrito[i];
        
        // Buscamos TODOS los lotes en la base de datos que compartan el mismo código de barras
        let lotesDelProducto = inventario.filter(p => obtenerCodigoReal(p) === itemCar.codigoCarrito);
        
        // Sumamos el stock de todos esos lotes
        let stockTotalDisponible = lotesDelProducto.reduce((sum, p) => sum + (parseInt(p.stock) || 0), 0);

        if (stockTotalDisponible === 0) {
            mostrarAlerta("Producto Agotado", `El producto "${itemCar.nombre}" se agotó en todos sus lotes.`);
            eliminarItemCarrito(itemCar.codigoCarrito);
            return; 
        }

        if (itemCar.cantidad > stockTotalDisponible) {
            const botones = `
                <button class="btn-cancelar" onclick="eliminarItemCarrito('${itemCar.codigoCarrito}'); cerrarModalAlerta();" style="flex:1;">Eliminar</button>
                <button class="btn-guardar" onclick="ajustarCarrito('${itemCar.codigoCarrito}', ${stockTotalDisponible}); cerrarModalAlerta();" style="flex:1;">Dejar ${stockTotalDisponible}</button>
            `;
            mostrarAlerta("Stock Insuficiente", `Solo hay ${stockTotalDisponible} unidades en total de "${itemCar.nombre}".`, botones);
            return;
        }
    }

    // FASE 2: DESCUENTO INTELIGENTE
    carrito.forEach(itemCar => {
        // Volvemos a obtener los lotes
        let lotesDelProducto = inventario.filter(p => obtenerCodigoReal(p) === itemCar.codigoCarrito);
        
        // ORDENAMOS LOS LOTES: Los más viejos (que vencen primero) van al principio
        lotesDelProducto.sort((a, b) => {
            // Si uno no tiene fecha de vencimiento, lo mandamos al final de la fila
            if (!a.fechaVencimiento) return 1;
            if (!b.fechaVencimiento) return -1;
            // Comparamos las fechas
            return new Date(a.fechaVencimiento) - new Date(b.fechaVencimiento);
        });

        let cantidadARestar = itemCar.cantidad;

        // Recorremos los lotes ya ordenados y empezamos a vaciarlos
        for (let j = 0; j < lotesDelProducto.length; j++) {
            let lote = lotesDelProducto[j];
            let stockLote = parseInt(lote.stock) || 0;

            if (stockLote > 0 && cantidadARestar > 0) {
                if (stockLote >= cantidadARestar) {
                    // Si este lote tiene suficiente para cubrir lo que falta de la venta
                    lote.stock = stockLote - cantidadARestar;
                    cantidadARestar = 0; // Terminamos de restar este producto
                } else {
                    // Si este lote no alcanza, le quitamos todo y seguimos pidiendo al siguiente lote
                    cantidadARestar = cantidadARestar - stockLote;
                    lote.stock = 0; 
                }
            }
        }
    });

// --- NUEVO: FASE 3 - REGISTRO HISTÓRICO DE LA VENTA ---
    if (!bd[usuarioActual].historialVentas) {
        bd[usuarioActual].historialVentas = [];
    }

    const nuevaVenta = {
        idVenta: "VTA-" + Date.now(),
        fecha: new Date().toISOString(),
        articulos: carrito.map(item => ({
            codigo: item.codigoCarrito,
            nombre: item.nombre,
            cantidad: item.cantidad,
            precioUnidad: item.precio,
            subtotal: item.precio * item.cantidad
        })),
        totalDolares: carrito.reduce((sum, item) => sum + (item.precio * item.cantidad), 0)
    };

    bd[usuarioActual].historialVentas.push(nuevaVenta);
    // --------------------------------------------------------


// Guardamos los cambios de vuelta en el almacenamiento local
    localStorage.setItem('miInventarioApp', JSON.stringify(bd));
    
    carrito = [];
    renderizarCarrito();
    
    // --- NUEVO: Actualizar estadísticas en segundo plano ---
    if (typeof renderizarEstadisticas === "function") {
        renderizarEstadisticas();
    }
    // --------------------------------------------------------

    mostrarAlerta("¡Éxito!", "Venta procesada y lotes descontados correctamente.");
}

function ajustarCarrito(codigo, nuevoStock) {
    const index = carrito.findIndex(p => p.codigoCarrito === codigo);
    if(index >= 0) {
        carrito[index].cantidad = nuevoStock;
        renderizarCarrito();
    }
}


function iniciarEscannerVentas() {
    // Si la cámara ya está activa, no hacemos nada
    if (html5QrCodeVentas && html5QrCodeVentas.isScanning) return;

    const div = document.getElementById("lector-camara-ventas");
    if (!div) return;

    div.style.display = "block";
    html5QrCodeVentas = new Html5Qrcode("lector-camara-ventas");

    html5QrCodeVentas.start(
        { facingMode: "environment" }, 
        { fps: 10, qrbox: { width: 250, height: 100 } },
        (codigo) => {
            // Ponemos el código escaneado en el buscador
            document.getElementById("input-busqueda-venta").value = codigo;
            // Llamamos a tu buscador de ventas
            buscarEnVentas();
        },
        (error) => { /* Silenciamos errores de lectura continua */ }
    ).catch(err => console.log("Cámara ocupada o sin permiso"));
}

function detenerEscannerVentas() {
    if (html5QrCodeVentas && html5QrCodeVentas.isScanning) {
        html5QrCodeVentas.stop().then(() => {
            document.getElementById("lector-camara-ventas").style.display = "none";
        }).catch(err => console.log("Error al detener cámara", err));
    }
}