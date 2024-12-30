// Inicializar el mapa
const map = L.map('map').setView([-34.6037, -58.3816], 10); // Coordenadas iniciales (Buenos Aires)

// Definir los estilos de mapa
const lightMap = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 19
});

const darkMap = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 19
});

// Cargar el estilo claro como predeterminado
lightMap.addTo(map);

// Crear un control de capas para alternar entre mapas
const baseMaps = {
    "Claro": lightMap,
    "Oscuro": darkMap
};

L.control.layers(baseMaps).addTo(map);

// Crear el grupo de clústeres
const markers = L.markerClusterGroup({
    iconCreateFunction: function(cluster) {
        // Crear el ícono del cluster con el contador y el ícono personalizado
        var customClusterIcon = L.divIcon({
            html: `<img src="img/pin.png" class="cluster-icon" style="width: 40px; height: 40px;"/> 
                   <div class="cluster-count">${cluster.getChildCount()}</div>`,
            className: 'custom-cluster-icon',
            iconSize: [70, 70]  // Aumentar el tamaño del ícono del cluster
        });
        return customClusterIcon;
    }
});

// Cargar datos desde el archivo JSON
let allLocations = []; // Declaración global

fetch('./data/output.json') // Ajusta la ruta si tu archivo JSON está en otro directorio
    .then(response => response.json())
    .then(data => {
        // Guardar las ubicaciones para su uso posterior en la búsqueda
        allLocations = data.map(location => ({
            lat: location.Latitude,
            lon: location.Longitude,
            address: location.Direccion,
            postalCode: location.CP,
            locality: location.LOCALIDAD,
            province: location.PROVINCIA
        }));

        // Crear el ícono personalizado
        var customIcon = L.icon({
            iconUrl: 'img/pin.png',  // Ruta al logo
            iconSize: [40, 40],       // Tamaño del ícono (ajustado a pequeño)
            iconAnchor: [12, 25],     // Anclaje del ícono, donde se coloca sobre el marcador (mitad del ícono en la base)
            popupAnchor: [0, -25]     // Ubicación de la ventana emergente (ajustada para que se vea bien)
        });

        // Función para calcular la distancia entre dos coordenadas (Haversine)
        function getDistance(lat1, lon1, lat2, lon2) {
            const R = 6371; // Radio de la Tierra en km
            const dLat = (lat2 - lat1) * Math.PI / 180;
            const dLon = (lon2 - lon1) * Math.PI / 180;
            const a =
                Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            return R * c; // Distancia en km
        }

        // Función para agregar los marcadores al mapa
        function addMarkers(locations) {
            markers.clearLayers(); // Limpiar los marcadores previos
            locations.forEach(location => {
                const marker = L.marker([location.lat, location.lon], { icon: customIcon });
                marker.bindPopup(`
                    <b>${location.address}</b><br>
                    Localidad: ${location.locality}<br>
                    Código Postal: ${location.postalCode}<br>
                    Provincia: ${location.province}
                `);
                markers.addLayer(marker);
            });
            map.addLayer(markers);
        }

        // Manejo de la búsqueda
        document.getElementById('searchButton').addEventListener('click', function() {
            const postalCode = document.getElementById('cpInput').value;
            if (postalCode) {
                const nearbyLocations = findNearbyLocations(postalCode);
                if (nearbyLocations.length > 0) {
                    // Agregar los marcadores al mapa
                    addMarkers(nearbyLocations);
        
                    // Mostrar los tres primeros más cercanos en la tabla
                    updateNearbyTable(nearbyLocations);
        
                    // Actualizar las tarjetas en el panel lateral
                    populateSidePanel(nearbyLocations);
        
                    // Mostrar el panel lateral con los resultados
                    openSidePanel();
        
                    // Mostrar el botón de limpiar
                    document.getElementById('clearButton').style.display = 'inline-block';
        
                    // Centrar el mapa en el primer resultado
                    const firstLocation = nearbyLocations[0];
                    map.setView([firstLocation.lat, firstLocation.lon], 12);
                } else {
                    alert('No se encontraron ubicaciones cercanas.');
                }
            } else {
                alert('Por favor ingrese un Código Postal.');
            }
        });
        
        
// Función para actualizar la tabla con los tres puntos más cercanos
function updateNearbyTable(nearbyLocations) {
    const tableBody = document.getElementById('nearbyTable').getElementsByTagName('tbody')[0];
    tableBody.innerHTML = ''; // Limpiar la tabla antes de agregar nuevos resultados

    nearbyLocations.slice(0, 3).forEach(location => { // Mostrar solo los tres más cercanos
        const row = tableBody.insertRow();
        row.innerHTML = `
            <td>${location.address}</td>
            <td>${location.locality}</td>
            <td>${location.postalCode}</td>
            <td>${location.province}</td>
            <td>${location.distance.toFixed(2)} km</td> <!-- Mostrar distancia en km -->
        `;
    });
}

// Función para encontrar ubicaciones cercanas según el código postal
function findNearbyLocations(postalCode, maxDistance = 10) {
    const postalLocation = allLocations.find(location => location.postalCode === postalCode);
    if (!postalLocation) {
        alert('Código Postal no encontrado.');
        return [];
    }

    const { lat, lon } = postalLocation;
    const nearbyLocations = allLocations
        .map(location => ({
            ...location,
            distance: getDistance(lat, lon, location.lat, location.lon)
        }))
        .filter(location => location.distance <= maxDistance)
        .sort((a, b) => a.distance - b.distance);

    return nearbyLocations;
}
// Función para limpiar la búsqueda y restaurar el estado inicial del mapa
function clearSearch() {
    // Limpiar el campo de entrada
    document.getElementById('cpInput').value = '';
    
    // Limpiar el panel lateral
    document.getElementById('locationsList').innerHTML = '';
    
    // Ocultar elementos
    document.getElementById('sidePanel').style.display = 'none';
    document.getElementById('clearButton').style.display = 'none';
    
    // Limpiar la tabla
    const tableBody = document.getElementById('nearbyTable').getElementsByTagName('tbody')[0];
    if (tableBody) {
        tableBody.innerHTML = '';
    }
    
    // Volver a la vista inicial del mapa
    map.setView([-34.6037, -58.3816], 10);
    
    // Limpiar y recargar marcadores
    markers.clearLayers();
    
    // Volver a cargar todos los marcadores iniciales
    if (allLocations && allLocations.length > 0) {
        allLocations.forEach(location => {
            const marker = L.marker([location.lat, location.lon], { icon: customIcon });
            marker.bindPopup(`
                <b>${location.address}</b><br>
                Localidad: ${location.locality}<br>
                Código Postal: ${location.postalCode}<br>
                Provincia: ${location.province}
            `);
            markers.addLayer(marker);
        });
        map.addLayer(markers);
    }
}


// Manejo de la búsqueda
document.getElementById('searchButton').addEventListener('click', function() {
    const postalCode = document.getElementById('cpInput').value;
    if (postalCode) {
        const nearbyLocations = findNearbyLocations(postalCode);
        if (nearbyLocations.length > 0) {
            // Limpiar marcadores previos
            markers.clearLayers();
            
            // Agregar los nuevos marcadores al mapa
            addMarkers(nearbyLocations);
            
            // Actualizar la información en el panel lateral
            populateSidePanel(nearbyLocations);
            
            // Mostrar el panel lateral
            openSidePanel();
            
            // Mostrar el botón de limpiar
            document.getElementById('clearButton').style.display = 'inline-block';
            
            // Centrar el mapa en el primer resultado
            const firstLocation = nearbyLocations[0];
            map.setView([firstLocation.lat, firstLocation.lon], 12);
        } else {
            alert('No se encontraron ubicaciones cercanas.');
        }
    } else {
        alert('Por favor ingrese un Código Postal.');
    }
});


// También habilitar el panel con Enter
document.getElementById('cpInput').addEventListener('keypress', function(event) {
    if (event.key === 'Enter') {
        document.getElementById('searchButton').click();
    }
});

// Manejo del botón de limpiar
document.getElementById('clearButton').addEventListener('click', function() {
    clearSearch();
    closeSidePanel();
    this.style.display = 'none'; // Ocultar el botón después de limpiar
});
        // Crear los marcadores iniciales
        data.forEach(location => {
            const marker = L.marker([location.Latitude, location.Longitude], { icon: customIcon });
            marker.bindPopup(`
                <b>${location.Direccion}</b><br>
                Localidad: ${location.LOCALIDAD}<br>
                Código Postal: ${location.CP}<br>
                Provincia: ${location.PROVINCIA}
            `);
            markers.addLayer(marker);
        });

        map.addLayer(markers);
    })
    .catch(error => console.error('Error al cargar el archivo JSON:', error));

    // BUSCAR POR UBICACIÓN
    // Función para encontrar ubicaciones cercanas usando la ubicación actual
    document.getElementById('currentLocationButton').addEventListener('click', function () {
        if (!navigator.geolocation) {
            alert('La geolocalización no está disponible en este navegador.');
            return;
        }
    
        navigator.geolocation.getCurrentPosition(
            position => {
                const userLat = position.coords.latitude;
                const userLon = position.coords.longitude;
    
                const nearbyLocations = allLocations
                    .map(location => ({
                        ...location,
                        distance: getDistance(userLat, userLon, location.lat, location.lon)
                    }))
                    .filter(location => location.distance <= 10)
                    .sort((a, b) => a.distance - b.distance);
    
                if (nearbyLocations.length > 0) {
                    addMarkers(nearbyLocations);
                    updateNearbyTable(nearbyLocations);
                    populateSidePanel(nearbyLocations);
                    openSidePanel();
                    map.setView([userLat, userLon], 12);
                    document.getElementById('clearButton').style.display = 'inline-block';
                } else {
                    alert('No se encontraron ubicaciones cercanas.');
                }
            },
            error => {
                alert('No se pudo obtener la ubicación. Asegúrate de habilitar la geolocalización.');
            }
        );
    });
