window.loadPanorama = function(photoPath) {
    pannellum.viewer('panorama-container', {
        "type": "equirectangular",
        "panorama": photoPath,
        "autoLoad": true,
        "showControls": false
    });
}