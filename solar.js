var app = app || {};

var constants = {
    G: 6.67384e-11, // m3 kg-1 s-2
    SEC_PER_STEP: 4,
    STEPS_PER_FRAME: 10000,
    METERS_PER_UNIT: 1000000000,
    MAX_TRAIL_VERTICES: 800,
};

// parse html table data to planet object
(function (_, three) { 

    var createPlanet = function (row) {
        return {
            name: row.cells[0].innerHTML,
            radius: parseFloat(row.cells[1].innerHTML),
            mass: parseFloat(row.cells[2].innerHTML),
            initialDistance: parseFloat(row.cells[3].innerHTML),
            velocity: new THREE.Vector3(0, 0, parseFloat(row.cells[4].innerHTML)),
            inclination: parseFloat(row.cells[5].innerHTML),
            image: row.cells[6].getElementsByTagName('img')[0]
        };
    };

    app.parsePlanetTable = function (planetDataTable) {
        return _(planetDataTable.tBodies[0].rows).map(createPlanet);
    };

})(_, THREE);

// create THREE.js planet meshes from planet object
(function (_, three) { 

    var trail = function (planet) {
        var trailGeometry = new THREE.Geometry();
        for (i = 0; i < constants.MAX_TRAIL_VERTICES; i++) {
            trailGeometry.vertices.push(new THREE.Vector3(planet.body.distance, 0, 0));
        }
        var trailMaterial = new THREE.LineBasicMaterial({ color: 0xFFFFFF, size: 50 });
        var line = new THREE.Line(trailGeometry, trailMaterial);
        planet.mesh.add(line);

        return {
            update: function () {
                line.geometry.vertices.unshift(planet.mesh.position.clone());
                line.geometry.vertices.length = constants.MAX_TRAIL_VERTICES;
                line.geometry.verticesNeedUpdate = true;
            }
        };
    }
    
    function addTail(planet) {
        var trail1 = trail(planet)
        planet.mesh.add(trail1);
        return trail1;
    };

    app.createPlanetMesh = function (planet) {
        var geometry = new THREE.SphereGeometry(planet.radius * 2 * 20, 32, 16);
        
        var material = new THREE.MeshBasicMaterial({
            ambient: 0x050505, specular: 0x555555, shininess: 30,
            map: new THREE.ImageUtils.loadTexture(planet.image.src)
        });
        var mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(planet.initialDistance, 0, 0);
        
        return {
            body: planet,
            mesh: mesh
        };
    };

})(_, THREE);


// gravity simulation funcs for planets
(function (_, three) {
    
    app.updateVelocity = function (planet, star) {
        var velocity = new THREE.Vector3();
        for (var i = 0; i < constants.STEPS_PER_FRAME; i++) {
            var starPos = star.mesh.position,
                planetPos = planet.mesh.position;

            var planetDistance = starPos.distanceTo(planetPos) * constants.METERS_PER_UNIT;
            var gravitationalForce = constants.G * star.body.mass / Math.pow(planetDistance, 2);

            var speed = gravitationalForce * constants.SEC_PER_STEP;

            velocity.subVectors(starPos, planetPos).setLength(speed / constants.METERS_PER_UNIT);

            planet.body.velocity.add(velocity);
            var distanceTraveledOverTime = planet.body.velocity.clone().multiplyScalar(constants.SEC_PER_STEP);
            planet.mesh.position.add(distanceTraveledOverTime);
        }
    }

    app.createGravitationalBody = function (planet) {
        return planet;
    };

    app.setStepTime = function (newStepTime) {
        constants.SEC_PER_STEP = parseFloat(newStepTime);
    };

})(_, THREE);

// scene and renderer stuffs
(function (_, three) {

    var createLight = function () {
        var light = new THREE.PointLight(0xffffff, 100, 100, 0);
        return light;
    };

    var createCamera = function () {
        var camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100000);
        camera.position.add(new THREE.Vector3(300, 300, 200));
        camera.lookAt(new THREE.Vector3(0, 0, 0));
        return camera;
    }

    var createRenderer = function (canvas) {
        var r = new THREE.WebGLRenderer({ canvas: canvas, antialias:true });
        r.setSize(window.innerWidth, window.innerHeight);
        return r;
    };

    app.createSim = function (canvas, planetData) {
        var scene = new THREE.Scene();
        var light = createLight();
        var camera = createCamera();
        var renderer = createRenderer(canvas);
        var controls = new THREE.OrbitControls(camera, renderer.domElement);

        // create scene
        // create meshes in right places
        // add tail to meshes
        // build a func to move the meshes each step
        // every update

        var planets = app
            .parsePlanetTable(planetData)
            .map(app.createPlanetMesh)
            .map(app.createGravitationalBody);

        return {
            buildScene: function () {
                scene.add(light);
                planets.forEach(function (planet) { scene.add(planet.mesh); });
            },
            update: function () {
                controls.update();
                _(planets).drop(1).forEach(function (planet) {
                    app.updateVelocity(planet, planets[0]);
                });
                renderer.render(scene, camera);
            }
        };
    };

})(_, THREE);
