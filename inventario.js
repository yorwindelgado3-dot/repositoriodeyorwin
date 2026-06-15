// --- MÓDULO 4: VISUALIZACIÓN DE INVENTARIO Y CATEGORÍAS ---

// Variables globales para la vista actual
let categoriaAbierta = "";
let productosDeCategoriaActual = [];
let html5QrCodeStock;
let lectorStockActivo = false;

// Definición de las categorías (Debe coincidir con producto.js)
const categoriasDefinidas = [
    { id: "CAT-ALIM", nombre: "Alimentos", img: "alimentos.png", vence: true, color: "#ffebcd" },
    { id: "CAT-BEBI", nombre: "Bebidas", img: "bebidas.png", vence: true, color: "#d4edda" },
    { id: "CAT-CONF", nombre: "Confitería", img: "confiteria.png", vence: true, color: "#f8d7da" },
    { id: "CAT-LICO", nombre: "Licores", img: "licores.png", vence: false, color: "#cce5ff" },
    { id: "CAT-LIMP", nombre: "Limpieza", img: "limpieza.png", vence: false, color: "#e2e3e5" },
    { id: "CAT-OTRO", nombre: "Otros", img: "caja.png", vence: false, color: "#fff3cd" }
];

function mostrarInventario() {
    const vistaCat = document.getElementById("vista-categorias");
    const vistaProd = document.getElementById("vista-productos");
    
    // Mostramos la grilla, ocultamos la lista
    vistaCat.style.display = "grid";
    // Aseguramos que la grilla tenga las columnas necesarias (puedes ajustar el 140px)
    vistaCat.style.gridTemplateColumns = "repeat(auto-fill, minmax(140px, 1fr))";
    vistaCat.style.gap = "15px"; // Un espacio entre elementos para que se vea mejor
    
    vistaProd.style.display = "none";
    vistaCat.innerHTML = ""; // Limpiamos

    // --- TÍTULO CON EXPANSIÓN TOTAL ---
    const titulo = document.createElement("h3");
    titulo.style.cssText = `
        color: #1a1a1a; 
        text-align: left; 
        width: 100%; 
        margin: 0px 0 5px 0; 
        font-size: 18px; 
        font-weight: bold;
        grid-column: 1 / -1; 
    `;
    titulo.innerText = "Categorías";
    vistaCat.appendChild(titulo);

    // Creamos un botón tipo "tarjeta" por cada categoría
    categoriasDefinidas.forEach(cat => {
        const div = document.createElement("div");
        
        div.style.cssText = `
            background: linear-gradient(135deg, rgba(255, 255, 255, 0.7) 0%, rgba(255, 255, 255, 0.1) 100%), ${cat.color};
            border: 1px solid rgba(255, 255, 255, 0.9);
            border-radius: 12px;
            padding: 25px 10px;
            text-align: center;
            cursor: pointer;
            box-shadow: 0 4px 15px rgba(0,0,0,0.06), inset 0 0 12px rgba(255, 255, 255, 0.8);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 110px;
        `;
        
        div.innerHTML = `
            <img src="${cat.img}" style="width: 50px; height: 50px; object-fit: contain; margin-bottom: 5px; filter: drop-shadow(0 3px 4px rgba(0,0,0,0.15));">
            <strong style="font-size: 13px; color: #333;">${cat.nombre}</strong>
        `;
        
        div.onclick = () => abrirCategoria(cat.id, cat.nombre, cat.vence);
        vistaCat.appendChild(div);
    });
}

// 2. ABRIR UNA CATEGORÍA ESPECÍFICA
function abrirCategoria(catId, catNombre, tieneVencimiento) {
    categoriaAbierta = catId;
    
    document.getElementById("vista-categorias").style.display = "none";
    document.getElementById("vista-productos").style.display = "flex";
    document.getElementById("titulo-categoria-stock").innerText = catNombre;
    
    // Limpiamos buscador y checkbox al entrar
    document.getElementById("busquedaStock").value = "";
    document.getElementById("checkVencimiento").checked = false;

    // Mostrar/Ocultar el checkbox de vencimiento según la categoría
    const contVencimiento = document.getElementById("contenedor-vencimiento");
    if (tieneVencimiento) {
        contVencimiento.style.display = "block";
    } else {
        contVencimiento.style.display = "none";
    }

    // Cargar productos de la base de datos
    cargarProductosDeCategoria();
}

// 3. VOLVER A LAS CATEGORÍAS
function volverCategorias() {
    if (lectorStockActivo && html5QrCodeStock) {
        // Apagar cámara si está encendida antes de volver
        toggleCamaraStock(); 
    }
    document.getElementById("vista-categorias").style.display = "grid";
    document.getElementById("vista-productos").style.display = "none";
}

// 4. EXTRAER DATOS Y APLICAR FILTROS/ORDEN
function cargarProductosDeCategoria() {
    const db = JSON.parse(localStorage.getItem('miInventarioApp')) || {};
    const usuarioLogueado = sessionStorage.getItem('usuarioLogueado') || "";

    if (!usuarioLogueado || !db[usuarioLogueado]) {
        document.getElementById("lista-productos-stock").innerHTML = "<p style='color:red; text-align:center;'>Inicia sesión primero.</p>";
        return;
    }

    const todosLosProductos = db[usuarioLogueado].productos || [];
    
    // Filtramos solo los que pertenecen a la categoría clickeada
    productosDeCategoriaActual = todosLosProductos.filter(p => p.categoriaId === categoriaAbierta);
    
    aplicarFiltrosStock();
}

