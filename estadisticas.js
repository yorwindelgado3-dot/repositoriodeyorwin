// ==========================================
// MÓDULO DE ESTADÍSTICAS Y DASHBOARD
// ==========================================

// Variables globales para los gráficos
let chartEvolucion = null;
let chartCategorias = null;

// Variables dinámicas para el control del tiempo
let modoFiltro = 'mes'; // Puede ser: 'dia', 'semana', 'mes'
let fechaBaseFiltro = new Date(); // La fecha central sobre la que nos movemos
let fechaInicioFiltro = null;
let fechaFinFiltro = null;

// --- 1. INICIALIZACIÓN Y RENDERIZADO PRINCIPAL ---
function renderizarEstadisticas() {
    const bd = JSON.parse(localStorage.getItem('miInventarioApp')) || {};
    if (!bd[usuarioActual]) return;

    const historial = bd[usuarioActual].historialVentas || [];
    const productos = bd[usuarioActual].productos || [];

    // Validamos el rango de fechas actual
    if (!fechaInicioFiltro || !fechaFinFiltro) {
        calcularRangoFechas();
    }

    // Filtramos las ventas
    const ventasFiltradas = filtrarHistorialPorFechas(historial);

    // Actualizamos toda la pantalla
    actualizarTextoFiltroFecha();
    actualizarTarjetasKPI(ventasFiltradas);
    renderizarGraficoEvolucion(ventasFiltradas);
    renderizarGraficoCategorias(ventasFiltradas, productos);
    actualizarTopProductos(ventasFiltradas);
    actualizarResumenStock(productos);
}

// --- 2. GESTIÓN MULTI-TIEMPO DE FILTROS DE FECHA ---

// Se ejecuta cuando el usuario elige algo en la lista desplegable (Día/Semana/Mes)
function cambiarModoFiltro(nuevoModo) {
    modoFiltro = nuevoModo;
    fechaBaseFiltro = new Date(); // Reiniciamos a la fecha actual de hoy
    calcularRangoFechas();
    renderizarEstadisticas();
}

// Calcula el inicio y fin exacto dependiendo si estamos viendo días, semanas o meses
function calcularRangoFechas() {
    const base = new Date(fechaBaseFiltro);
    
    if (modoFiltro === 'dia') {
        // Desde las 00:00 hasta las 23:59 del mismo día
        fechaInicioFiltro = new Date(base.getFullYear(), base.getMonth(), base.getDate(), 0, 0, 0);
        fechaFinFiltro = new Date(base.getFullYear(), base.getMonth(), base.getDate(), 23, 59, 59);
    } 
    else if (modoFiltro === 'semana') {
        // Calculamos para que empiece el Lunes y termine el Domingo
        let diaSemana = base.getDay();
        let ajusteInicio = diaSemana === 0 ? -6 : 1 - diaSemana; // Ajustar si es Domingo
        
        let inicio = new Date(base);
        inicio.setDate(base.getDate() + ajusteInicio);
        fechaInicioFiltro = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate(), 0, 0, 0);
        
        let fin = new Date(inicio);
        fin.setDate(inicio.getDate() + 6);
        fechaFinFiltro = new Date(fin.getFullYear(), fin.getMonth(), fin.getDate(), 23, 59, 59);
    } 
    else if (modoFiltro === 'mes') {
        // Desde el día 1 hasta el último día del mes
        fechaInicioFiltro = new Date(base.getFullYear(), base.getMonth(), 1, 0, 0, 0);
        fechaFinFiltro = new Date(base.getFullYear(), base.getMonth() + 1, 0, 23, 59, 59);
    }
}

// Se ejecuta al tocar las flechas izquierda/derecha
function cambiarFecha(direccion) {
    if (modoFiltro === 'dia') {
        fechaBaseFiltro.setDate(fechaBaseFiltro.getDate() + direccion); // Suma/resta 1 día
    } else if (modoFiltro === 'semana') {
        fechaBaseFiltro.setDate(fechaBaseFiltro.getDate() + (direccion * 7)); // Suma/resta 7 días
    } else if (modoFiltro === 'mes') {
        fechaBaseFiltro.setMonth(fechaBaseFiltro.getMonth() + direccion); // Suma/resta 1 mes
    }
    
    calcularRangoFechas();
    renderizarEstadisticas();
}

