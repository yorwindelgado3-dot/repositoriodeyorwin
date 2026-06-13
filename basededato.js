// --- 1. CONFIGURACIÓN DE BASE DE DATOS ---
// Intentamos recuperar al usuario al abrir la app para mantener la sesión viva
let usuarioActual = sessionStorage.getItem('usuarioLogueado') || "";
let baseDeDatos = JSON.parse(localStorage.getItem('miInventarioApp')) || {};

// --- 2. LÓGICA DE REGISTRO ---
function registrarUsuario() {
    const user = document.getElementById("inUsuario").value.trim();
    const pass = document.getElementById("inClave").value.trim();
    const msj = document.getElementById("msjError");

    if (!user || !pass) { 
        msj.innerText = "Por favor, rellena usuario y contraseña"; 
        msj.style.color = "red"; 
        return; 
    }
    
    if (baseDeDatos[user]) { 
        msj.innerText = "Este usuario ya existe"; 
        msj.style.color = "red"; 
        return; 
    }

    baseDeDatos[user] = { clave: pass, productos: [], categorias: [], ventas: [] };
    localStorage.setItem('miInventarioApp', JSON.stringify(baseDeDatos));
    
    msj.innerText = "¡Registrado con éxito! Ahora presiona Entrar";
    msj.style.color = "green";
}

// --- 3. LÓGICA DE LOGIN ---
function iniciarSesion() {
    const user = document.getElementById("inUsuario").value.trim();
    const pass = document.getElementById("inClave").value.trim();
    const msj = document.getElementById("msjError");

    if (user === "" || pass === "") {
        msj.innerText = "Completa todos los campos";
        msj.style.color = "red";
        return;
    }

    if (baseDeDatos[user] && baseDeDatos[user].clave === pass) {
        usuarioActual = user;
        // GUARDAMOS LA SESIÓN: Esto permite que los otros módulos lean quién es el usuario
        sessionStorage.setItem('usuarioLogueado', user);
        
        document.getElementById("pantalla-login").classList.remove("activa");
        document.getElementById("pantalla-app").classList.add("activa");
        msj.innerText = "";

        // NUEVO: Dibujar las tarjetas de categoría de forma automática al entrar
        if (typeof mostrarInventario === 'function') {
            mostrarInventario();
        }
        
    } else {
        msj.innerText = "Usuario no registrado o contraseña incorrecta";
        msj.style.color = "red";
    }
}

function cambiarPestana(id, btn) {
    document.querySelectorAll('.sub-pantalla').forEach(p => p.classList.remove('activa'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('activa'));
    document.getElementById(id).classList.add('activa');
    btn.classList.add('activa');

    // --- LÓGICA DE CÁMARA PARA VENTAS ---
    if (id === 'tab-vender') {
        if (typeof iniciarEscannerVentas === 'function') {
            iniciarEscannerVentas();
        }
    } else {
        // Al salir de Vender, apagamos la cámara
        if (typeof detenerEscannerVentas === 'function') {
            detenerEscannerVentas();
        }
    }

    // --- LÓGICA DE STOCK (existente) ---
    if(id === 'tab-stock') {
        if (typeof mostrarInventario === 'function') {
            mostrarInventario();
        }
    }

    if (id === 'tab-estadisticas') {
        if (typeof initEstadisticas === 'function') {
            initEstadisticas();
        }
    }
}

function cerrarSesion() {
    // 1. Limpieza de variables globales
    usuarioActual = "";
    
    // 2. Limpieza de almacenamiento persistente
    sessionStorage.removeItem('usuarioLogueado');
    
    // 3. Limpieza de la interfaz
    document.getElementById("inUsuario").value = "";
    document.getElementById("inClave").value = "";
    
    // 4. Limpieza de los campos del inventario
    document.getElementById("listaInventario").innerHTML = ""; 
    
    // 5. Cambio de vista (CORREGIDO PARA COINCIDIR CON EL LOGIN)
    window.scrollTo(0, 0);
    
    // Apagamos la pantalla de la app y encendemos la del login usando sus IDs
    document.getElementById("pantalla-app").classList.remove("activa");
    document.getElementById("pantalla-login").classList.add("activa");
}

// --- 5. GESTIÓN DE LA TASA BCV ---

// Leemos la tasa guardada en el dispositivo (si no hay, usamos 36.50 por defecto)
let tasaGlobal = parseFloat(localStorage.getItem('tasaBCV_App')) || 36.50;

// Esta función se encarga de pintar la tasa actual en el botón del Header
function pintarTasaEnPantalla() {
    const spanTasa = document.getElementById("tasa-valor");
    if(spanTasa) {
        // Solo cambiamos el texto del span, dejando el SVG intacto
        spanTasa.innerHTML = `${tasaGlobal.toFixed(2)} Bs`;
    }
}

// Ejecutamos la función al cargar el archivo para que ponga la tasa guardada
pintarTasaEnPantalla();

function abrirModalTasa() {
    // Al abrir, ponemos el valor actual en el input
    document.getElementById("inTasaNueva").value = tasaGlobal.toFixed(2);
    document.getElementById("modal-tasa").classList.add("activo");
}

function cerrarModalTasa() {
    document.getElementById("modal-tasa").classList.remove("activo");
}

function guardarTasa() {
    const inputTasa = document.getElementById("inTasaNueva").value;
    const nuevaTasa = parseFloat(inputTasa);

    // Verificamos que sea un número válido y mayor a cero
    if (!isNaN(nuevaTasa) && nuevaTasa > 0) {
        tasaGlobal = nuevaTasa;
        // Guardamos en el almacenamiento local
        localStorage.setItem('tasaBCV_App', tasaGlobal);
        
        pintarTasaEnPantalla(); // Actualizamos el botón visualmente
        cerrarModalTasa();      // Ocultamos la ventana
    } else {
        alert("Por favor, ingresa un valor numérico válido.");
    }
}