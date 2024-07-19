const panoramaContainer = document.getElementById('panorama-container');

const container = document.getElementById('map-container');
const anchor = document.getElementById('map-anchor');
const imageWrapper = document.getElementById('map-wrapper');
const image = document.getElementById('map');

let currentMarkerIndex = 0;
let markers = []
let targetMarkers = []
let markersRef = ['marker-violet', 'marker-blue', 'marker-green','marker-yellow', 'marker-red'];

let isDragging = false;
let startX, startY;
let offsetX = -10240, offsetY = -10240;
let anchorX = 0, anchorY = 0;
let beginningX = 0, beginningY = 0;

let qualityMoveFactor = 1;
let qualityScaleFactor = 1;

const zoomLevels = [0.025, 0.05, 0.1, 0.2, 0.3, 0.4, 0.5, 0.75, 1, 1.5, 2, 2.5, 3, 4, 5, 6, 7.5, 10, 15]; // Array of zoom levels
let currentZoomIndex = 8; // Start with 1x

const mouseX = document.getElementById('mouseX');
const mouseZ = document.getElementById('mouseZ');
const markerX = document.getElementById('markerX');
const markerZ = document.getElementById('markerZ');
let currentMarkerX = 0, currentMarkerY = 0;

let landmark = 'none';
let targetX = 0;
let targetZ = 0;
let landmarkPhoto = 'none'
let landmarksLoaded = [];

let landmarksData = '';
loadLandmarksData();
function loadLandmarksData(callback) {
    fetch('landmarks.txt')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.text();
        })
        .then(data => {
            landmarksData = data;
            if (callback) {
                callback(); // Call the callback function after data is loaded
            }
        })
        .catch(error => {
            console.error('There was a problem with the fetch operation:', error);
        });
}

let timerElement = document.getElementById('timer');
let timerInterval;
let startTime;
let elapsedTime = 0;

function startGame(){
    landmarksLoaded = []
    offsetX = -10240;
    offsetY = -10240;
    currentZoomIndex = 8;
    currentMarkerIndex = 1;
    markers.forEach(marker => {
        marker.remove();
    });
    targetMarkers.forEach(targetMarker => {
        targetMarker.remove();
    });
    markers = [];
    targetMarkers = [];
    const lines = svg.querySelectorAll('line');
    lines.forEach(line => line.remove());
    updateTransform();
    updateScale();
    loadLandmark();
    startTimer();
}

function endGame(){
    currentMarkerIndex = 0;
    stopTimer();
}

function startTimer() {
    elapsedTime = 0;
    if (timerInterval) return; //Prevent multiple timers
    startTime = Date.now() - elapsedTime;
    timerInterval = setInterval(updateTimer, 100); //Update every 100ms
}

function updateTimer() {
    elapsedTime = Date.now() - startTime;
    timerElement.textContent = (elapsedTime / 1000).toFixed(1) + " seconds"; //Update timer element
}

function stopTimer() {
    clearInterval(timerInterval);
    timerInterval = null;
}

container.addEventListener('mousedown', (e) => {
    if (e.target.classList.contains('button')) {
        return; //Cancel movement if button pressed
    }
    e.preventDefault(); // Prevent default action like text selection
    isDragging = true;
    startX = e.clientX - offsetX;
    startY = e.clientY - offsetY;
    image.style.cursor = 'grabbing';

    beginningX = offsetX;
    beginningY = offsetY;
    
    // Add global event listeners
    document.addEventListener('mouseup', onMouseUp);
});

document.addEventListener('mousemove', (e) => {
    if (isDragging) {
        offsetX = e.clientX - startX;
        offsetY = e.clientY - startY;
        updateTransform();
    }

    const containerRect = container.getBoundingClientRect();
    const rect = image.getBoundingClientRect();
    const scaleFactor = zoomLevels[currentZoomIndex] * qualityScaleFactor;
    
    //Update mouse coords if it is within container
    if (e.clientX >= containerRect.left && e.clientX <= containerRect.right &&
        e.clientY >= containerRect.top && e.clientY <= containerRect.bottom) { 
        const relativeX = (e.clientX - rect.left) / scaleFactor - (10240 / qualityScaleFactor); // Double check coords with real map
        const relativeY = (e.clientY - rect.top) / scaleFactor - (10240 / qualityScaleFactor);
        mouseX.textContent = `X: ${Math.floor(relativeX * qualityScaleFactor)}`;
        mouseZ.textContent = `Z: ${Math.floor(relativeY * qualityScaleFactor)}`;
    }
});