//agregados de bootstrap
// Referencias
const sidePanel = document.getElementById('sidePanel');
const closePanelButton = document.getElementById('closePanel');
const searchButton = document.getElementById('searchButton');
const cpInput = document.getElementById('cpInput');
const clearButton = document.getElementById('clearButton');
const locationsList = document.getElementById('locationsList');


// Al cargar la página, cierra el panel lateral
document.addEventListener('DOMContentLoaded', () => {
    sidePanel.style.display = 'none';
});

// Mostrar panel lateral
function openSidePanel() {
    sidePanel.style.display = 'block';
    sidePanel.classList.add('active');
}

// Cerrar panel lateral
function closeSidePanel() {
    sidePanel.classList.remove('active');
    setTimeout(() => {
        sidePanel.style.display = 'none';
    }, 300); // Espera a que termine la transición
}

// Evento del botón de cerrar
closePanelButton.addEventListener('click', closeSidePanel);

// Ejemplo de activación
searchButton.addEventListener('click', () => {
    if (cpInput.value.trim() !== "") {
        openSidePanel();
    }
});

// Limpiar búsqueda
clearButton.addEventListener('click', () => {
    cpInput.value = '';
    closeSidePanel();
});

//Se generarán tarjetas dinámicamente y se añadirá funcionalidad para centrar el mapa en el marcador correspondiente.
// Elementos del DOM