function actualizarTextoFiltroFecha() {
    const opciones = { day: '2-digit', month: '2-digit', year: 'numeric' };
    const inicioFmt = fechaInicioFiltro.toLocaleDateString('es-ES', opciones);
    const finFmt = fechaFinFiltro.toLocaleDateString('es-ES', opciones);
    
    const labelFecha = document.getElementById("label-filtro-fecha");
    if(labelFecha) {
        if (modoFiltro === 'dia') {
            labelFecha.innerText = `${inicioFmt}`; // Muestra 1 sola fecha si es por día
        } else {
            labelFecha.innerText = `${inicioFmt} - ${finFmt}`; // Muestra el rango si es semana o mes
        }
    }
}

function filtrarHistorialPorFechas(historial) {
    return historial.filter(venta => {
        const fechaVenta = new Date(venta.fecha);
        return fechaVenta >= fechaInicioFiltro && fechaVenta <= fechaFinFiltro;
    });
}

// --- 3. TARJETAS DE INDICADORES (KPIs) ---
function actualizarTarjetasKPI(ventas) {
    let totalUSD = 0;
    let unidadesTotales = 0;
    
    ventas.forEach(venta => {
        totalUSD += venta.totalDolares;
        venta.articulos.forEach(art => {
            unidadesTotales += art.cantidad;
        });
    });

    const totalBs = totalUSD * tasaGlobal; // Usamos la tasa global de tu app
    const ticketPromedio = ventas.length > 0 ? (totalUSD / ventas.length) : 0;

    // Actualizar el DOM (Asegúrate de que estos IDs existan en tu HTML)
    if(document.getElementById("kpi-total-usd")) document.getElementById("kpi-total-usd").innerText = `$${totalUSD.toFixed(2)}`;
    if(document.getElementById("kpi-total-bs")) document.getElementById("kpi-total-bs").innerText = `Bs ${totalBs.toFixed(2)}`;
    if(document.getElementById("kpi-ticket-promedio")) document.getElementById("kpi-ticket-promedio").innerText = `$${ticketPromedio.toFixed(2)}`;
    if(document.getElementById("kpi-unidades")) document.getElementById("kpi-unidades").innerText = unidadesTotales;
}