function onMouseUp(e) {
    isDragging = false;
    image.style.cursor = 'grab';

    // Determine if this was a click or a drag
    const endX = offsetX;
    const endY = offsetY;
    const movementThreshold = 5; // Maximum movement allowed for it to be considered a click

    if (Math.abs(endX - beginningX) < movementThreshold && Math.abs(endY - beginningY) < movementThreshold) {
        handleClick(e);
    }

    // Remove global event listeners
    document.removeEventListener('mouseup', onMouseUp);
}

function handleClick(e) {
    if (e.target.classList.contains('button') || currentMarkerIndex === 0) {
        return; //Cancel marker placement if button pressed
    }

    const rect = image.getBoundingClientRect();
    const scaleFactor = zoomLevels[currentZoomIndex] * qualityScaleFactor;

    // Calculate the coordinates relative to the image
    relativeX = ((e.clientX - rect.left) / scaleFactor - (10240 / qualityScaleFactor)) * qualityScaleFactor; //Double check coords with real map
    relativeY = ((e.clientY - rect.top) / scaleFactor - (10240 / qualityScaleFactor)) * qualityScaleFactor;

    markerX.textContent = `X: ${Math.floor(relativeX)}`;
    markerZ.textContent = `Z: ${Math.floor(relativeY)}`;

    // Create a new image element
    if (currentMarkerIndex > markers.length){
        newMarker = document.createElement('img');
        newMarker.src = 'files/sprites/' + markersRef[currentMarkerIndex - 1] + '.png'; // Replace with your image path
        newMarker.style.position = 'absolute';
        newMarker.style.zIndex = '100'; // Ensure it's above the map
        newMarker.style.transition = 'transform 0.2s ease';

        markers.push(newMarker);
        imageWrapper.appendChild(newMarker);

        //Spawn with correct position
        currentMarkerX = ((e.clientX - (rect.left)) / zoomLevels[currentZoomIndex] / qualityScaleFactor) - 25
        currentMarkerY = ((e.clientY - (rect.top)) / zoomLevels[currentZoomIndex] / qualityScaleFactor) - 81
        newMarker.style.left = `${currentMarkerX}px`;
        newMarker.style.top = `${currentMarkerY}px`;

        //Spawn with correct scale
        const inverseScale = 1 / (zoomLevels[currentZoomIndex] * qualityScaleFactor);
        const offsetY = 40.5 * (1 - inverseScale);
        newMarker.style.transform = `translateY(${offsetY}px) scale(${inverseScale})`;
    }
    else{
        currentMarkerX = ((e.clientX - (rect.left)) / zoomLevels[currentZoomIndex] / qualityScaleFactor) - 25
        currentMarkerY = ((e.clientY - (rect.top)) / zoomLevels[currentZoomIndex] / qualityScaleFactor) - 81
        newMarker.style.left = `${currentMarkerX}px`;
        newMarker.style.top = `${currentMarkerY}px`;
    }
}

container.addEventListener('wheel', (e) => {
    e.preventDefault();

    const rect = container.getBoundingClientRect();
    const cursorX = e.clientX - rect.left;
    const cursorY = e.clientY - rect.top;

    const direction = -Math.sign(e.deltaY);
    
    // Update the current zoom index based on the scroll direction
    oldZoomIndex = currentZoomIndex;
    currentZoomIndex = Math.min(Math.max(currentZoomIndex + direction, 0), zoomLevels.length - 1);

    const newScale = zoomLevels[currentZoomIndex];
    const factor = newScale / zoomLevels[oldZoomIndex];

    // Calculate new anchor positions
    anchorX = cursorX - (cursorX - anchorX) * factor;
    anchorY = cursorY - (cursorY - anchorY) * factor;

    offsetX *= factor;
    offsetY *= factor;

    updateTransform();
    updateScale();
});

function zoomIn(){
    const rect = container.getBoundingClientRect();
    const centreX = rect.width / 2;
    const centreY = rect.height / 2;

    // Update the current zoom index based on the scroll direction
    oldZoomIndex = currentZoomIndex;
    currentZoomIndex = Math.min(currentZoomIndex + 1, zoomLevels.length - 1)

    const newScale = zoomLevels[currentZoomIndex];
    const factor = newScale / zoomLevels[oldZoomIndex];

    // Calculate new anchor positions
    anchorX = centreX - (centreX - anchorX) * factor;
    anchorY = centreY - (centreY - anchorY) * factor;

    offsetX *= factor;
    offsetY *= factor;

    updateTransform();
    updateScale();
}

