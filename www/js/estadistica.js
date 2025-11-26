
import { supabase } from './app.js';
import { Chart, LinearScale, CategoryScale, BarController, BarElement, LineController, LineElement, PointElement, Legend, Tooltip, Filler} from 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/+esm';
// Registra los componentes necesarios
Chart.register(LinearScale, CategoryScale, BarController, BarElement, LineController, LineElement, PointElement, Legend, Tooltip, Filler);
// Variables globales Frio
let movementChart, stockChart, balanceChart;
let selectedProductId = null;
let currentPeriod = 'day';
// Variables globales Bodega
let movementChart1, stockChart1, balanceChart1;
let selectedProductId1 = null;
let currentPeriod1 = 'day';
// Inicialización
document.addEventListener('DOMContentLoaded', async function() {
    // Inicializar Frio
    await initSelect2();
    initDatePicker();
    setupEventListeners();
    loadInitialData();
    // Inicializar Bodega
    await initSelect2_1();
    initDatePicker1();
    setupEventListeners1();
    loadInitialData1();
});

// Inicializar Select2 para búsqueda de productos
async function initSelect2() {
    const { data: productos } = await supabase
        .schema('inventario')
        .from('productos')
        .select('id_producto, nombre_producto')
        .order('nombre_producto', { ascending: true });
    const productSelect = $('#productSelect');
    productSelect.empty();
    productSelect.append('<option value="">Seleccione un producto</option>');
    productos.forEach(producto => {
        productSelect.append(`<option value="${producto.id_producto}">${producto.nombre_producto}</option>`);
    });
    productSelect.select2({
        placeholder: "Buscar producto...",
        allowClear: true
    });
    productSelect.on('change', function() {
        selectedProductId = $(this).val();
        if (selectedProductId) {
            updateCharts();
        }
    });
}
// Inicializar el selector de fechas
function initDatePicker() {
    flatpickr("#timeRange", {
        mode: "range",
        locale: "es",
        dateFormat: "d/m/Y",
        defaultDate: [new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), new Date()],
        onChange: function(selectedDates, dateStr, instance) {
            if (selectedDates.length === 2) {
                updateCharts();
            }
        }
    });
}
// Configurar event listeners
function setupEventListeners() {
    // Botones de período de tiempo
    $('.time-period-btn').on('click', function() {
        $('.time-period-btn').removeClass('active');
        $(this).addClass('active');
        currentPeriod = $(this).data('period');
        updateCharts();
    });
    // Botón aplicar filtros
    $('#applyFilters').on('click', updateCharts);
}
// Cargar datos iniciales
async function loadInitialData() {
    // Seleccionar el primer producto por defecto
    const { data: productos } = await supabase
        .schema('inventario')
        .from('productos')
        .select('id_producto')
        .order('nombre_producto', { ascending: true })
        .limit(1);
    if (productos && productos.length > 0) {
        selectedProductId = productos[0].id_producto;
        $('#productSelect').val(selectedProductId).trigger('change');
    }
}
// Actualizar todas las gráficas
async function updateCharts() {
    if (!selectedProductId) return;
    const dateRange = $('#timeRange').val();
    let startDate, endDate;
    if (dateRange) {
        const dates = dateRange.split(' a ');
        startDate = new Date(dates[0].split('/').reverse().join('-'));
        endDate = new Date(dates[1].split('/').reverse().join('-'));
    } else {
        // Fechas por defecto según el período seleccionado
        endDate = new Date();
        switch (currentPeriod) {
            case 'day':
                startDate = new Date();
                startDate.setDate(endDate.getDate() - 30);
                break;
            case 'week':
                startDate = new Date();
                startDate.setDate(endDate.getDate() - 70); // 10 semanas
                break;
            case 'month':
                startDate = new Date();
                startDate.setMonth(endDate.getMonth() - 12);
                break;
        }
        
        // Actualizar el datepicker
        $("#timeRange").flatpickr().setDate([startDate, endDate]);
    }
    // Obtener datos de entradas y salidas
    const { entradas, salidas } = await fetchMovementData(selectedProductId, startDate, endDate);
    // Procesar datos según el período seleccionado
    const processedData = processDataForPeriod(entradas, salidas, startDate, endDate, currentPeriod);
    // Actualizar gráficas
    updateMovementChart(processedData);
    updateStockChart(processedData);
    updateBalanceChart(processedData);
}