// --- 4. GRÁFICO 1: EVOLUCIÓN DE VENTAS (LÍNEAS) ---
function renderizarGraficoEvolucion(ventas) {
    const ctx = document.getElementById('chart-evolucion-ventas');
    if (!ctx) return;

    const ventasAgrupadas = {};

    ventas.forEach(venta => {
        const f = new Date(venta.fecha);
        let clave;

        if (modoFiltro === 'dia') {
            // Usamos la hora como clave (0 a 23)
            clave = f.getHours(); 
        } else {
            // SOLUCIÓN: Extraemos la fecha usando la zona horaria local del teléfono
            const anio = f.getFullYear();
            const mes = String(f.getMonth() + 1).padStart(2, '0');
            const dia = String(f.getDate()).padStart(2, '0');
            
            clave = `${anio}-${mes}-${dia}`;
        }

        if (!ventasAgrupadas[clave]) ventasAgrupadas[clave] = 0;
        ventasAgrupadas[clave] += venta.totalDolares;
    });

    // Ordenar claves numéricamente
    const clavesOrdenadas = Object.keys(ventasAgrupadas).sort((a, b) => a - b);
    const datos = clavesOrdenadas.map(k => ventasAgrupadas[k]);
    
    // Etiquetas: Si es día, ponemos "X:00", si no, el día del mes
    const etiquetas = clavesOrdenadas.map(k => {
        return modoFiltro === 'dia' ? `${k}:00` : k.split('-')[2];
    });

    if (chartEvolucion) chartEvolucion.destroy();

    chartEvolucion = new Chart(ctx, {
        type: 'line', // Siempre será de línea
        data: {
            labels: etiquetas,
            datasets: [{
                label: modoFiltro === 'dia' ? 'Ventas por Hora ($)' : 'Ventas Diarias ($)',
                data: datos,
                borderColor: '#007bff',
                backgroundColor: 'rgba(10, 45, 227, 0.11)', // Fondo suave
                borderWidth: 2,
                pointRadius: 4,
                fill: true,
                tension: 0.3 // Curvas suaves
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { 
                y: { beginAtZero: true } 
            }
        }
    });
}


// --- 5. GRÁFICO 2: VENTAS POR CATEGORÍA (BARRAS) ---
function renderizarGraficoCategorias(ventas, productos) {
    const ctx = document.getElementById('chart-ventas-categorias');
    if (!ctx) return;

    // 1. Diccionario mejorado: Buscamos tanto por Código como por Nombre
    const mapaCategorias = {};
    productos.forEach(p => {
        const cod = obtenerCodigoReal(p); 
        
        // <-- CAMBIO: Si no tiene categoría, asignamos 'CAT-OTRO' por defecto
        const cat = p.categoriaId && p.categoriaId.trim() !== '' ? p.categoriaId : 'CAT-OTRO';
        
        if (cod) mapaCategorias[cod] = cat;
        if (p.nombre) mapaCategorias[p.nombre.toLowerCase()] = cat;
    });

    // 2. Traductor visual para la gráfica (para que se vea profesional en la app)
    const nombresAmigables = {
        "CAT-ALIM": "Alimentos",
        "CAT-BEBI": "Bebidas",
        "CAT-CONF": "Confitería",
        "CAT-LICO": "Licores",
        "CAT-LIMP": "Limpieza",
        "CAT-OTRO": "Otros"
    };

    // 3. Sumar ventas cruzando datos
    const ventasPorCategoria = {};
    ventas.forEach(venta => {
        venta.articulos.forEach(art => {
            // Buscamos la categoría
            let categoriaCode = mapaCategorias[art.codigo];

            if (!categoriaCode && art.nombre) {
                categoriaCode = mapaCategorias[art.nombre.toLowerCase()];
            }

            // Si el artículo ya traía su propio categoriaId guardado (ventas nuevas)
            if (!categoriaCode && art.categoriaId) {
                categoriaCode = art.categoriaId;
            }

            // <-- CAMBIO: Si el producto fue borrado y no se encuentra en el historial, va a "Otros"
            categoriaCode = categoriaCode || 'CAT-OTRO';

            // Traducimos "CAT-ALIM" a "Alimentos" para que se vea bien
            const nombreVisible = nombresAmigables[categoriaCode] || categoriaCode;

            if (!ventasPorCategoria[nombreVisible]) ventasPorCategoria[nombreVisible] = 0;
            ventasPorCategoria[nombreVisible] += art.subtotal;
        });
    });

    const categorias = Object.keys(ventasPorCategoria);
    const datos = Object.values(ventasPorCategoria);

    if (chartCategorias) chartCategorias.destroy();

    chartCategorias = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: categorias,
            datasets: [{
                label: 'Ventas por Categoría ($)',
                data: datos,
                backgroundColor: '#007bff', 
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false } // Oculto para ahorrar espacio en la pantalla del móvil
            },
            scales: { y: { beginAtZero: true } }
        }
    });
}