function zoomOut(){
    const rect = container.getBoundingClientRect();
    const centreX = rect.width / 2;
    const centreY = rect.height / 2;

    // Update the current zoom index based on the scroll direction
    oldZoomIndex = currentZoomIndex;
    currentZoomIndex = Math.max(currentZoomIndex - 1, 0)

    const newScale = zoomLevels[currentZoomIndex];
    const factor = newScale / zoomLevels[oldZoomIndex];

    // Calculate new anchor positions
    anchorX = centreX - (centreX - anchorX) * factor;
    anchorY = centreY - (centreY - anchorY) * factor;

    offsetX *= factor;
    offsetY *= factor;

    updateTransform();
    updateScale();
}

function updateTransform() {
    //Move map
    imageWrapper.style.transform = `translate(${(offsetX / zoomLevels[currentZoomIndex]) / qualityScaleFactor}px,
     ${(offsetY / zoomLevels[currentZoomIndex]) / qualityScaleFactor}px)`;
}

function updateScale() {
    //Move anchor and scale it
    anchor.style.transform = `translate(${anchorX}px, ${anchorY}px) scale(${zoomLevels[currentZoomIndex] * qualityScaleFactor})`;

    //Update all markers scale and position to keep its size constant
    const inverseScale = 1 / (zoomLevels[currentZoomIndex] * qualityScaleFactor);
    markers.forEach(marker => {
        const offsetY = 40.5 * (1 - inverseScale);
        marker.style.transform = `translateY(${offsetY}px) scale(${inverseScale})`;
    });
    targetMarkers.forEach(targetMarker => {
        const offsetY = 40.5 * (1 - inverseScale);
        targetMarker.style.transform = `translateY(${offsetY}px) scale(${inverseScale})`;
    });

    //Update stroke width of all lines
    const lines = svg.querySelectorAll('line');
    lines.forEach(line => {
        const originalWidth = 4; //The original stroke width when the line was created
        line.setAttribute('stroke-width', originalWidth * inverseScale);
    });
}

function lowQ(){
    image.src = `files/maps/map-low.png`;
    offsetX /= 2;
    offsetY /= 2;
    updateTransform();
    qualityScaleFactor = 2;
    anchor.style.transition = 'none';
    updateScale();
    anchor.style.transition = 'transform 0.2s ease';
    qualityMoveFactor = 2;
    offsetX *= 2;
    offsetY *= 2;
    currentMarkerX = (currentMarkerX - 25) /2;
    currentMarkerY = (currentMarkerY - 81) /2;
    markers.forEach(marker => {
        marker.style.left = `${(parseFloat(marker.style.left) -25) / 2}px`;
        marker.style.top = `${(parseFloat(marker.style.top) -81) / 2}px`;
    });
    targetMarkers.forEach(targetMarker => {
        targetMarker.style.left = `${(parseFloat(targetMarker.style.left) -25) / 2}px`;
        targetMarker.style.top = `${(parseFloat(targetMarker.style.top) -81) / 2}px`;
    });
    const lines = svg.querySelectorAll('line');
    lines.forEach(line => line.setAttribute('x1', parseFloat(line.getAttribute('x1')) / 2));
    lines.forEach(line => line.setAttribute('y1', parseFloat(line.getAttribute('y1')) / 2));
    lines.forEach(line => line.setAttribute('x2', parseFloat(line.getAttribute('x2')) / 2));
    lines.forEach(line => line.setAttribute('y2', parseFloat(line.getAttribute('y2')) / 2));
}