// Obtener datos de movimiento desde Supabase
async function fetchMovementData(productId, startDate, endDate) {
    // Formatear fechas para Supabase
    const formatDate = (date) => date.toISOString().split('T')[0];
    
    // Obtener entradas
    const { data: entradas } = await supabase
        .schema('inventario')
        .from('vista_entradasprueba')
        .select('fecha_entrada, und_entrada')
        .eq('id_producto', productId)
        .gte('fecha_entrada', formatDate(startDate))
        .lte('fecha_entrada', formatDate(endDate))
        .order('fecha_entrada', { ascending: true });
        let hoy = [];
         hoy = entradas;
        console.log(hoy);
    // Obtener salidas
    const { data: salidas } = await supabase
        .schema('inventario')
        .from('vista_salidasprueba')
        .select('fecha_salida, und_salida')
        .eq('id_producto', productId)
        .gte('fecha_salida', formatDate(startDate))
        .lte('fecha_salida', formatDate(endDate))
        .order('fecha_salida', { ascending: true });
    
    return { entradas, salidas };
}
// En la función processDataForPeriod, modifiqué el manejo de fechas:
function processDataForPeriod(entradas, salidas, startDate, endDate, period) {
    const result = {
        labels: [],
        entradas: [],
        salidas: [],
        stock: []
    };

    // Nueva función para ajustar la fecha y evitar el desplazamiento
    function adjustDate(dateString) {
        if (typeof dateString !== 'string') {
            console.warn('Fecha no es string:', dateString);
            return new Date(NaN);
        }

        // Eliminar microsegundos si existen (más de 3 decimales)
        const cleaned = dateString.replace(/(\\.\\d{3})\\d+/, '$1');

        const date = new Date(cleaned);
        if (isNaN(date)) {
            console.warn('No se pudo interpretar la fecha:', dateString);
            return new Date(NaN);
        }
        return date;
    }
    console.log('Fecha modificada', adjustDate)
    const groupData = (data, dateField, valueField) => {
        const grouped = {};

        data.forEach(item => {
            const rawDate = item[dateField];
            if (!rawDate) {
                console.warn('Fecha inválida (vacía o null):', item);
                return;
            }

            const date = adjustDate(rawDate);
            if (isNaN(date)) {
                console.warn('Fecha inválida (NaN):', rawDate);
                return;
            }

            let key;
            switch (period) {
                case 'day':
                    key = date.toISOString().split('T')[0];
                    break;
                case 'week':
                    const year = date.getFullYear();
                    const week = getWeekNumber(date)[1];
                    key = `${year}-W${week.toString().padStart(2, '0')}`;
                    break;
                case 'month':
                    key = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
                    break;
            }

            if (!grouped[key]) {
                grouped[key] = 0;
            }
            grouped[key] += item[valueField];
        });

        return grouped;
    };  
    // Agrupar entradas y salidas
    const groupedEntradas = groupData(entradas, 'fecha_entrada', 'und_entrada');
    const groupedSalidas = groupData(salidas, 'fecha_salida', 'und_salida');
    
    // Obtener todas las claves únicas (períodos de tiempo)
    const allKeys = new Set([
        ...Object.keys(groupedEntradas),
        ...Object.keys(groupedSalidas)
    ]);
    
    // Ordenar las claves cronológicamente
    const sortedKeys = Array.from(allKeys).sort((a, b) => {
        if (period === 'day') return new Date(a) - new Date(b);
        if (period === 'week') return compareWeekKeys(a, b);
        return a.localeCompare(b); // Para meses
    });
    
    // Crear arrays de datos ordenados
    let currentStock = 0;
    
    sortedKeys.forEach(key => {
        // Agregar etiqueta según el período
        switch (period) {
            case 'day':
                result.labels.push(formatDateLabel(new Date(key), period));
                break;
            case 'week':
                result.labels.push(`Sem ${key.split('-W')[1]}`);
                break;
            case 'month':
                const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
                const [year, month] = key.split('-');
                result.labels.push(`${monthNames[parseInt(month) - 1]} ${year}`);
                break;
        }
        
        // Agregar valores de entradas y salidas
        result.entradas.push(groupedEntradas[key] || 0);
        result.salidas.push(groupedSalidas[key] || 0);
        
        // Calcular stock acumulado
        currentStock += (groupedEntradas[key] || 0) - (groupedSalidas[key] || 0);
        result.stock.push(currentStock);
    });
    
    return result;
}