// Muestra las ubicaciones en tarjetas
function populateSidePanel(locations) {
    const locationsList = document.getElementById('locationsList');
    locationsList.innerHTML = ''; // Limpiar contenido previo
    
    // Limitar a las 3 ubicaciones más cercanas
    const nearestLocations = locations.slice(0, 3);
    
    nearestLocations.forEach((location) => {
        const card = document.createElement('div');
        card.className = 'card mb-3';
        
        const cardBody = document.createElement('div');
        cardBody.className = 'card-body';
        
        cardBody.innerHTML = `
            <h5 class="card-title">${location.address || 'Sin dirección'}</h5>
            <p class="card-text">
                Localidad: ${location.locality || 'N/A'}<br>
                CP: ${location.postalCode || 'N/A'}<br>
                Provincia: ${location.province || 'N/A'}<br>
                Distancia: ${typeof location.distance === 'number' ? location.distance.toFixed(2) : 'N/A'} km
            </p>
            <button class="btn btn-primary btn-sm view-location" 
                data-lat="${location.lat}" 
                data-lon="${location.lon}">
                Ver en el mapa
            </button>
        `;
        
        card.appendChild(cardBody);
        locationsList.appendChild(card);
    });
    
// Agregar eventos a los botones de ver en el mapa
// Agregar eventos a los botones de ver en el mapa
const viewButtons = document.querySelectorAll('.view-location');
viewButtons.forEach(button => {
    button.addEventListener('click', function() {
        const lat = parseFloat(this.dataset.lat);
        const lon = parseFloat(this.dataset.lon);
        if (!isNaN(lat) && !isNaN(lon)) {
            // Centrar el mapa en el marcador correspondiente
            map.setView([lat, lon], 15);

            // Buscar y abrir el popup del marcador correspondiente
            markers.eachLayer((marker) => {
                const markerLatLng = marker.getLatLng();
                if (Math.abs(markerLatLng.lat - lat) < 0.0001 && Math.abs(markerLatLng.lng - lon) < 0.0001) {
                    marker.openPopup();
                }
            });

            // Cerrar el panel lateral automáticamente
            closeSidePanel();
        }
    });
});

// Lógica para abrir y cerrar el panel
function openSidePanel() {
    sidePanel.style.display = 'block';
    sidePanel.classList.add('active');
}

function closeSidePanel() {
    sidePanel.classList.remove('active');
    setTimeout(() => {
        sidePanel.style.display = 'none';
    }, 300);
}

// Evento para cerrar el panel
closePanelButton.addEventListener('click', closeSidePanel);
}