function highQ(){
    image.src = `files/maps/map-high.png`;
    offsetX *= 2;
    offsetY *= 2;
    updateTransform();
    qualityScaleFactor = 1;
    anchor.style.transition = 'none';
    updateScale();
    anchor.style.transition = 'transform 0.2s ease';
    qualityMoveFactor = 1;
    offsetX /= 2;
    offsetY /= 2;
    currentMarkerX = (currentMarkerX * 2) + 25;
    currentMarkerY = (currentMarkerY * 2) + 81;
    markers.forEach(marker => {
        marker.style.left = `${(parseFloat(marker.style.left) * 2) + 25}px`;
        marker.style.top = `${(parseFloat(marker.style.top) * 2) + 81}px`;
    });
    targetMarkers.forEach(targetMarker => {
        targetMarker.style.left = `${(parseFloat(targetMarker.style.left) * 2) + 25}px`;
        targetMarker.style.top = `${(parseFloat(targetMarker.style.top) * 2) + 81}px`;
    });
    const lines = svg.querySelectorAll('line');
    lines.forEach(line => line.setAttribute('x1', parseFloat(line.getAttribute('x1')) * 2));
    lines.forEach(line => line.setAttribute('y1', parseFloat(line.getAttribute('y1')) * 2));
    lines.forEach(line => line.setAttribute('x2', parseFloat(line.getAttribute('x2')) * 2));
    lines.forEach(line => line.setAttribute('y2', parseFloat(line.getAttribute('y2')) * 2));
}

function loadLandmark() {
    if (landmarksData === '') {
        loadLandmarksData();
        console.error('Landmarks data is not loaded.');
        return;
    }
    const lines = landmarksData.trim().split('\n');

    // Filter out already loaded landmarks
    const availableLines = lines.filter(line => !landmarksLoaded.includes(line));

    const randomLine = availableLines[Math.floor(Math.random() * availableLines.length)];
    const [name, x, z, path] = randomLine.split(' ');

    landmarksLoaded.push(randomLine);

    landmark = name;
    targetX = parseFloat(x);
    targetZ = parseFloat(z);
    landmarkPhoto = "files/panorama/" + path + ".png";
    loadPhoto();
    console.log(`Landmark: ${landmark}, X: ${targetX}, Z: ${targetZ}`);
}

function loadPhoto(){
    loadPanorama(landmarkPhoto);
}

function submitGuess(){
    createLandmarkMarker();
    if (currentMarkerIndex < 5){
        currentMarkerIndex++;
        loadLandmark();
    }
    else{
        endGame();
    }
}

function createLandmarkMarker(){
    newMarker = document.createElement('img');
    newMarker.src = 'files/sprites/' + markersRef[currentMarkerIndex - 1] + '.png'; // Replace with your image path
    newMarker.style.position = 'absolute';
    newMarker.style.zIndex = '100'; // Ensure it's above the map
    newMarker.style.transition = 'transform 0.2s ease';

    targetMarkers.push(newMarker);
    imageWrapper.appendChild(newMarker);
    //Spawn with correct position
    newMarkerX = (targetX + 10240 - 25) / qualityScaleFactor;
    newMarkerZ = (targetZ + 10240 - 81) / qualityScaleFactor;
    newMarker.style.left = `${newMarkerX}px`;
    newMarker.style.top = `${newMarkerZ}px`;

    //Spawn with correct scale
    const inverseScale = 1 / (zoomLevels[currentZoomIndex] * qualityScaleFactor);
    const moveY = 40.5 * (1 - inverseScale);
    newMarker.style.transform = `translateY(${moveY}px) scale(${inverseScale})`;

    //Draw red line
    drawLineInSVG(newMarkerX + 25, newMarkerZ + 81, currentMarkerX + 25, currentMarkerY + 81);
}

let lineIndex = 0;

const svgNS = "http://www.w3.org/2000/svg";
const svg = document.createElementNS(svgNS, "svg");
svg.style.position = 'absolute';
svg.setAttribute('width', '20480');
svg.setAttribute('height', '20480');
svg.style.top = '0';
svg.style.left = '0';
svg.style.zIndex = '1000'; // Ensure it's above other elements
imageWrapper.appendChild(svg);

// Function to draw a line in the SVG
function drawLineInSVG(x1, y1, x2, y2, color = 'red', width = 4) {
    const line = document.createElementNS(svgNS, 'line');
    line.setAttribute('x1', x1);
    line.setAttribute('y1', y1);
    line.setAttribute('x2', x2);
    line.setAttribute('y2', y2);
    line.setAttribute('stroke', color);
    line.setAttribute('stroke-width', width);
    const inverseScale = 1 / (zoomLevels[currentZoomIndex] * qualityScaleFactor);
    line.setAttribute('stroke-width', width * inverseScale);
    line.setAttribute('data-line-id', lineIndex++);
    svg.appendChild(line);
}

updateTransform();