// Funciones auxiliares
function getWeekNumber(d) {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
    return [d.getUTCFullYear(), weekNo];
}

function compareWeekKeys(a, b) {
    const [yearA, weekA] = a.split('-W').map(Number);
    const [yearB, weekB] = b.split('-W').map(Number);
    
    if (yearA !== yearB) return yearA - yearB;
    return weekA - weekB;
}

function formatDateLabel(date, period) {
    const day = (date.getDate()).toString().padStart(2, '0');
    console.log('FECHA ACTUAL', day)
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    return `${day}/${month}`;
}
// En las funciones de actualización de gráficas, agregué borderRadius:
function updateMovementChart(data) {
    const ctx = document.getElementById('movementChart').getContext('2d');
    
    if (movementChart) {
        movementChart.destroy();
    }
    
    movementChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.labels,
            datasets: [
                {
                    label: 'Entradas',
                    data: data.entradas,
                    backgroundColor: 'rgba(15, 0, 231, 0.7)',
                    borderColor: 'rgb(8, 22, 174)',
                    borderWidth: 1
                },
                {
                    label: 'Salidas',
                    data: data.salidas,
                    backgroundColor: 'rgba(255, 0, 0, 0.7)',
                    borderColor: 'rgba(255, 99, 132, 1)',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Cantidad'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: getPeriodLabel()
                    }
                }
            },
            // Añadido para bordes redondeados
            elements: {
                bar: {
                    borderRadius: 4, // Bordes redondeados
                    
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: ${context.raw} unidades`;
                        }
                    }
                },
                legend: {
                    position: 'top'
                }
            }
        }
    });
}
// Actualizar gráfica de stock
function updateStockChart(data) {
    const ctx = document.getElementById('stockChart').getContext('2d');
    
    if (stockChart) {
        stockChart.destroy();
    }
    
    stockChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.labels,
            datasets: [{
                label: 'Stock Acumulado',
                data: data.stock,
                backgroundColor: 'rgba(82, 78, 132, 0.2)',
                borderColor: 'rgb(13, 5, 156)',
                borderWidth: 2,
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Unidades'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: getPeriodLabel()
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `Stock: ${context.raw} unidades`;
                        }
                    }
                }
            }
        }
    });
}

function updateBalanceChart(data) {
    const ctx = document.getElementById('balanceChart').getContext('2d');
    const balanceData = data.entradas.map((entrada, i) => entrada - data.salidas[i]);
    
    if (balanceChart) {
        balanceChart.destroy();
    }
    
    balanceChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.labels,
            datasets: [{
                label: 'Balance Neto (Entradas - Salidas)',
                data: balanceData,
                backgroundColor: balanceData.map(value => 
                    value > 0 ? 'rgba(0, 30, 255, 0.7)' : 'rgba(255, 0, 0, 0.7)'
                ),
                borderColor: balanceData.map(value => 
                    value > 0 ? 'rgb(113, 99, 201)' : 'rgba(255, 99, 132, 1)'
                ),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: false,
                    title: {
                        display: true,
                        text: 'Balance Neto'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: getPeriodLabel()
                    }
                }
            },
            // Añadido para bordes redondeados
            elements: {
                bar: {
                    borderRadius: 3, // Bordes redondeados
                   
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const value = context.raw;
                            return `Balance: ${value > 0 ? '+' : ''}${value} unidades`;
                        }
                    }
                }
            }
        }
    });
}
function getPeriodLabel() {
    switch (currentPeriod) {
        case 'day': return 'Días';
        case 'week': return 'Semanas';
        case 'month': return 'Meses';
        default: return 'Período';
    }
}
// Funciones de Bodega
// Inicializar Select2 para búsqueda de productos del segundo inventario
async function initSelect2_1() {
    const { data: productos } = await supabase
        .schema('inventario')
        .from('productosn')  // Tabla de productos del segundo inventario
        .select('id_producto, nombre_producto')
        .order('nombre_producto', { ascending: true });
    
    const productSelect = $('#productSelect1');  // ID con sufijo 1
    productSelect.empty();
    productSelect.append('<option value="">Seleccione un producto</option>');
    
    productos.forEach(producto => {
        productSelect.append(`<option value="${producto.id_producto}">${producto.nombre_producto}</option>`);
    });
    
    productSelect.select2({
        placeholder: "Buscar producto...",
        allowClear: true
    });
    
    productSelect.on('change', function() {
        selectedProductId1 = $(this).val();
        if (selectedProductId1) {
            updateCharts1();
        }
    });
}

// Inicializar el selector de fechas para el segundo inventario
function initDatePicker1() {
    flatpickr("#timeRange1", {  // ID con sufijo 1
        mode: "range",
        locale: "es",
        dateFormat: "d/m/Y",
        defaultDate: [new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), new Date()],
        onChange: function(selectedDates, dateStr, instance) {
            if (selectedDates.length === 2) {
                updateCharts1();
            }
        }
    });
}

// Configurar event listeners para el segundo inventario
function setupEventListeners1() {
    // Botones de período de tiempo (usar clase específica o IDs con sufijo 1)
    $('.time-period-btn1').on('click', function() {  // Clase con sufijo 1
        $('.time-period-btn1').removeClass('active');
        $(this).addClass('active');
        currentPeriod1 = $(this).data('period');
        updateCharts1();
    });
    
    // Botón aplicar filtros para el segundo inventario
    $('#applyFilters1').on('click', updateCharts1);  // ID con sufijo 1
}

// Cargar datos iniciales para el segundo inventario
async function loadInitialData1() {
    // Seleccionar el primer producto por defecto
    const { data: productos } = await supabase
        .schema('inventario')
        .from('productosn')  // Tabla de productos del segundo inventario
        .select('id_producto')
        .order('nombre_producto', { ascending: true })
        .limit(1);
    
    if (productos && productos.length > 0) {
        selectedProductId1 = productos[0].id_producto;
        $('#productSelect1').val(selectedProductId1).trigger('change');
    }
}

// Actualizar todas las gráficas del segundo inventario
async function updateCharts1() {
    if (!selectedProductId1) return;
    
    const dateRange = $('#timeRange1').val();  // ID con sufijo 1
    let startDate, endDate;
    
    if (dateRange) {
        const dates = dateRange.split(' a ');
        startDate = new Date(dates[0].split('/').reverse().join('-'));
        endDate = new Date(dates[1].split('/').reverse().join('-'));
    } else {
        // Fechas por defecto según el período seleccionado
        endDate = new Date();
        switch (currentPeriod1) {
            case 'day':
                startDate = new Date();
                startDate.setDate(endDate.getDate() - 30);
                break;
            case 'week':
                startDate = new Date();
                startDate.setDate(endDate.getDate() - 70);
                break;
            case 'month':
                startDate = new Date();
                startDate.setMonth(endDate.getMonth() - 12);
                break;
        }
        
        // Actualizar el datepicker
        $("#timeRange1").flatpickr().setDate([startDate, endDate]);
    }
    
    // Obtener datos de entradas y salidas del segundo inventario
    const { entradas, salidas } = await fetchMovementData1(selectedProductId1, startDate, endDate);
    
    // Procesar datos según el período seleccionado
    const processedData = processDataForPeriod1(entradas, salidas, startDate, endDate, currentPeriod1);
    
    // Actualizar gráficas del segundo inventario
    updateMovementChart1(processedData);
    updateStockChart1(processedData);
    updateBalanceChart1(processedData);
}

// Obtener datos de movimiento desde Supabase para el segundo inventario
async function fetchMovementData1(productId, startDate, endDate) {

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    
    const formatDate = (date) => date.toISOString().split('T')[0];
    
    console.log('Consultando datos desde:', start, 'hasta:', end);
    // Obtener entradas del segundo inventario
    const { data: entradas } = await supabase
        .schema('inventario')
        .from('entradasn')  // Tabla de entradas del segundo inventario
        .select('fecha_entrada, und_entrada')
        .eq('id_producto', productId)
        .gte('fecha_entrada', formatDate(startDate))
        .lte('fecha_entrada', formatDate(endDate))
        .order('fecha_entrada', { ascending: true });
    
    // Obtener salidas del segundo inventario
    const { data: salidas } = await supabase
        .schema('inventario')
        .from('salidasn')  // Tabla de salidas del segundo inventario
        .select('fecha_salida, und_salida')
        .eq('id_producto', productId)
        .gte('fecha_salida', formatDate(startDate))
        .lte('fecha_salida', formatDate(endDate))
        .order('fecha_salida', { ascending: true });
    
    return { entradas, salidas };
}

// Procesar datos para el período (segundo inventario)
function processDataForPeriod1(entradas, salidas, startDate, endDate, period) {
    const result = {
        labels: [],
        entradas: [],
        salidas: [],
        stock: []
    };
    function adjustDate(dateString) {
        const date = new Date(dateString);
        if (isNaN(date)) {
            console.warn('No se pudo interpretar la fecha:', dateString);
            return new Date(NaN);
        }
        return date; // ya viene completa, no necesita +5h extra
    }
    const groupData = (data, dateField, valueField) => {
        const grouped = {};

        data.forEach(item => {
            const rawDate = item[dateField];
            if (!rawDate) {
                console.warn('Fecha inválida (vacía o null):', item);
                return;
            }

            const date = adjustDate(rawDate);
            if (isNaN(date)) {
                console.warn('Fecha inválida (NaN):', rawDate);
                return;
            }

            let key;
            switch (period) {
                case 'day':
                    key = date.toISOString().split('T')[0];
                    break;
                case 'week':
                    const year = date.getFullYear();
                    const week = getWeekNumber(date)[1];
                    key = `${year}-W${week.toString().padStart(2, '0')}`;
                    break;
                case 'month':
                    key = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
                    break;
            }

            if (!grouped[key]) {
                grouped[key] = 0;
            }
            grouped[key] += item[valueField];
        });

        return grouped;
    };
    const groupedEntradas = groupData(entradas, 'fecha_entrada', 'und_entrada');
    const groupedSalidas = groupData(salidas, 'fecha_salida', 'und_salida');
    // Obtener todas las claves únicas (períodos de tiempo)
    const allKeys = new Set([
        ...Object.keys(groupedEntradas),
        ...Object.keys(groupedSalidas)
    ]);
    
    // Ordenar las claves cronológicamente
    const sortedKeys = Array.from(allKeys).sort((a, b) => {
        if (period === 'day') return new Date(a) - new Date(b);
        if (period === 'week') return compareWeekKeys(a, b);
        
        return a.localeCompare(b); // Para meses
    });
    
    // Crear arrays de datos ordenados
    let currentStock = 0;
    
    sortedKeys.forEach(key => {
        // Agregar etiqueta según el período
        switch (period) {
            case 'day':
                result.labels.push(formatDateLabel(new Date(key), period));
                break;
            case 'week':
                result.labels.push(`Sem ${key.split('-W')[1]}`);
                break;
            case 'month':
                const [year, month] = key.split('-');
                const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
                
                result.labels.push(`${monthNames[parseInt(month) - 1]} ${year}`);
                break;
        }
        
        // Agregar valores de entradas y salidas
        result.entradas.push(groupedEntradas[key] || 0);
        result.salidas.push(groupedSalidas[key] || 0);
        
        // Calcular stock acumulado
        currentStock += (groupedEntradas[key] || 0) - (groupedSalidas[key] || 0);
        result.stock.push(currentStock);
    });
    return result;
}
// Actualizar gráfica de movimientos del segundo inventario
function updateMovementChart1(data) {
    const ctx = document.getElementById('movementChart1').getContext('2d');  // ID con sufijo 1
    
    if (movementChart1) {
        movementChart1.destroy();
    }
    
    movementChart1 = new Chart(ctx, {
        // ... (misma configuración que updateMovementChart)
        type: 'bar',
        data: {
            labels: data.labels,
            datasets: [
                {
                    label: 'Entradas',
                    data: data.entradas,
                    backgroundColor: 'rgba(15, 0, 231, 0.7)',
                    borderColor: 'rgb(8, 22, 174)',
                    borderWidth: 1
                },
                {
                    label: 'Salidas',
                    data: data.salidas,
                    backgroundColor: 'rgba(255, 0, 0, 0.7)',
                    borderColor: 'rgba(255, 99, 132, 1)',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Cantidad'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: getPeriodLabel1()
                    }
                }
            },
            // Añadido para bordes redondeados
            elements: {
                bar: {
                    borderRadius: 4, // Bordes redondeados
                    
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: ${context.raw} unidades`;
                        }
                    }
                },
                legend: {
                    position: 'top'
                }
            }
        }
    });
}