// --- 6. LISTA DE TOP PRODUCTOS ---
function actualizarTopProductos(ventas) {
    const contenedor = document.getElementById("lista-top-productos");
    if (!contenedor) return;

    // Contar cuántas unidades se han vendido de cada producto
    const conteoProductos = {};
    ventas.forEach(venta => {
        venta.articulos.forEach(art => {
            if (!conteoProductos[art.codigo]) {
                conteoProductos[art.codigo] = { nombre: art.nombre, cantidad: 0 };
            }
            conteoProductos[art.codigo].cantidad += art.cantidad;
        });
    });

    // Convertir a array, ordenar de mayor a menor y tomar los primeros 3
    const top3 = Object.values(conteoProductos)
        .sort((a, b) => b.cantidad - a.cantidad)
        .slice(0, 3);

    contenedor.innerHTML = "";
    if (top3.length === 0) {
        contenedor.innerHTML = "<p style='color:#888; font-size:12px;'>Aún no hay ventas.</p>";
        return;
    }

    top3.forEach((prod, index) => {
        // Evaluamos si el nombre es muy largo (más de 16 caracteres)
        const esLargo = prod.nombre.length > 9;
        
        let htmlNombre = "";
        if (esLargo) {
            // Truco visual: Duplicamos el texto separado por un punto para que el scroll fluya en bucle continuo
            htmlNombre = `<div class="texto-largo-animado">${prod.nombre} &nbsp;&nbsp;&nbsp; • &nbsp;&nbsp;&nbsp; ${prod.nombre} &nbsp;&nbsp;&nbsp; • &nbsp;&nbsp;&nbsp; </div>`;
        } else {
            // Si el texto es corto, se queda estático
            htmlNombre = `<div style="display: inline-block; color: #333;">${prod.nombre}</div>`;
        }

        contenedor.innerHTML += `
            <div class="contenedor-top-prod">
                <strong style="flex-shrink: 0; color: #1a1a1a;">${index + 1}.</strong>
                <div class="zona-texto-top">
                    ${htmlNombre}
                </div>
                <span style="color: #666; font-weight: bold; flex-shrink: 0;">[${prod.cantidad} und]</span>
            </div>
        `;
    });
}

// --- 7. RESUMEN DE STOCK ---
function actualizarResumenStock(productos) {
    // Agrupar inventario para no contar lotes por separado, sino el total real por producto
    const stockAgrupado = {};
    productos.forEach(p => {
        const cod = obtenerCodigoReal(p);
        if (!stockAgrupado[cod]) {
            stockAgrupado[cod] = { ...p, stockTotal: 0 };
        }
        stockAgrupado[cod].stockTotal += (parseInt(p.stock) || 0);
    });

    const inventarioUnico = Object.values(stockAgrupado);

    let totalItems = inventarioUnico.length; // Tipos de productos distintos
    let valorTotalInventarioUSD = 0;
    let itemsBajoStock = 0;

    inventarioUnico.forEach(p => {
        valorTotalInventarioUSD += (p.stockTotal * (parseFloat(p.precio) || 0));
        if (p.stockTotal <= 5) {
            itemsBajoStock++;
        }
    });

    // Actualizar DOM
    if(document.getElementById("resumen-total-items")) document.getElementById("resumen-total-items").innerText = totalItems;
    if(document.getElementById("resumen-valor-stock")) document.getElementById("resumen-valor-stock").innerText = `$${valorTotalInventarioUSD.toFixed(2)}`;
    if(document.getElementById("resumen-bajo-stock")) document.getElementById("resumen-bajo-stock").innerText = itemsBajoStock;
}

function abrirModalBajoStock() {
    const modal = document.getElementById("modal-bajo-stock");
    const lista = document.getElementById("lista-detalle-bajo-stock");
    const bd = JSON.parse(localStorage.getItem('miInventarioApp')) || {};
    const productos = bd[usuarioActual]?.productos || [];
    
    lista.innerHTML = "";
    
    // Filtramos los que tienen stock <= 5
    const productosCriticos = productos.filter(p => (parseInt(p.stock) || 0) <= 5);

    if (productosCriticos.length === 0) {
        lista.innerHTML = "<p>¡Todo el stock está al día!</p>";
    } else {
        productosCriticos.forEach(p => {
            lista.innerHTML += `
                <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; font-size: 14px;">
                    <div>
                        <strong style="display:block;">${p.nombre}</strong>
                        <span style="font-size: 11px; color: #666;">Cod: ${obtenerCodigoReal(p)}</span>
                    </div>
                    <span style="color: #e53e3e; font-weight: bold;">Quedan: ${p.stock}</span>
                </div>
            `;
        });
    }
    
    modal.style.display = "flex";
}