function aplicarFiltrosStock() {
    const terminoBusqueda = document.getElementById("busquedaStock").value.toLowerCase();
    const ordenarPorFecha = document.getElementById("checkVencimiento").checked;
    const lista = document.getElementById("lista-productos-stock");

    // 1. Filtrar por texto/código
    let filtrados = productosDeCategoriaActual.filter(p => 
        p.nombre.toLowerCase().includes(terminoBusqueda) || 
        p.id.toLowerCase().includes(terminoBusqueda)
    );

    // 2. Ordenar por vencimiento (Si el check está activo)
    if (ordenarPorFecha) {
        filtrados.sort((a, b) => {
            // Si alguno no tiene fecha, lo mandamos al final
            if (!a.fechaVencimiento) return 1;
            if (!b.fechaVencimiento) return -1;
            
            // Comparamos fechas de más vieja (próxima a vencer) a más nueva
            return new Date(a.fechaVencimiento) - new Date(b.fechaVencimiento);
        });
    }

    // 3. Dibujar resultados
    lista.innerHTML = "";
    if (filtrados.length === 0) {
        lista.innerHTML = "<p style='color:#999; margin-top:20px; text-align:center;'>No hay productos agregados.</p>";
        return;
    }

    filtrados.forEach(prod => {
        const item = document.createElement("div");
        
        // --- MODIFICACIÓN: Agregamos cursor: pointer para indicar que se puede hacer clic ---
        item.style.cssText = "background: white; border-bottom: 1px solid #eee; padding: 15px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.02); cursor: pointer;";
        
        // Efecto visual al pasar el ratón para mejor experiencia de usuario
        item.onmouseover = () => item.style.backgroundColor = "#f8f9fa";
        item.onmouseout = () => item.style.backgroundColor = "white";

        // --- MODIFICACIÓN: Evento clic que llama a la ventana de edición en productos.js ---
        let fechaParaEditar = prod.fechaVencimiento ? prod.fechaVencimiento : '';
        item.onclick = () => {
            if (typeof abrirModalEdicion === 'function') {
                abrirModalEdicion(prod.id, fechaParaEditar);
            }
        };
        
        let infoVencimiento = "";
        if (prod.fechaVencimiento) {
            // Reduje de 13.3px (valor por defecto) a un tamaño equivalente a -2px
            infoVencimiento = `<small style="display:block; color: ${ordenarPorFecha ? '#dc3545' : '#856404'}; font-weight: bold; font-size: 11px;">Vence: ${prod.fechaVencimiento}</small>`;
        }

        item.innerHTML = `
            <div style="text-align: left; width: 70%;">
                <strong style="display:block; font-size: 14px;">${prod.nombre}</strong> 
                <small style="color:#666; display:block; font-size: 11px;">Cód: ${prod.id}</small> ${infoVencimiento}
            </div>
            <div style="text-align: right; width: 30%;">
                <div style="font-weight: bold; color:#29AB50; font-size: 14px;">$${prod.precio}</div> 
                <div style="font-size: 11px; color:#555; background: #e9ecef; padding: 2px 5px; border-radius: 5px; display: inline-block; margin-top: 5px;">Stock: <strong>${prod.stock}</strong></div> 
            </div>
        `;
        lista.appendChild(item);
    });
}

// Alias para el evento oninput del buscador
function filtrarStock() {
    aplicarFiltrosStock();
}

// 5. CÁMARA EXCLUSIVA PARA BÚSQUEDA DE STOCK
function toggleCamaraStock() {
    const divCamara = document.getElementById("lector-camara-stock");
    const btnCamara = document.getElementById("btn-camara-stock");

    if (!html5QrCodeStock) {
        html5QrCodeStock = new Html5Qrcode("lector-camara-stock");
    }

    if (lectorStockActivo) {
        html5QrCodeStock.stop().then(() => {
            divCamara.style.display = "none";
            btnCamara.style.backgroundColor = "#000";
            lectorStockActivo = false;
        }).catch(err => console.log("Error al detener cámara de stock", err));
    } else {
        divCamara.style.display = "block";
        
        html5QrCodeStock.start(
            { facingMode: "environment" }, 
            {
                fps: 10,
                qrbox: { width: 250, height: 100 }, // Rectangular como pediste
                aspectRatio: 1.33,
                showTorchButtonIfSupported: true
            },
            (textoEscaneado) => {
                // Al escanear, ponemos el código en el buscador
                const inputBusqueda = document.getElementById("busquedaStock");
                inputBusqueda.value = textoEscaneado;
                inputBusqueda.style.backgroundColor = "#d4edda";
                setTimeout(() => { inputBusqueda.style.backgroundColor = "#fff"; }, 500);
                
                // Filtramos automáticamente
                aplicarFiltrosStock();
                
                // Apagamos la cámara al detectar
                toggleCamaraStock(); 
            },
            (mensajeError) => {} // Silencio
        ).then(() => {
            btnCamara.style.backgroundColor = "#dc3545"; // Botón rojo al activar
            lectorStockActivo = true;
        }).catch(err => {
            alert("Error al iniciar cámara. Revisa los permisos.");
            divCamara.style.display = "none";
        });
    }
}