// Actualizar gráfica de stock del segundo inventario
function updateStockChart1(data) {
    const ctx = document.getElementById('stockChart1').getContext('2d');  // ID con sufijo 1
    
    if (stockChart1) {
        stockChart1.destroy();
    }
    
    stockChart1 = new Chart(ctx, {
        // ... (misma configuración que updateStockChart)
        type: 'line',
        data: {
            labels: data.labels,
            datasets: [{
                label: 'Stock Acumulado',
                data: data.stock,
                backgroundColor: 'rgba(82, 78, 132, 0.2)',
                borderColor: 'rgb(13, 5, 156)',
                borderWidth: 2,
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Unidades'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: getPeriodLabel1()
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `Stock: ${context.raw} unidades`;
                        }
                    }
                }
            }
        }
    });
}

// Actualizar gráfica de balance del segundo inventario
function updateBalanceChart1(data) {
    const ctx = document.getElementById('balanceChart1').getContext('2d');  // ID con sufijo 1
    const balanceData = data.entradas.map((entrada, i) => entrada - data.salidas[i]);
    
    if (balanceChart1) {
        balanceChart1.destroy();
    }
    
    balanceChart1 = new Chart(ctx, {
        // ... (misma configuración que updateBalanceChart)
        type: 'bar',
        data: {
            labels: data.labels,
            datasets: [{
                label: 'Balance Neto (Entradas - Salidas)',
                data: balanceData,
                backgroundColor: balanceData.map(value => 
                    value > 0 ? 'rgba(0, 30, 255, 0.7)' : 'rgba(255, 0, 0, 0.7)'
                ),
                borderColor: balanceData.map(value => 
                    value > 0 ? 'rgb(113, 99, 201)' : 'rgba(255, 99, 132, 1)'
                ),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: false,
                    title: {
                        display: true,
                        text: 'Balance Neto'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: getPeriodLabel1()
                    }
                }
            },
            // Añadido para bordes redondeados
            elements: {
                bar: {
                    borderRadius: 3, // Bordes redondeados
                   
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const value = context.raw;
                            return `Balance: ${value > 0 ? '+' : ''}${value} unidades`;
                        }
                    }
                }
            }
        }
    });
}

// Función auxiliar para etiquetas de período (segundo inventario)
function getPeriodLabel1() {
    switch (currentPeriod1) {
        case 'day': return 'Días';
        case 'week': return 'Semanas';
        case 'month': return 'Meses';
        default: return 'Período';
    }
}